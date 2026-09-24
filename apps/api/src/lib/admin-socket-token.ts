import { createHmac, timingSafeEqual } from "node:crypto";

// Short-lived token that lets the Medusa Admin bell join the order
// notifications socket. Medusa Admin runs on another origin, so it can't send
// the storefront session cookie; Medusa signs this with the shared
// BETTER_AUTH_BRIDGE_SECRET instead (apps/medusa/src/lib/admin-socket-token.ts).
// Format: "<expiresAtMs>.<base64url HMAC-SHA256 of 'darnozom-admin-socket.<expiresAtMs>'>".

function signature(secret: string, expiresAt: number): string {
  return createHmac("sha256", secret)
    .update(`darnozom-admin-socket.${expiresAt}`)
    .digest("base64url");
}

export function signAdminSocketToken(secret: string, now: number, ttlMs: number): string {
  const expiresAt = now + ttlMs;
  return `${expiresAt}.${signature(secret, expiresAt)}`;
}

export function verifyAdminSocketToken(
  token: unknown,
  secret: string | undefined,
  now = Date.now(),
): boolean {
  if (!secret || typeof token !== "string") return false;
  const [exp, sig, extra] = token.split(".");
  const expiresAt = Number(exp);
  if (extra !== undefined || !sig || !Number.isSafeInteger(expiresAt) || expiresAt < now) {
    return false;
  }
  const expected = Buffer.from(signature(secret, expiresAt));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
