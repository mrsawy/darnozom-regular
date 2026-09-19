import { logger } from "./logger.js";

// Live EGP→USD conversion used at PayPal payment time.
//
// The store displays EGP but PayPal is charged in USD. We must NEVER trust a
// client-supplied amount — the USD figure is always derived server-side from
// the authoritative EGP order total using a live exchange rate. If we cannot
// obtain a fresh rate we refuse to charge rather than guessing.
//
// Moved here from apps/api/src/lib/currency.ts (getEgpToUsdRate /
// convertEgpToUsd) as part of the paypal-egp Medusa payment provider
// extraction — same rate source, caching, and staleness rules as the
// original Express implementation, renamed to match the shape the Medusa
// provider and its tests expect (fetchEgpToUsdRate / a synchronous
// convertEgpToUsd(egp, rate)).

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

// Cache the rate for a short window so a burst of checkouts doesn't hammer the
// upstream API, while still keeping the figure reasonably fresh.
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
// Hard ceiling: never use a cached rate older than this, even as a fallback.
const MAX_STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

let cache: CachedRate | null = null;

async function fetchRateFromApi(): Promise<number | null> {
  // Free, no-key endpoint. Returns { rates: { USD: <number>, ... } } for EGP base.
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EGP", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "currency: rate API non-ok");
      return null;
    }
    const body = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    const usd = body?.rates?.USD;
    if (body?.result === "success" && typeof usd === "number" && usd > 0) {
      return usd;
    }
    logger.warn({ result: body?.result }, "currency: rate API malformed");
    return null;
  } catch (err) {
    logger.warn({ err }, "currency: rate API fetch failed");
    return null;
  }
}

/**
 * Returns the number of USD per 1 EGP. Throws if no fresh-enough rate can be
 * obtained (so the caller refuses to charge instead of using a bad rate).
 */
export async function fetchEgpToUsdRate(): Promise<number> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rate;
  }
  const fresh = await fetchRateFromApi();
  if (fresh != null) {
    cache = { rate: fresh, fetchedAt: now };
    return fresh;
  }
  // Fall back to a recent cached value if we have one within the stale ceiling.
  if (cache && now - cache.fetchedAt < MAX_STALE_MS) {
    logger.warn("currency: using stale cached EGP→USD rate");
    return cache.rate;
  }
  throw new Error("Unable to obtain a live EGP→USD exchange rate");
}

/**
 * Converts an EGP amount to a USD amount string (2 dp, safe for PayPal
 * `value`) given an already-fetched EGP→USD rate. Throws if the inputs or
 * the resulting amount are not sane/positive.
 */
export function convertEgpToUsd(egp: number, rate: number): string {
  if (!Number.isFinite(egp) || egp <= 0) {
    throw new Error("Invalid EGP amount for conversion");
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Invalid EGP→USD rate for conversion");
  }
  const usdNum = egp * rate;
  if (!Number.isFinite(usdNum) || usdNum <= 0) {
    throw new Error("Converted USD amount is invalid");
  }
  // PayPal rejects amounts below 0.01.
  return Math.max(0.01, Math.round(usdNum * 100) / 100).toFixed(2);
}
