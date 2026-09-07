import { Router, Request, Response, NextFunction } from "express";
import bcryptjs from "bcryptjs";
const { hash, compare } = bcryptjs;
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db, usersTable, sessionsTable, userProfilesTable, emailVerificationTokensTable, pendingRegistrationsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import rateLimit from "express-rate-limit";
import { JWT_SECRET, JWT_EXPIRES, SESSION_DURATION_MS, SESSION_COOKIE_NAME } from "../lib/auth-config";
import { sendVerificationEmail } from "../lib/email";

const router = Router();

const VERIFICATION_TOKEN_DURATION_MS = 24 * 60 * 60 * 1000;

const DUMMY_HASH_PROMISE = hash("__dummy_timing_equalization__", 10);

const GENERIC_REGISTER_RESPONSE = {
  message: "If this email is not already registered, an account has been created. Check your email for a verification link.",
};

function makeToken(userId: number): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ userId, jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return { token, jti };
}

function getAppBaseUrl(): string {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (replitDomain) {
    return `https://${replitDomain}`;
  }
  return "http://localhost:80";
}

function cookieSecure(req: Request): boolean {
  return req.secure || req.headers["x-forwarded-proto"] === "https";
}

function setSessionCookie(req: Request, res: import("express").Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: "strict",
    maxAge: SESSION_DURATION_MS,
    path: "/",
  });
}

function clearSessionCookie(req: Request, res: import("express").Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: "strict",
    path: "/",
  });
}

function extractToken(req: Request): string | null {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE_NAME];
  if (cookieToken) return cookieToken;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const ACCOUNT_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_MAX_FAILURES = 10;

interface AccountFailureRecord {
  count: number;
  windowStart: number;
}

// NOTE: This is an in-memory store. Lockout state resets on process restart
// and is not shared across multiple API instances. For horizontally-scaled
// deployments, replace with a shared expiring store (e.g. Redis with TTL).
const accountFailures = new Map<string, AccountFailureRecord>();

// Periodically evict entries whose window has expired to prevent unbounded growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of accountFailures) {
    if (now - record.windowStart >= ACCOUNT_LOCKOUT_WINDOW_MS) {
      accountFailures.delete(key);
    }
  }
}, ACCOUNT_LOCKOUT_WINDOW_MS).unref();

function getAccountFailures(normalizedEmail: string): AccountFailureRecord {
  const now = Date.now();
  const record = accountFailures.get(normalizedEmail);
  if (!record || now - record.windowStart >= ACCOUNT_LOCKOUT_WINDOW_MS) {
    return { count: 0, windowStart: now };
  }
  return record;
}

function recordAccountFailure(normalizedEmail: string): AccountFailureRecord {
  const record = getAccountFailures(normalizedEmail);
  record.count += 1;
  accountFailures.set(normalizedEmail, record);
  return record;
}

function clearAccountFailures(normalizedEmail: string): void {
  accountFailures.delete(normalizedEmail);
}

// ---------------------------------------------------------------------------
// CSRF / Origin validation
// ---------------------------------------------------------------------------
// Replit deployments share a registrable domain (*.replit.app), so
// SameSite=Strict cookies are NOT a sufficient CSRF defence — a page on
// evil.replit.app is considered "same-site" by the browser and its form
// submissions will carry the victim's cookies.
//
// We defend by validating the Origin header on every state-mutating,
// cookie-authenticated endpoint (login and logout).  Modern browsers always
// include Origin on cross-origin requests (including plain HTML form POSTs),
// so an absent Origin header is safe to pass through (it indicates either a
// same-origin request or a non-browser client like the mobile app using
// Bearer tokens).
// ---------------------------------------------------------------------------

function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  if (process.env.PUBLIC_APP_URL) {
    origins.add(process.env.PUBLIC_APP_URL.replace(/\/$/, ""));
  }

  const replitDomains = process.env.REPLIT_DOMAINS?.split(",") ?? [];
  for (const domain of replitDomains) {
    const trimmed = domain.trim();
    if (trimmed) {
      origins.add(`https://${trimmed}`);
    }
  }

  // Development fallbacks (non-production only)
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:80");
    origins.add("http://localhost:3000");
    origins.add("http://localhost:5173");
  }

  return origins;
}

// Compute once at startup; env vars don't change at runtime.
const ALLOWED_ORIGINS = buildAllowedOrigins();

function validateRequestOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (origin) {
    // Origin header present: straightforward allowlist check.
    if (!ALLOWED_ORIGINS.has(origin)) {
      res.status(403).json({ error: "Forbidden: request origin not allowed" });
      return;
    }
    next();
    return;
  }

  // No Origin header — fall back to Referer when it is present.
  // This covers edge cases where certain browser/client configurations omit
  // Origin but still send Referer (e.g. some navigations in older clients).
  const referer = req.headers.referer;
  if (referer) {
    let refererOrigin: string;
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      // Malformed Referer header — reject to be safe.
      res.status(403).json({ error: "Forbidden: malformed Referer header" });
      return;
    }

    if (!ALLOWED_ORIGINS.has(refererOrigin)) {
      res.status(403).json({ error: "Forbidden: request origin not allowed" });
      return;
    }
  }

  // Neither Origin nor Referer present → non-browser client (e.g. mobile app
  // using Bearer tokens) or same-origin navigation; safe to proceed.
  next();
}

function isAccountLocked(normalizedEmail: string): { locked: boolean; retryAfterSec: number } {
  const record = getAccountFailures(normalizedEmail);
  if (record.count >= ACCOUNT_MAX_FAILURES) {
    const elapsed = Date.now() - record.windowStart;
    const retryAfterSec = Math.ceil((ACCOUNT_LOCKOUT_WINDOW_MS - elapsed) / 1000);
    return { locked: true, retryAfterSec: Math.max(retryAfterSec, 1) };
  }
  return { locked: false, retryAfterSec: 0 };
}

