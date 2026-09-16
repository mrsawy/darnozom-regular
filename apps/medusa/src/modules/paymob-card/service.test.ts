import { describe, it, expect, vi } from "vitest";
import PaymobCardProviderService from "./service";
import * as gateways from "../../lib/medusa-payment-gateways";

describe("PaymobCardProviderService", () => {
  it("initiatePayment creates a Paymob checkout and stores the order id + checkout url", async () => {
    vi.spyOn(gateways, "createPaymobCheckout").mockResolvedValue({
      paymobOrderId: "pmb_order_1",
      checkoutUrl: "https://accept.paymob.com/iframe/xyz",
    });

    const service = new PaymobCardProviderService({} as any, {});
    const result = await service.initiatePayment({
      amount: 35000, // 350.00 EGP in minor units
      currency_code: "egp",
      data: { merchantOrderId: "order_1" },
      context: {
        customer: { email: "buyer@example.com", first_name: "Test", last_name: "Buyer" },
      },
    } as any);

    expect(result.data).toEqual({
      paymobOrderId: "pmb_order_1",
      checkoutUrl: "https://accept.paymob.com/iframe/xyz",
    });
  });

  it("getWebhookActionAndData returns captured when HMAC verifies and success=true", async () => {
    vi.spyOn(gateways, "verifyPaymobWebhookHmac").mockResolvedValue(true);

    const service = new PaymobCardProviderService({} as any, {});
    const result = await service.getWebhookActionAndData({
      data: {
        obj: { id: "txn_1", success: true, order: { id: "pmb_order_1" } },
        hmac: "abc123",
      },
    } as any);

    expect(result.action).toBe("captured");
  });

  it("getWebhookActionAndData returns failed with the decline reason when success=false", async () => {
    vi.spyOn(gateways, "verifyPaymobWebhookHmac").mockResolvedValue(true);
    vi.spyOn(gateways, "extractPaymobDeclineReason").mockResolvedValue("PAYMOB_DECLINED: Do not honour (code 05)");

    const service = new PaymobCardProviderService({} as any, {});
    const result = await service.getWebhookActionAndData({
      data: {
        obj: { id: "txn_1", success: false, order: { id: "pmb_order_1" } },
        hmac: "abc123",
      },
    } as any);

    expect(result.action).toBe("failed");
  });
});
