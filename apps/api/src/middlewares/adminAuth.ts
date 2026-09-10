import { clerkClient } from "@clerk/express";
import { safeGetAuth } from "../lib/clerkConfig";
import type { Request, Response, NextFunction } from "express";
import { db, adminUsers } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export interface AdminAuthRequest extends Request {
  adminClerkUserId?: string;
  adminEmail?: string;
}

function parseAdminList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function getBootstrapAdminEmails(): string[] {
  return parseAdminList(process.env.ADMIN_EMAILS);
}

export function getBootstrapAdminUserIds(): string[] {
  return parseAdminList(process.env.ADMIN_CLERK_USER_IDS);
}

async function isEmailInDbAdmins(email: string): Promise<boolean> {
  const rows = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(sql`lower(${adminUsers.email}) = ${email.toLowerCase()}`)
    .limit(1);
  return rows.length > 0;
}

export async function getClerkUserEmails(clerkUserId: string): Promise<{ primary?: string; all: string[] }> {
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    const all = (user.emailAddresses ?? [])
      .map((e) => e.emailAddress?.toLowerCase())
      .filter(Boolean) as string[];
    const primary = (
      user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      ""
    ).toLowerCase() || undefined;
    return { primary, all };
  } catch {
    return { all: [] };
  }
}

export async function isAdminUser(clerkUserId: string): Promise<{ ok: boolean; email?: string }> {
  const bootstrapEmails = getBootstrapAdminEmails();
  const bootstrapIds = getBootstrapAdminUserIds();

  // Resolve emails up-front so we can populate `email` even on the userId/metadata paths.
  const { primary, all: emails } = await getClerkUserEmails(clerkUserId);

  // 1) DB admins (the new self-serve store) take precedence.
  for (const email of emails) {
    if (await isEmailInDbAdmins(email)) {
      return { ok: true, email };
    }
  }

  // 2) Env / Clerk metadata fallbacks for bootstrap.
  if (bootstrapIds.includes(clerkUserId.toLowerCase())) {
    return { ok: true, email: primary };
  }

  const matchedEnv = emails.find((e) => bootstrapEmails.includes(e));
  if (matchedEnv) {
    return { ok: true, email: matchedEnv };
  }

  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    const meta = user.publicMetadata as Record<string, unknown> | null | undefined;
    if (meta?.isAdmin === true || meta?.role === "admin") {
      return { ok: true, email: primary };
    }
  } catch {
    // ignore
  }

  return { ok: false };
}

export async function requireAdmin(
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction,
) {
  const auth = safeGetAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: sign in required" });
  }
  const result = await isAdminUser(userId);
  if (!result.ok) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }
  req.adminClerkUserId = userId;
  req.adminEmail = result.email;
  return next();
}

export async function checkAdminStatus(req: Request): Promise<{ signedIn: boolean; isAdmin: boolean; email?: string }> {
  const auth = safeGetAuth(req);
  const userId = auth?.userId;
  if (!userId) return { signedIn: false, isAdmin: false };
  const result = await isAdminUser(userId);
  return { signedIn: true, isAdmin: result.ok, email: result.email };
}