// Registration stores a pending record — no users row is created until the
// person proves email ownership by following the verification link.
router.post("/auth/register", authRateLimit, async (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { email, password, name } = parsed.data;

  // If a verified account already exists, equalize timing and return generic message.
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    await hash(password, 10);
    res.status(200).json(GENERIC_REGISTER_RESPONSE);
    return;
  }

  const passwordHash = await hash(password, 10);
  const verificationToken = crypto.randomUUID();
  const tokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_DURATION_MS);

  // Upsert the pending registration so the real owner can always request a
  // fresh link by re-submitting the form, displacing any earlier attempt.
  await db
    .insert(pendingRegistrationsTable)
    .values({ email, passwordHash, name, token: verificationToken, expiresAt: tokenExpiresAt })
    .onConflictDoUpdate({
      target: pendingRegistrationsTable.email,
      set: { passwordHash, name, token: verificationToken, expiresAt: tokenExpiresAt },
    });

  const baseUrl = getAppBaseUrl();
  const verificationUrl = `${baseUrl}/auth/verify?token=${verificationToken}`;

  sendVerificationEmail(email, verificationUrl).catch(() => {
    req.log.warn({ email }, "Failed to send verification email");
  });

  res.status(200).json(GENERIC_REGISTER_RESPONSE);
});

// Verification promotes a pending registration into a real users row.
// Email ownership is proven at this point, so the credential is safe to create.
router.post("/auth/verify", authRateLimit, async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Verification token is required" });
    return;
  }

  const [pending] = await db
    .select()
    .from(pendingRegistrationsTable)
    .where(
      and(
        eq(pendingRegistrationsTable.token, token),
        gt(pendingRegistrationsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!pending) {
    // Also check the legacy email_verification_tokens table for tokens that
    // were issued before this change, so existing verification links keep working.
    const [legacyRecord] = await db
      .select()
      .from(emailVerificationTokensTable)
      .where(
        and(
          eq(emailVerificationTokensTable.token, token),
          gt(emailVerificationTokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!legacyRecord) {
      res.status(400).json({ error: "Invalid or expired verification token" });
      return;
    }

    await db
      .update(usersTable)
      .set({ emailVerified: true })
      .where(eq(usersTable.id, legacyRecord.userId));

    await db
      .delete(emailVerificationTokensTable)
      .where(eq(emailVerificationTokensTable.id, legacyRecord.id));

    res.status(200).json({ message: "Email verified successfully. You may now sign in." });
    return;
  }

  // Check if this email was already registered while the pending record existed
  // (edge case: concurrent registrations or data inconsistency).
  const alreadyExists = await db.select().from(usersTable).where(eq(usersTable.email, pending.email)).limit(1);
  if (alreadyExists.length > 0) {
    await db.delete(pendingRegistrationsTable).where(eq(pendingRegistrationsTable.id, pending.id));
    res.status(200).json({ message: "Email verified successfully. You may now sign in." });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      email: pending.email,
      passwordHash: pending.passwordHash,
      name: pending.name,
      role: "user",
      emailVerified: true,
    })
    .returning();

  await db.insert(userProfilesTable).values({ userId: user.id });

  await db.delete(pendingRegistrationsTable).where(eq(pendingRegistrationsTable.id, pending.id));

  res.status(200).json({ message: "Email verified successfully. You may now sign in." });
});

// Unified login endpoint: sets a httpOnly session cookie for web browser clients
// and also returns the token in the response body for mobile clients that store
// it in device-encrypted secure storage (expo-secure-store).
router.post("/auth/login", authRateLimit, validateRequestOrigin, async (req, res) => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const { locked, retryAfterSec } = isAccountLocked(normalizedEmail);
  if (locked) {
    res.setHeader("Retry-After", String(retryAfterSec));
    res.status(429).json({ error: "Too many failed login attempts. Please try again later." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  const hashToCompare = user ? user.passwordHash : await DUMMY_HASH_PROMISE;
  const valid = await compare(password, hashToCompare);

  if (!user || !valid || user.emailVerified === false) {
    recordAccountFailure(normalizedEmail);
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  clearAccountFailures(normalizedEmail);

  const { token, jti } = makeToken(user.id);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessionsTable).values({ userId: user.id, token: jti, expiresAt });

  setSessionCookie(req, res, token);

  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
    token,
  });
});

router.post("/auth/logout", validateRequestOrigin, async (req, res) => {
  const rawToken = extractToken(req);

  if (rawToken) {
    try {
      const payload = jwt.verify(rawToken, JWT_SECRET, { maxAge: JWT_EXPIRES }) as { userId: number; jti?: string };
      if (payload.jti) {
        await db
          .delete(sessionsTable)
          .where(and(eq(sessionsTable.token, payload.jti), eq(sessionsTable.userId, payload.userId)));
      }
    } catch {
      // Token invalid or already expired — nothing to revoke
    }
  }

  clearSessionCookie(req, res);

  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", async (req, res) => {
  const rawToken = extractToken(req);

  if (!rawToken) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const payload = jwt.verify(rawToken, JWT_SECRET, { maxAge: JWT_EXPIRES }) as { userId: number; jti?: string };
    const { userId, jti } = payload;

    if (!jti) {
      res.status(401).json({ error: "Invalid token: missing session ID" });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.token, jti),
          eq(sessionsTable.userId, userId),
          gt(sessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!session) {
      res.status(401).json({ error: "Session revoked or expired" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
