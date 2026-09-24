import { afterEach, describe, expect, it } from "vitest";
import { isValidBridgeSecret } from "./bridge-secret";

describe("isValidBridgeSecret", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("accepts the exact bearer secret", () => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = "abc";
    expect(isValidBridgeSecret("Bearer abc")).toBe(true);
  });

  it("rejects wrong, missing, or different-length tokens", () => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = "abc";
    expect(isValidBridgeSecret("Bearer abd")).toBe(false);
    expect(isValidBridgeSecret("Bearer abcd")).toBe(false);
    expect(isValidBridgeSecret(undefined)).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    delete process.env.BETTER_AUTH_BRIDGE_SECRET;
    delete process.env.ADMIN_SOCKET_NOTIFY_SECRET;
    expect(isValidBridgeSecret("Bearer ")).toBe(false);
  });
});
