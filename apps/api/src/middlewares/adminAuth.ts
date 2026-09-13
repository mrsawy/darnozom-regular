import type { Request, Response, NextFunction } from "express";
import { getSessionUser, isAdminRole } from "./authMiddleware";

export { getBootstrapAdminEmails } from "../lib/auth";

export interface AdminAuthRequest extends Request {
  adminUserId?: string;
  adminEmail?: string;
}

/**
 * Admin access is `users.role` and nothing else.
 *
 * This used to consult four sources in priority order — the `admin_users`
 * allowlist table, `ADMIN_CLERK_USER_IDS`, `ADMIN_EMAILS`, and Clerk's
 * `publicMetadata` — each an extra network call or query, and each able to
 * disagree with the others. `ADMIN_EMAILS` survives only as a sign-up-time
 * bootstrap (see the databaseHook in lib/auth.ts), never as a live check.
 */
export async function requireAdmin(
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction,
) {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: sign in required" });
  }
  if (!isAdminRole(user.role)) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }
  req.adminUserId = user.id;
  req.adminEmail = user.email;
  return next();
}

export async function checkAdminStatus(
  req: Request,
): Promise<{ signedIn: boolean; isAdmin: boolean; email?: string }> {
  const user = await getSessionUser(req);
  if (!user) return { signedIn: false, isAdmin: false };
  return { signedIn: true, isAdmin: isAdminRole(user.role), email: user.email };
}
