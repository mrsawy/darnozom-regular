import { describe, it, expect, vi } from "vitest";
import LemonSqueezyProviderService from "./service";
import * as gateways from "../../lib/medusa-payment-gateways";

describe("LemonSqueezyProviderService", () => {
  it("initiatePayment requires a Lemon Squeezy variant id in context data", async () => {
    const service = new LemonSqueezyProviderService({} as any, {});
    await expect(
      service.initiatePayment({
        amount: 15000,
        currency_code: "usd",
        data: {},
        context: { customer: { email: "buyer@example.com" } },
      } as any),
    ).rejects.toThrow(/lemon squeezy variant/i);
  });

  it("initiatePayment creates a hosted checkout and returns its url", async () => {
    vi.spyOn(gateways, "createLemonSqueezyCheckout").mockResolvedValue({
      checkoutId: "chk_1",
      checkoutUrl: "https://darnozom.lemonsqueezy.com/checkout/chk_1",
    });

    const service = new LemonSqueezyProviderService({} as any, {});
    const result = await service.initiatePayment({
      amount: 15000,
      currency_code: "usd",
      data: { lemonSqueezyVariantId: "ls_variant_1", redirectUrl: "https://darnozom.com/checkout-lemonsqueezy-return" },
      context: { customer: { email: "buyer@example.com" } },
    } as any);

    expect(result.data.checkoutUrl).toBe("https://darnozom.lemonsqueezy.com/checkout/chk_1");
  });

  it("getWebhookActionAndData maps order_created to captured", async () => {
    vi.spyOn(gateways, "verifyLemonSqueezyWebhookSignature").mockResolvedValue(true);

    const service = new LemonSqueezyProviderService({} as any, {});
    const result = await service.getWebhookActionAndData({
      data: {
        rawData: JSON.stringify({ meta: { event_name: "order_created" }, data: { id: "chk_1" } }),
        headers: { "x-signature": "sig" },
      },
    } as any);

    expect(result.action).toBe("captured");
  });
});
