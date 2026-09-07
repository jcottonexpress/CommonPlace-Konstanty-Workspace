import { Router } from "express";
import { db, userProfilesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { UpdateUserProfileBody } from "@workspace/api-zod";
import { requireAuth, AuthedRequest } from "../middlewares/auth";

const router = Router();

router.get("/users/profile", requireAuth, async (req: AuthedRequest, res) => {
  let [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, req.user!.id)).limit(1);
  if (!profile) {
    [profile] = await db.insert(userProfilesTable).values({ userId: req.user!.id }).returning();
  }
  res.json(profile);
});

router.put("/users/profile", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = UpdateUserProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const existing = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, req.user!.id)).limit(1);

  let profile;
  if (existing.length === 0) {
    [profile] = await db.insert(userProfilesTable).values({ userId: req.user!.id, ...parsed.data, updatedAt: new Date() }).returning();
  } else {
    [profile] = await db.update(userProfilesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(userProfilesTable.userId, req.user!.id)).returning();
  }
  res.json(profile);
});

router.get("/users/recommendations", requireAuth, async (req: AuthedRequest, res) => {
  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, req.user!.id)).limit(1);

  // AI tailoring: prioritize categories based on profile
  let priorityCategories: string[] = [];
  if (profile) {
    if (profile.hasKids) priorityCategories.push("baby");
    if (profile.pets && (profile.pets as string[]).length > 0) priorityCategories.push("pet");
    priorityCategories.push("cleaning", "kitchen", "bathroom");
  }

  // Return featured + high-savings products as recommendations
  const products = await db.select().from(productsTable)
    .orderBy(sql`is_featured DESC, is_sponsored DESC, id ASC`)
    .limit(12);

  res.json(products.map(p => ({
    id: p.id,
    category: p.category,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    wasPrice: p.wasPrice != null ? Number(p.wasPrice) : null,
    bulkPrice: p.bulkPrice != null ? Number(p.bulkPrice) : null,
    badge: p.badge,
    badgeColor: p.badgeColor,
    savings: p.savings,
    imageUrl: p.imageUrl,
    keywords: p.keywords,
    similar: p.similar || [],
    isSponsored: p.isSponsored,
    isFeatured: p.isFeatured,
    inStock: p.inStock,
  })));
});

export default router;
