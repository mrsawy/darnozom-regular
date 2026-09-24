import { describe, it, expect } from "vitest";
import { signAdminSocketToken, verifyAdminSocketToken } from "./admin-socket-token";

const SECRET = "test-secret";

describe("admin socket token", () => {
  it("verifies a token it signed until it expires", () => {
    const now = 1_800_000_000_000;
    const token = signAdminSocketToken(SECRET, now, 60_000);
    expect(verifyAdminSocketToken(token, SECRET, now + 59_000)).toBe(true);
    expect(verifyAdminSocketToken(token, SECRET, now + 61_000)).toBe(false);
  });

  it("rejects a token signed with another secret or tampered with", () => {
    const now = 1_800_000_000_000;
    const token = signAdminSocketToken(SECRET, now, 60_000);
    expect(verifyAdminSocketToken(token, "other", now)).toBe(false);
    const [exp, sig] = token.split(".");
    expect(verifyAdminSocketToken(`${Number(exp) + 1000}.${sig}`, SECRET, now)).toBe(false);
    expect(verifyAdminSocketToken("garbage", SECRET, now)).toBe(false);
    expect(verifyAdminSocketToken(undefined, SECRET, now)).toBe(false);
    expect(verifyAdminSocketToken(token, "", now)).toBe(false);
  });

  // Medusa signs these (apps/medusa/src/lib/admin-socket-token.ts); both
  // sides must produce this exact value.
  it("matches the shared format: <expiresAtMs>.<base64url HMAC-SHA256>", () => {
    expect(signAdminSocketToken("s3cret", 1_000, 5_000)).toBe("6000.VgeTUhDicaSsOe7I4BVNe-37OpwtxTQ6RVz4FIPM-zU");
  });
});
