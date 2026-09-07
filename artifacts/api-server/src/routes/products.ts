import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { ListProductsQueryParams, GetProductParams, GetSimilarProductsParams, CreateProductBody } from "@workspace/api-zod";
import { requireAdmin, AuthedRequest } from "../middlewares/auth";
import rateLimit from "express-rate-limit";

const router = Router();

const productSearchRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

router.get("/products", productSearchRateLimit, async (req, res) => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const params = parsed.data;

  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 24, 100);
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];

  if (params.category && params.category !== "all") {
    conditions.push(eq(productsTable.category, params.category));
  }
  if (params.sponsored !== undefined) {
    conditions.push(eq(productsTable.isSponsored, params.sponsored));
  }

  let baseQuery = db.select().from(productsTable);
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(productsTable);

  if (params.search) {
    const term = `%${params.search}%`;
    const searchCond = or(
      ilike(productsTable.name, term),
      ilike(productsTable.category, term),
      ilike(productsTable.description, term),
    )!;
    const allConds = conditions.length > 0 ? and(searchCond, ...conditions) : searchCond;
    // @ts-ignore
    baseQuery = baseQuery.where(allConds);
    // @ts-ignore
    countQuery = countQuery.where(allConds);
  } else if (conditions.length > 0) {
    const allConds = conditions.length === 1 ? conditions[0] : and(...conditions)!;
    // @ts-ignore
    baseQuery = baseQuery.where(allConds);
    // @ts-ignore
    countQuery = countQuery.where(allConds);
  }

  // Sponsored first
  // @ts-ignore
  baseQuery = baseQuery.orderBy(sql`is_sponsored DESC, is_featured DESC, id ASC`);
  // @ts-ignore
  baseQuery = baseQuery.limit(limit).offset(offset);

  const [products, [{ count }]] = await Promise.all([baseQuery, countQuery]);

  res.json({ products: products.map(formatProduct), total: Number(count), page, limit });
});

router.get("/products/featured", async (_req, res) => {
  const featured = await db.select().from(productsTable)
    .where(or(eq(productsTable.isFeatured, true), eq(productsTable.isSponsored, true))!)
    .orderBy(sql`is_sponsored DESC, is_featured DESC`)
    .limit(8);
  res.json(featured.map(formatProduct));
});

router.get("/products/categories", async (_req, res) => {
  const rows = await db.select({
    category: productsTable.category,
    count: sql<number>`count(*)`,
  }).from(productsTable).groupBy(productsTable.category);

  const iconMap: Record<string, string> = {
    cleaning: "sparkles",
    kitchen: "utensils",
    bathroom: "droplets",
    baby: "baby",
    pet: "paw-print",
    health: "heart-pulse",
    pantry: "package",
    office: "briefcase",
    laundry: "washing-machine",
    lighting: "lightbulb",
    batteries: "zap",
  };

  res.json(rows.map(r => ({
    slug: r.category,
    name: r.category.charAt(0).toUpperCase() + r.category.slice(1),
    count: Number(r.count),
    icon: iconMap[r.category] || "package",
  })));
});

router.get("/products/:id", async (req, res) => {
  const parsed = GetProductParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parsed.data.id)).limit(1);
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(formatProduct(product));
});

router.get("/products/:id/similar", async (req, res) => {
  const parsed = GetSimilarProductsParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parsed.data.id)).limit(1);
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const similar = (product.similar as { brand: string; name: string; price: number; savings?: string; imageUrl?: string }[]) || [];
  res.json(similar);
});

// Admin: create product
router.post("/admin/products", requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const [p] = await db.insert(productsTable).values({
    ...parsed.data,
    price: String(parsed.data.price),
    wasPrice: parsed.data.wasPrice != null ? String(parsed.data.wasPrice) : null,
    bulkPrice: parsed.data.bulkPrice != null ? String(parsed.data.bulkPrice) : null,
  }).returning();
  res.status(201).json(formatProduct(p));
});

// Admin: update product
router.put("/admin/products/:id", requireAdmin, async (req: AuthedRequest, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const [p] = await db.update(productsTable).set({
    ...parsed.data,
    price: String(parsed.data.price),
    wasPrice: parsed.data.wasPrice != null ? String(parsed.data.wasPrice) : null,
    bulkPrice: parsed.data.bulkPrice != null ? String(parsed.data.bulkPrice) : null,
  }).where(eq(productsTable.id, id)).returning();
  if (!p) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatProduct(p));
});

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
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
  };
}

export default router;
