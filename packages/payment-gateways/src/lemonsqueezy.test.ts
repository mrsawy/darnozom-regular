import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLemonSqueezyCheckout, verifyLemonSqueezyWebhookSignature } from "./lemonsqueezy";

describe("lemonsqueezy client", () => {
  beforeEach(() => {
    process.env.LEMONSQUEEZY_API_KEY = "test-key";
    process.env.LEMONSQUEEZY_STORE_ID = "12345";
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "whsec_test";
  });

  it("createLemonSqueezyCheckout posts to the Lemon Squeezy checkouts API and returns the hosted url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "chk_123",
          attributes: { url: "https://darnozom.lemonsqueezy.com/checkout/chk_123" },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createLemonSqueezyCheckout({
      variantId: "ls_variant_1",
      amountCents: 15000,
      customerEmail: "buyer@example.com",
      redirectUrl: "https://darnozom.com/checkout-lemonsqueezy-return",
    });

    expect(result).toEqual({
      checkoutId: "chk_123",
      checkoutUrl: "https://darnozom.lemonsqueezy.com/checkout/chk_123",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lemonsqueezy.com/v1/checkouts",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("verifyLemonSqueezyWebhookSignature validates an HMAC-SHA256 signature", () => {
    const crypto = require("crypto");
    const rawBody = JSON.stringify({ meta: { event_name: "order_created" } });
    const validSignature = crypto
      .createHmac("sha256", "whsec_test")
      .update(rawBody)
      .digest("hex");

    expect(verifyLemonSqueezyWebhookSignature(rawBody, validSignature)).toBe(true);
    expect(verifyLemonSqueezyWebhookSignature(rawBody, "wrong")).toBe(false);
    expect(verifyLemonSqueezyWebhookSignature(rawBody, undefined)).toBe(false);
  });
});
