import { getAuth } from "@clerk/express";
import type { Request } from "express";

/**
 * Clerk needs BOTH keys server-side. When either is missing, `clerkMiddleware()`
 * throws on every request — which would take down public routes and the
 * `/api/healthz` deploy gate on a deployment that simply has not provisioned
 * auth yet. So the middleware is mounted conditionally (see app.ts) and auth
 * lookups go through `safeGetAuth` below.
 */
export const isClerkConfigured: boolean =
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(process.env.CLERK_PUBLISHABLE_KEY);

type ClerkAuth = ReturnType<typeof getAuth> | null;

/**
 * Returns the Clerk auth object, or null when Clerk is not configured (or the
 * middleware is not mounted). Callers treat null as "not signed in", so
 * protected routes answer 401 instead of crashing with a 500.
 */
export function safeGetAuth(req: Request): ClerkAuth {
  if (!isClerkConfigured) return null;
  try {
    return getAuth(req);
  } catch {
    return null;
  }
}
