import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { expressInternalFetch } from "./express-internal";

describe("expressInternalFetch", () => {
  const env = { ...process.env };
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("returns null without a secret", async () => {
    delete process.env.BETTER_AUTH_BRIDGE_SECRET;
    delete process.env.ADMIN_SOCKET_NOTIFY_SECRET;
    expect(await expressInternalFetch("/api/x", {})).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts JSON with the bearer secret to DARNOZOM_API_URL", async () => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = "s3cret";
    process.env.DARNOZOM_API_URL = "http://api.test/";
    await expressInternalFetch("/api/internal/orders/5/mark-paid", { a: 1 });
    expect(fetch).toHaveBeenCalledWith("http://api.test/api/internal/orders/5/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer s3cret" },
      body: JSON.stringify({ a: 1 }),
    });
  });
});
