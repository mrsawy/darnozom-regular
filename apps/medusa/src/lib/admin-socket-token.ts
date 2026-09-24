import { createHmac } from "crypto"

// Signs the short-lived token the Medusa Admin order bell uses to join the
// storefront API's notification socket. Verified by
// apps/api/src/lib/admin-socket-token.ts — keep the format identical:
// "<expiresAtMs>.<base64url HMAC-SHA256 of 'darnozom-admin-socket.<expiresAtMs>'>".
export function signAdminSocketToken(secret: string, now: number, ttlMs: number): string {
  const expiresAt = now + ttlMs
  const sig = createHmac("sha256", secret)
    .update(`darnozom-admin-socket.${expiresAt}`)
    .digest("base64url")
  return `${expiresAt}.${sig}`
}
