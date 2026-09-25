import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkPartnerKey, requirePartnerKey, resetPartnerRateLimit, takeRateLimitToken } from "./partner-auth";

const KEY = "k_" + "x".repeat(40);

describe("checkPartnerKey", () => {
  it("accepts only the configured key", () => {
    expect(checkPartnerKey(KEY, KEY)).toBe("ok");
    expect(checkPartnerKey("wrong", KEY)).toBe("unauthorized");
    expect(checkPartnerKey(undefined, KEY)).toBe("unauthorized");
  });

  it("is off when no key (or a too-short key) is configured", () => {
    expect(checkPartnerKey(KEY, undefined)).toBe("not_configured");
    expect(checkPartnerKey("short", "short")).toBe("not_configured");
  });
});

describe("rate limit", () => {
  beforeEach(() => resetPartnerRateLimit());

  it("allows 60 requests a minute, then refills", () => {
    for (let i = 0; i < 60; i++) expect(takeRateLimitToken("k", 0)).toBe(true);
    expect(takeRateLimitToken("k", 0)).toBe(false);
    expect(takeRateLimitToken("k", 61_000)).toBe(true);
  });
});

describe("requirePartnerKey", () => {
  beforeEach(() => resetPartnerRateLimit());
  const res = () => {
    const r: any = {};
    r.status = vi.fn().mockReturnValue(r);
    r.json = vi.fn().mockReturnValue(r);
    return r;
  };

  it("stops unauthenticated requests with 401", () => {
    process.env.BOOKS_API_KEY = KEY;
    const r = res();
    expect(requirePartnerKey({ headers: {} } as any, r)).toBe(false);
    expect(r.status).toHaveBeenCalledWith(401);
  });

  it("lets a request with the key through", () => {
    process.env.BOOKS_API_KEY = KEY;
    expect(requirePartnerKey({ headers: { "x-api-key": KEY } } as any, res())).toBe(true);
  });
});
