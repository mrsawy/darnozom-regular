import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

/**
 * Anonymous reader identity for likes and comments: a random id in a signed, httpOnly cookie.
 * Stored as "guest:<uuid>" wherever a user id is expected, so it can never collide with a real
 * (Better Auth) user id. Clearing cookies creates a new guest; the old likes stay but become unreachable.
 */
export const GUEST_COOKIE = "dn_guest";
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const secret = () => process.env.BETTER_AUTH_SECRET || "dev-only-guest-secret";
const sign = (id: string) => createHmac("sha256", secret()).update(id).digest("base64url");

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

/** Returns "guest:<uuid>" for a valid cookie, otherwise null. */
export function readGuestId(req: Request): string | null {
  const raw = readCookie(req, GUEST_COOKIE);
  if (!raw) return null;
  const [id, mac] = raw.split(".");
  if (!id || !mac || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(id));
  return a.length === b.length && timingSafeEqual(a, b) ? `guest:${id}` : null;
}

export function issueGuest(res: Response): string {
  const id = randomUUID();
  res.cookie(GUEST_COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_MS,
    path: "/",
  });
  return `guest:${id}`;
}

export const isGuestId = (id: string) => id.startsWith("guest:");
