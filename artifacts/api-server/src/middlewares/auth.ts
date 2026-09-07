import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { JWT_SECRET, JWT_EXPIRES, SESSION_COOKIE_NAME } from "../lib/auth-config";

export interface AuthedRequest extends Request {
  user?: { id: number; email: string; name: string; role: string };
}

function extractToken(req: Request): string | null {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE_NAME];
  if (cookieToken) return cookieToken;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

async function resolveUser(
  rawToken: string,
): Promise<{ id: number; email: string; name: string; role: string } | null> {
  let userId: number;
  let jti: string;
  try {
    const payload = jwt.verify(rawToken, JWT_SECRET, { complete: false, maxAge: JWT_EXPIRES }) as { userId: number; jti?: string };
    if (!payload.jti) return null;
    userId = payload.userId;
    jti = payload.jti;
  } catch {
    return null;
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

  if (!session) return null;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const rawToken = extractToken(req);
  if (!rawToken) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await resolveUser(rawToken);
  if (!user) {
    res.status(401).json({ error: "Invalid or revoked token" });
    return;
  }
  req.user = user;
  next();
}

export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const rawToken = extractToken(req);
  if (rawToken) {
    const user = await resolveUser(rawToken);
    if (user) req.user = user;
  }
  next();
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
