import { Router } from "express";
import { db, ordersTable, productsTable } from "@workspace/db";
import { eq, desc, sql, inArray, and } from "drizzle-orm";
import { CreateOrderBody, ListOrdersQueryParams, ListAdminOrdersQueryParams } from "@workspace/api-zod";
import { requireAuth, optionalAuth, requireAdmin, AuthedRequest } from "../middlewares/auth";
import rateLimit from "express-rate-limit";

const router = Router();

class OrderError extends Error {
  constructor(public readonly status: number, public readonly body: { error: string }) {
    super(body.error);
    this.name = "OrderError";
  }
}

const SERVICE_FEE_PCT = 0.05;

const MAX_PENDING_ORDERS_PER_USER = 5;

const orderCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => String((req as AuthedRequest).user?.id ?? req.ip),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many orders created. Please try again later." },
});

router.get("/orders", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = Math.min(parsed.success ? (parsed.data.limit ?? 20) : 20, 100);
  const offset = (page - 1) * limit;

  const [orders, [{ count }]] = await Promise.all([
    db.select().from(ordersTable).where(and(eq(ordersTable.userId, req.user!.id), sql`${ordersTable.status} != 'draft'`)).orderBy(desc(ordersTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(and(eq(ordersTable.userId, req.user!.id), sql`${ordersTable.status} != 'draft'`)),
  ]);

  res.json({ orders: orders.map(formatOrder), total: Number(count), page, limit });
});

router.post("/orders", requireAuth, orderCreationRateLimit, async (req: AuthedRequest, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const { items, shippingAddress } = parsed.data;

  const nonIntegerItem = items.find(
    i => !Number.isInteger(i.productId) || !Number.isInteger(i.quantity)
  );
  if (nonIntegerItem) {
    res.status(400).json({ error: "productId and quantity must be integers" });
    return;
  }

  // Fetch products outside the transaction — read-only, no quota impact.
  const productIds = Array.from(new Set(items.map(i => i.productId)));
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  const productMap = new Map(products.map(p => [p.id, p]));

  const missing = items.filter(i => !productMap.has(i.productId)).map(i => i.productId);
  if (missing.length > 0) {
    res.status(400).json({ error: `Product not found: ${missing.join(", ")}` });
    return;
  }

  const outOfStock = items.filter(i => productMap.get(i.productId)!.inStock === false).map(i => i.productId);
  if (outOfStock.length > 0) {
    res.status(400).json({ error: `Product is out of stock: ${outOfStock.join(", ")}` });
    return;
  }

  const orderItems = items.map(item => {
    const p = productMap.get(item.productId)!;
    return {
      productId: item.productId,
      name: p.name,
      quantity: item.quantity,
      price: Number(p.price),
      imageUrl: p.imageUrl || undefined,
    };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const serviceFee = Math.round(subtotal * SERVICE_FEE_PCT * 100) / 100;
  const total = Math.round((subtotal + serviceFee) * 100) / 100;

  // Savings vs wasPrice
  const savings = orderItems.reduce((sum, i) => {
    const p = productMap.get(i.productId);
    const was = p?.wasPrice ? Number(p.wasPrice) : i.price;
    return sum + (was - i.price) * i.quantity;
  }, 0);

  // Wrap the quota check and insert in a single transaction, guarded by a
  // per-user advisory lock. pg_advisory_xact_lock serializes concurrent
  // requests for the same user, ensuring the count is stable between the
  // check and the insert and preventing concurrent requests from bypassing
  // the MAX_PENDING_ORDERS_PER_USER cap.
  let order: typeof ordersTable.$inferSelect;
  try {
    order = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${req.user!.id})`);

      const [{ pendingCount }] = await tx
        .select({ pendingCount: sql<number>`count(*)` })
        .from(ordersTable)
        .where(and(eq(ordersTable.userId, req.user!.id), eq(ordersTable.status, "draft")));

      if (Number(pendingCount) >= MAX_PENDING_ORDERS_PER_USER) {
        throw new OrderError(429, { error: "Too many unpaid orders. Please complete payment on existing orders first." });
      }

      const [inserted] = await tx.insert(ordersTable).values({
        userId: req.user!.id,
        guestEmail: null,
        status: "draft",
        items: orderItems,
        subtotal: String(subtotal),
        serviceFee: String(serviceFee),
        total: String(total),
        savings: String(Math.max(savings, 0)),
        shippingAddress: shippingAddress ?? null,
      }).returning();

      return inserted;
    });
  } catch (err) {
    if (err instanceof OrderError) {
      res.status(err.status).json(err.body);
      return;
    }
    throw err;
  }

  // TODO: Create a real Stripe checkout session here and return the provider URL.
  // Until payment is confirmed via webhook, this order remains in 'draft' status
  // and must not be fulfilled. The checkoutUrl below is a placeholder that shows
  // a "payment pending" state, not an order confirmation.
  const checkoutUrl = `${process.env.CLIENT_URL || ""}/checkout/success?order=${order.id}`;

  res.status(201).json({ orderId: order.id, checkoutUrl });
});

router.get("/orders/summary", requireAuth, async (req: AuthedRequest, res) => {
  const [aggRows, recentOrders] = await Promise.all([
    db
      .select({
        totalOrders: sql<number>`count(*)`,
        totalRevenue: sql<number>`coalesce(sum(total::numeric), 0)`,
        totalSavings: sql<number>`coalesce(sum(savings::numeric), 0)`,
      })
      .from(ordersTable)
      .where(and(eq(ordersTable.userId, req.user!.id), sql`${ordersTable.status} != 'draft'`)),
    db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.userId, req.user!.id), sql`${ordersTable.status} != 'draft'`))
      .orderBy(desc(ordersTable.createdAt))
      .limit(5),
  ]);

  const totalOrders = Number(aggRows[0]?.totalOrders ?? 0);
  const totalRevenue = Number(aggRows[0]?.totalRevenue ?? 0);
  const totalSavings = Number(aggRows[0]?.totalSavings ?? 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  res.json({
    totalOrders,
    totalRevenue,
    totalSavings,
    averageOrderValue,
    recentOrders: recentOrders.map(formatOrder),
  });
});

router.get("/orders/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order || (order.userId !== req.user!.id && req.user!.role !== "admin")) {
    res.status(404).json({ error: "Order not found" }); return;
  }
  res.json(formatOrder(order));
});

// Admin
router.get("/admin/orders", requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = ListAdminOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const page = parsed.data.page;
  const limit = parsed.data.limit;
  const offset = (page - 1) * limit;
  const status = parsed.data.status;

  const excludeDraft = sql`${ordersTable.status} != 'draft'`;
  let q = db.select().from(ordersTable).where(excludeDraft).orderBy(desc(ordersTable.createdAt)).limit(limit).offset(offset);
  let cq = db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(excludeDraft);

  if (status) {
    // @ts-ignore
    q = q.where(and(excludeDraft, eq(ordersTable.status, status)));
    // @ts-ignore
    cq = cq.where(and(excludeDraft, eq(ordersTable.status, status)));
  }

  const [orders, [{ count }]] = await Promise.all([q, cq]);
  res.json({ orders: orders.map(formatOrder), total: Number(count), page, limit });
});

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { usersTable } = await import("@workspace/db");

  const [allAgg, todayAgg, allUsers, recentOrders] = await Promise.all([
    db
      .select({
        totalOrders: sql<number>`count(*)`,
        totalRevenue: sql<number>`coalesce(sum(total::numeric), 0)`,
      })
      .from(ordersTable)
      .where(sql`${ordersTable.status} != 'draft'`),
    db
      .select({
        ordersToday: sql<number>`count(*)`,
        revenueToday: sql<number>`coalesce(sum(total::numeric), 0)`,
      })
      .from(ordersTable)
      .where(sql`created_at >= ${startOfDay} AND ${ordersTable.status} != 'draft'`),
    db.select({ count: sql<number>`count(*)` }).from(usersTable),
    db
      .select()
      .from(ordersTable)
      .where(sql`${ordersTable.status} != 'draft'`)
      .orderBy(desc(ordersTable.createdAt))
      .limit(10),
  ]);

  res.json({
    totalOrders: Number(allAgg[0]?.totalOrders ?? 0),
    totalRevenue: Number(allAgg[0]?.totalRevenue ?? 0),
    totalUsers: Number(allUsers[0]?.count ?? 0),
    totalProducts: 0,
    activeSubscriptions: 0,
    ordersToday: Number(todayAgg[0]?.ordersToday ?? 0),
    revenueToday: Number(todayAgg[0]?.revenueToday ?? 0),
    topCategories: [],
    recentOrders: recentOrders.map(formatOrder),
  });
});

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return {
    id: o.id,
    userId: o.userId,
    guestEmail: o.guestEmail,
    status: o.status,
    items: o.items,
    subtotal: Number(o.subtotal),
    serviceFee: Number(o.serviceFee),
    total: Number(o.total),
    savings: o.savings != null ? Number(o.savings) : null,
    shippingAddress: o.shippingAddress,
    stripeSessionId: o.stripeSessionId,
    createdAt: o.createdAt,
  };
}

export default router;
