import { timingSafeEqual } from "node:crypto";

/** Medusa → Express server-to-server auth (Authorization: Bearer <secret>). */
export function isValidBridgeSecret(authorizationHeader: string | undefined): boolean {
  const secret =
    process.env.BETTER_AUTH_BRIDGE_SECRET?.trim() ||
    process.env.ADMIN_SOCKET_NOTIFY_SECRET?.trim();
  const auth = authorizationHeader?.trim() ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!secret || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
