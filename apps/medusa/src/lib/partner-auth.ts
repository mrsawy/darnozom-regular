import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { createHash, timingSafeEqual } from "crypto";

// Auth for the ChatGPT "partner" API (/partner/*): one secret key in
// BOOKS_API_KEY, sent by the Custom GPT Action as the x-api-key header.
const MIN_KEY_LENGTH = 32;
const LIMIT = 60;
const WINDOW_MS = 60_000;

const digest = (s: string) => createHash("sha256").update(s).digest();

export function checkPartnerKey(header: string | undefined, configured: string | undefined): "ok" | "not_configured" | "unauthorized" {
  if (!configured || configured.length < MIN_KEY_LENGTH) return "not_configured";
  if (!header) return "unauthorized";
  return timingSafeEqual(digest(header), digest(configured)) ? "ok" : "unauthorized";
}

const buckets = new Map<string, { tokens: number; at: number }>();

export function takeRateLimitToken(key: string, now = Date.now()): boolean {
  const b = buckets.get(key) ?? { tokens: LIMIT, at: now };
  const refill = Math.floor(((now - b.at) / WINDOW_MS) * LIMIT);
  if (refill > 0) {
    b.tokens = Math.min(LIMIT, b.tokens + refill);
    b.at = now;
  }
  if (b.tokens <= 0) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

export function resetPartnerRateLimit(): void {
  buckets.clear();
}

export function requirePartnerKey(req: MedusaRequest, res: MedusaResponse): boolean {
  const header = req.headers["x-api-key"];
  const given = Array.isArray(header) ? header[0] : header;
  const state = checkPartnerKey(given, process.env.BOOKS_API_KEY?.trim());
  if (state === "not_configured") {
    res.status(503).json({ message: "The books API is not enabled on this server (BOOKS_API_KEY is not set)." });
    return false;
  }
  if (state === "unauthorized") {
    res.status(401).json({ message: "Missing or invalid x-api-key" });
    return false;
  }
  if (!takeRateLimitToken(given!)) {
    res.status(429).json({ message: "Too many requests — at most 60 per minute. Wait a minute and retry." });
    return false;
  }
  return true;
}
