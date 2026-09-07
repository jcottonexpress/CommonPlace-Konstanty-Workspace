import { Router } from "express";
import { db, subscriptionsTable, productsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { CreateSubscriptionBody, UpdateSubscriptionBody, UpdateSubscriptionParams, CancelSubscriptionParams } from "@workspace/api-zod";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import rateLimit from "express-rate-limit";

const router = Router();

class SubscriptionError extends Error {
  constructor(public readonly status: number, public readonly body: { error: string }) {
    super(body.error);
    this.name = "SubscriptionError";
  }
}

const MAX_SUBSCRIPTIONS_PER_USER = 50;

const subscriptionCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => String((req as AuthedRequest).user?.id ?? req.ip),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many subscriptions created. Please try again later." },
});

const INTERVAL_DAYS: Record<string, number> = {
  "2weeks": 14,
  "1month": 30,
  "2months": 60,
  "3months": 90,
};

function nextDelivery(interval: string): Date {
  const days = INTERVAL_DAYS[interval] || 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

router.get("/subscriptions", requireAuth, async (req: AuthedRequest, res) => {
  const subs = await db.select({
    sub: subscriptionsTable,
    product: productsTable,
  }).from(subscriptionsTable)
    .leftJoin(productsTable, eq(subscriptionsTable.productId, productsTable.id))
    .where(eq(subscriptionsTable.userId, req.user!.id))
    .limit(100);

  res.json(subs.map(({ sub, product }) => ({
    ...sub,
    productName: product?.name || "Unknown",
    productImageUrl: product?.imageUrl || null,
    nextDeliveryDate: sub.nextDeliveryDate,
  })));
});

router.post("/subscriptions", requireAuth, subscriptionCreationRateLimit, async (req: AuthedRequest, res) => {
  const parsed = CreateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const { productId, quantity, interval, mode, notifyDaysBefore } = parsed.data;

  if (!Number.isInteger(productId) || !Number.isInteger(quantity)) {
    res.status(400).json({ error: "productId and quantity must be integers" });
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  if (product.inStock === false) { res.status(400).json({ error: "Product is out of stock" }); return; }

  let sub: typeof subscriptionsTable.$inferSelect;

  try {
    sub = await db.transaction(async (tx) => {
      // Acquire a per-user advisory lock for the duration of this transaction.
      // This serializes concurrent subscription-creation requests for the same
      // user, ensuring the total-count check and the insert are atomic with
      // respect to other in-flight requests from that user. Without this lock,
      // concurrent transactions running under READ COMMITTED can each observe
      // a count below MAX_SUBSCRIPTIONS_PER_USER and all proceed to insert,
      // bypassing the per-account cap.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${req.user!.id})`);

      const [{ totalCount }] = await tx
        .select({ totalCount: sql<number>`count(*)` })
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.userId, req.user!.id));

      if (Number(totalCount) >= MAX_SUBSCRIPTIONS_PER_USER) {
        throw new SubscriptionError(429, { error: "You have reached the maximum number of subscriptions allowed per account." });
      }

      const [duplicate] = await tx
        .select({ id: subscriptionsTable.id })
        .from(subscriptionsTable)
        .where(
          and(
            eq(subscriptionsTable.userId, req.user!.id),
            eq(subscriptionsTable.productId, productId),
            sql`${subscriptionsTable.status} IN ('pending_payment', 'active', 'paused')`,
          ),
        )
        .limit(1);

      if (duplicate) {
        throw new SubscriptionError(409, { error: "You already have an active subscription for this product." });
      }

      const [inserted] = await tx.insert(subscriptionsTable).values({
        userId: req.user!.id,
        productId,
        quantity,
        interval,
        mode,
        nextDeliveryDate: nextDelivery(interval),
        status: "pending_payment",
      }).returning();

      return inserted;
    });
  } catch (err) {
    if (err instanceof SubscriptionError) {
      res.status(err.status).json(err.body);
      return;
    }
    throw err;
  }

  res.status(201).json({
    ...sub,
    productName: product.name,
    productImageUrl: product.imageUrl || null,
  });
});

router.put("/subscriptions/:id", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = UpdateSubscriptionParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const bodyParsed = UpdateSubscriptionBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const existing = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.id, parsed.data.id), eq(subscriptionsTable.userId, req.user!.id)))
    .limit(1);
  if (!existing.length) { res.status(404).json({ error: "Not found" }); return; }

  const updates: Partial<typeof subscriptionsTable.$inferInsert> = {};
  const body = bodyParsed.data;
  const currentStatus = existing[0].status;

  const hasBillableTermChange =
    (body.quantity != null && body.quantity !== existing[0].quantity) ||
    (body.interval != null && body.interval !== existing[0].interval) ||
    (body.mode != null && body.mode !== existing[0].mode);

  if (hasBillableTermChange && (currentStatus === "active" || currentStatus === "paused")) {
    res.status(422).json({
      error:
        "Quantity, interval, and mode cannot be changed on an active or paused subscription. Cancel and create a new subscription to change these terms.",
    });
    return;
  }

  if (body.quantity != null) updates.quantity = body.quantity;
  if (body.interval != null) updates.interval = body.interval;
  if (body.mode != null) updates.mode = body.mode;

  if (body.status != null) {
    const current = currentStatus;
    const allowed: Record<string, string[]> = {
      pending_payment: ["cancelled"],
      active: ["paused", "cancelled"],
      paused: ["active", "cancelled"],
      cancelled: [],
    };
    if (!allowed[current]?.includes(body.status)) {
      res.status(400).json({ error: `Cannot transition subscription from '${current}' to '${body.status}'` });
      return;
    }
    updates.status = body.status;
  }

  if (body.interval != null) updates.nextDeliveryDate = nextDelivery(body.interval);

  const [updated] = await db.update(subscriptionsTable).set(updates).where(eq(subscriptionsTable.id, parsed.data.id)).returning();

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, updated.productId)).limit(1);
  res.json({ ...updated, productName: product?.name || "Unknown", productImageUrl: product?.imageUrl || null });
});

router.delete("/subscriptions/:id", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = CancelSubscriptionParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.id, parsed.data.id), eq(subscriptionsTable.userId, req.user!.id)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  await db.update(subscriptionsTable).set({ status: "cancelled" }).where(eq(subscriptionsTable.id, parsed.data.id));
  res.json({ success: true, message: "Subscription cancelled" });
});

export default router;
