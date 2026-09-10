import { logger } from "./logger";

// Live EGP→USD conversion used at PayPal payment time.
//
// The store displays EGP but PayPal is charged in USD. We must NEVER trust a
// client-supplied amount — the USD figure is always derived server-side from
// the authoritative EGP order total using a live exchange rate. If we cannot
// obtain a fresh rate we refuse to charge rather than guessing.

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
export async function getEgpToUsdRate(): Promise<number> {
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

export interface ConvertedAmount {
  usd: string; // fixed 2-decimal string, safe for PayPal `value`
  rate: number; // EGP→USD rate used
}

/**
 * Converts an EGP amount to USD using the live rate. Returns the USD string
 * (2 dp) and the rate used. Throws if the rate is unavailable or the result is
 * not a sane, positive amount.
 */
export async function convertEgpToUsd(egpAmount: number): Promise<ConvertedAmount> {
  if (!Number.isFinite(egpAmount) || egpAmount <= 0) {
    throw new Error("Invalid EGP amount for conversion");
  }
  const rate = await getEgpToUsdRate();
  const usdNum = egpAmount * rate;
  if (!Number.isFinite(usdNum) || usdNum <= 0) {
    throw new Error("Converted USD amount is invalid");
  }
  // PayPal rejects amounts below 0.01.
  const usd = Math.max(0.01, Math.round(usdNum * 100) / 100).toFixed(2);
  return { usd, rate };
}
