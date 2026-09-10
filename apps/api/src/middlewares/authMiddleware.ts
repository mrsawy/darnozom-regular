import { clerkClient } from "@clerk/express";
import { safeGetAuth } from "../lib/clerkConfig";
import type { Request, Response, NextFunction } from "express";
import { db as defaultDb } from "@workspace/db";
import { users, clients } from "@workspace/db";
import { eq, count } from "drizzle-orm";

export interface AuthRequest extends Request {
  clerkUserId?: string;
  userRole?: "consultant" | "client";
  userClientId?: number | null;
  isAdmin?: boolean;
  userTenantId?: number | null;
  isSuperAdmin?: boolean;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = safeGetAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.clerkUserId = userId;
  return next();
}

export async function getRoleFromClerkMetadata(clerkUserId: string): Promise<"consultant" | "client"> {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const metaRole = (clerkUser.publicMetadata as Record<string, unknown>)?.role;
    if (metaRole === "consultant") {
      return "consultant";
    }
  } catch {
    // fallback below
  }
  return "client";
}

export async function resolveRoleForNewUser(clerkUserId: string): Promise<"consultant" | "client"> {
  const clerkRole = await getRoleFromClerkMetadata(clerkUserId);
  if (clerkRole === "consultant") {
    return "consultant";
  }
  try {
    const [row] = await defaultDb
      .select({ c: count() })
      .from(users)
      .where(eq(users.role, "consultant"))
      .limit(1);
    if ((row?.c ?? 0) === 0) {
      return "consultant";
    }
  } catch {
    // ignore
  }
  return "client";
}

export async function getClientIdFromClerkMetadata(
  clerkUserId: string,
  email?: string,
): Promise<number | null> {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const meta = clerkUser.publicMetadata as Record<string, unknown>;

    const metaClientId = meta?.clientId;
    if (typeof metaClientId === "number") {
      return metaClientId;
    }

    const resolveEmail = email ?? clerkUser.emailAddresses?.[0]?.emailAddress;
    if (resolveEmail) {
      const [matchedClient] = await defaultDb
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.contactEmail, resolveEmail))
        .limit(1);
      if (matchedClient) {
        return matchedClient.id;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function checkIsAdmin(clerkUserId: string): Promise<boolean> {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const meta = clerkUser.publicMetadata as Record<string, unknown>;
    return meta?.isAdmin === true || meta?.role === "admin";
  } catch {
    return false;
  }
}

export async function autoProvisionClientRecord(clerkUserId: string, email?: string): Promise<number | null> {
  try {
    const [existing] = await defaultDb
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.clerkId, clerkUserId))
      .limit(1);
    if (existing) return existing.id;

    const displayName = email
      ? email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
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
        clerkId: clerkUserId,
      })
      .returning();
    return created.id;
  } catch {
    return null;
  }
}

export async function loadUserRole(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = safeGetAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    return next();
  }
  req.clerkUserId = userId;
  try {
    const [user] = await defaultDb.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (user) {
      req.userRole = user.role;
      if (user.role === "client" && !user.clientId) {
        const clientId = await getClientIdFromClerkMetadata(userId);
        req.userClientId = clientId ?? null;
      } else {
        req.userClientId = user.clientId ?? null;
      }
      req.userTenantId = user.tenantId ?? null;
      req.isSuperAdmin = user.isSuperAdmin ?? false;
    } else {
      const role = await resolveRoleForNewUser(userId);
      let clientId = await getClientIdFromClerkMetadata(userId);
      if (role === "client" && !clientId) {
        let email: string | undefined;
        try {
          const clerkUser = await clerkClient.users.getUser(userId);
          email = clerkUser.emailAddresses?.[0]?.emailAddress;
        } catch { /* ignore */ }
        clientId = await autoProvisionClientRecord(userId, email);
      }
      req.userRole = role;
      req.userClientId = clientId ?? null;
      req.userTenantId = null;
      req.isSuperAdmin = false;
    }
    if (req.userRole === "consultant") {
      req.isAdmin = await checkIsAdmin(userId);
    } else {
      req.isAdmin = false;
    }
  } catch {
    req.userRole = "client";
    req.userClientId = null;
    req.isAdmin = false;
    req.userTenantId = null;
    req.isSuperAdmin = false;
  }
  next();
}

export function requireConsultant(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "consultant") {
    return res.status(403).json({ error: "Forbidden: consultant access required" });
  }
  return next();
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: super-admin access required" });
  }
  return next();
}
