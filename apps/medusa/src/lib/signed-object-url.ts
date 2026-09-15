// apps/medusa/src/lib/signed-object-url.ts
import crypto from "crypto";

interface SignedPayload {
  relativeKey: string;
  exp: number; // unix seconds
}

function getSecret(): string {
  const secret = process.env.MEDUSA_JWT_SECRET;
  if (!secret) throw new Error("MEDUSA_JWT_SECRET is not set");
  return secret;
}

function sign(payload: SignedPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${hmac}`;
}

export function createSignedObjectUrl(input: {
  relativeKey: string;
  ttlSeconds: number;
}): { token: string; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + input.ttlSeconds;
  const token = sign({ relativeKey: input.relativeKey, exp });
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifySignedObjectToken(token: string): { relativeKey: string } {
  const [body, mac] = token.split(".");
  if (!body || !mac) throw new Error("Malformed token");

  const expectedMac = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  const macBuffer = Buffer.from(mac);
  const expectedBuffer = Buffer.from(expectedMac);
  if (
    macBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(macBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid token signature");
  }

  const payload: SignedPayload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
  if (Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error("Token expired");
  }
  return { relativeKey: payload.relativeKey };
}
