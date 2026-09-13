import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { db as defaultDb } from "@workspace/db";
import { clients, users, type UserRole } from "@workspace/db";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { logger } from "../lib/logger";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
  userClientId?: number | null;
  isAdmin?: boolean;
  userTenantId?: number | null;
  isSuperAdmin?: boolean;
}

/**
 * Roles form a hierarchy rather than a flat set. Under Clerk this was two
 * separate things — a `consultant`/`client` role plus an `isAdmin` metadata
 * flag — so the helpers below preserve those semantics from the single column:
 * every admin is also staff, and a super-admin is also an admin.
 */
const STAFF_ROLES: readonly UserRole[] = ["consultant", "admin", "super_admin"];
const ADMIN_ROLES: readonly UserRole[] = ["admin", "super_admin"];

export function isStaffRole(role: UserRole | undefined): boolean {
  return role !== undefined && STAFF_ROLES.includes(role);
}

export function isAdminRole(role: UserRole | undefined): boolean {
  return role !== undefined && ADMIN_ROLES.includes(role);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  role: UserRole;
  clientId: number | null;
  tenantId: number | null;
}

/**
 * Reads the session cookie. Returns null when there is no valid session, so
 * protected routes answer 401 instead of throwing a 500 — the same contract
 * the old `safeGetAuth` had, minus the network call to Clerk.
 */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  try {
    const result = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!result?.user) return null;
    const u = result.user as unknown as SessionUser;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      emailVerified: u.emailVerified,
      image: u.image ?? null,
      role: (u.role ?? "client") as UserRole,
      clientId: u.clientId ?? null,
      tenantId: u.tenantId ?? null,
    };
  } catch (err) {
    logger.debug({ err }, "Session lookup failed — treating as signed out");
    return null;
  }
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  applySessionToRequest(req, user);
  return next();
}

function applySessionToRequest(req: AuthRequest, user: SessionUser) {
  req.userId = user.id;
  req.userEmail = user.email;
  req.userRole = user.role;
  req.userClientId = user.clientId;
  req.userTenantId = user.tenantId;
  req.isAdmin = isAdminRole(user.role);
  req.isSuperAdmin = user.role === "super_admin";
}

/**
 * Creates the `clients` row a self-registered client account hangs off, the
 * first time one is needed. Idempotent per user.
 */
export async function autoProvisionClientRecord(
  userId: string,
  email?: string,
): Promise<number | null> {
  try {
    const [existing] = await defaultDb
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.ownerUserId, userId))
      .limit(1);
    if (existing) return existing.id;

    const displayName = email
      ? email
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : "New Client";

    const [created] = await defaultDb
      .insert(clients)
      .values({
        name: displayName,
        organization: displayName,
        industry: "Other",
        contactEmail: email ?? null,
        challenges: "To be determined via assessment",
        goals: "To be determined via assessment",
        selfRegistered: true,
        ownerUserId: userId,
      })
      .returning();
    return created.id;
  } catch (err) {
    logger.error({ err, userId }, "Failed to auto-provision client record");
    return null;
  }
}

/**
 * Populates the auth fields on the request when a session exists, and quietly
 * does nothing when it doesn't. Routes that are readable both signed-in and
 * signed-out rely on that — this must never reject.
 */
export async function loadUserRole(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  const user = await getSessionUser(req);
  if (!user) return next();

  applySessionToRequest(req, user);

  // A client with no client record yet gets one on first authenticated
  // request. Staff roles never need one.
  if (user.role === "client" && !user.clientId) {
    const clientId = await autoProvisionClientRecord(user.id, user.email);
    if (clientId) {
      req.userClientId = clientId;
      try {
        await defaultDb
          .update(users)
          .set({ clientId, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      } catch (err) {
        // The request still works with the id on `req`; the write is a cache.
        logger.warn({ err, userId: user.id }, "Failed to persist clientId");
      }
    }
  }

  return next();
}

export function requireConsultant(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (!isStaffRole(req.userRole)) {
    return res
      .status(403)
      .json({ error: "Forbidden: consultant access required" });
  }
  return next();
}

export function requireSuperAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.isSuperAdmin) {
    return res
      .status(403)
      .json({ error: "Forbidden: super-admin access required" });
  }
  return next();
}
