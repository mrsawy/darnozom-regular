// apps/medusa/src/lib/signed-object-url.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSignedObjectUrl, verifySignedObjectToken } from "./signed-object-url";

describe("signed-object-url", () => {
  const originalSecret = process.env.MEDUSA_JWT_SECRET;
  beforeEach(() => {
    process.env.MEDUSA_JWT_SECRET = "test-secret";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T00:00:00Z"));
  });
  afterEach(() => {
    process.env.MEDUSA_JWT_SECRET = originalSecret;
    vi.useRealTimers();
  });

  it("creates a token that verifies to the same relativeKey before expiry", () => {
    const { token, expiresAt } = createSignedObjectUrl({
      relativeKey: "books/digital/42.pdf",
      ttlSeconds: 300,
    });

    expect(expiresAt).toBe("2026-09-15T00:05:00.000Z");

    const verified = verifySignedObjectToken(token);
    expect(verified).toEqual({ relativeKey: "books/digital/42.pdf" });
  });

  it("rejects an expired token", () => {
    const { token } = createSignedObjectUrl({
      relativeKey: "books/digital/42.pdf",
      ttlSeconds: 300,
    });

    vi.setSystemTime(new Date("2026-09-15T00:05:01Z"));

    expect(() => verifySignedObjectToken(token)).toThrow(/expired/i);
  });

  it("rejects a tampered token", () => {
    const { token } = createSignedObjectUrl({
      relativeKey: "books/digital/42.pdf",
      ttlSeconds: 300,
    });
    const tampered = token.slice(0, -2) + "xx";
    expect(() => verifySignedObjectToken(tampered)).toThrow();
  });
});
