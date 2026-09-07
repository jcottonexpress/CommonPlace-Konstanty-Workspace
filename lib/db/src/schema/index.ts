import { pgTable, serial, text, integer, boolean, numeric, timestamp, json, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Users ─────────────────────────────────────────────────────────────────
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  emailVerified: boolean("email_verified"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// ── User Profiles ─────────────────────────────────────────────────────────
export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  householdSize: integer("household_size"),
  hasKids: boolean("has_kids"),
  kidsAges: json("kids_ages").$type<number[]>(),
  pets: json("pets").$type<string[]>(),
  preferences: json("preferences").$type<string[]>(),
  budgetRange: text("budget_range"),
  zipCode: text("zip_code"),
  prefersBrands: boolean("prefers_brands"),
  autoRefillMode: text("auto_refill_mode").default("confirm"),
  notifyDaysBefore: integer("notify_days_before").default(3),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({ id: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;

// ── Products ─────────────────────────────────────────────────────────────
export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  wasPrice: numeric("was_price", { precision: 10, scale: 2 }),
  bulkPrice: numeric("bulk_price", { precision: 10, scale: 2 }),
  badge: text("badge"),
  badgeColor: text("badge_color"),
  savings: text("savings"),
  imageUrl: text("image_url"),
  keywords: json("keywords").$type<string[]>(),
  similar: json("similar").$type<{brand: string; name: string; price: number; savings?: string; imageUrl?: string}[]>(),
  isSponsored: boolean("is_sponsored").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  inStock: boolean("in_stock").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

// ── Orders ───────────────────────────────────────────────────────────────
export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  guestEmail: text("guest_email"),
  status: text("status").notNull().default("pending"),
  items: json("items").notNull().$type<{productId: number; name: string; quantity: number; price: number; imageUrl?: string}[]>(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  serviceFee: numeric("service_fee", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  savings: numeric("savings", { precision: 10, scale: 2 }),
  shippingAddress: json("shipping_address"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;

// ── Subscriptions ─────────────────────────────────────────────────────────
export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull().default(1),
  interval: text("interval").notNull().default("1month"),
  mode: text("mode").notNull().default("confirm"),
  nextDeliveryDate: timestamp("next_delivery_date").notNull(),
  status: text("status").notNull().default("pending_payment"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("subscriptions_user_product_active_unique")
    .on(table.userId, table.productId)
    .where(sql`status IN ('pending_payment', 'active', 'paused')`),
]);

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;

// ── Pending Registrations ─────────────────────────────────────────────────
// Holds unverified sign-up attempts. A users row is only created after the
// person proves email ownership by clicking the verification link.
export const pendingRegistrationsTable = pgTable("pending_registrations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPendingRegistrationSchema = createInsertSchema(pendingRegistrationsTable).omit({ id: true, createdAt: true });
export type InsertPendingRegistration = z.infer<typeof insertPendingRegistrationSchema>;
export type PendingRegistration = typeof pendingRegistrationsTable.$inferSelect;

// ── Email Verification Tokens ─────────────────────────────────────────────
export const emailVerificationTokensTable = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokensTable).omit({ id: true, createdAt: true });
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type EmailVerificationToken = typeof emailVerificationTokensTable.$inferSelect;

// ── Sessions ──────────────────────────────────────────────────────────────
export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
