import { describe, it, expect, vi } from "vitest";
import PaymobWalletProviderService from "./service";
import * as gateways from "../../lib/medusa-payment-gateways";

describe("PaymobWalletProviderService", () => {
  it("initiatePayment requires a wallet phone number in context data", async () => {
    const service = new PaymobWalletProviderService({} as any, {});
    await expect(
      service.initiatePayment({
        amount: 15000,
        currency_code: "egp",
        data: {},
        context: { customer: { email: "buyer@example.com" } },
      } as any),
    ).rejects.toThrow(/wallet phone/i);
  });

  it("initiatePayment creates a wallet payment and returns the redirect url", async () => {
    vi.spyOn(gateways, "createPaymobWalletPayment").mockResolvedValue({
      paymobOrderId: "pmb_order_2",
      redirectUrl: "https://accept.paymob.com/wallet/redirect",
    });

    const service = new PaymobWalletProviderService({} as any, {});
    const result = await service.initiatePayment({
      amount: 15000,
      currency_code: "egp",
      data: { merchantOrderId: "order_2", walletPhone: "01012345678" },
      context: { customer: { email: "buyer@example.com" } },
    } as any);

    expect(result.data).toEqual({
      paymobOrderId: "pmb_order_2",
      redirectUrl: "https://accept.paymob.com/wallet/redirect",
      merchantOrderId: "order_2",
    });
  });

  it("updatePayment re-mints a wallet redirect url when paymobOrderId and walletPhone are known", async () => {
    vi.spyOn(gateways, "createPaymobWalletRedirectForExistingOrder").mockResolvedValue(
      "https://accept.paymob.com/wallet/redirect-fresh",
    );

    const service = new PaymobWalletProviderService({} as any, {});
    const result = await service.updatePayment({
      amount: 15000,
      currency_code: "egp",
      data: { paymobOrderId: "pmb_order_2", walletPhone: "01012345678", merchantOrderId: "order_2" },
      context: { customer: { email: "buyer@example.com" } },
    } as any);

    expect(result.data).toEqual({
      paymobOrderId: "pmb_order_2",
      walletPhone: "01012345678",
      merchantOrderId: "order_2",
      redirectUrl: "https://accept.paymob.com/wallet/redirect-fresh",
    });
  });

  it("updatePayment passes through when there is not enough data to re-mint", async () => {
    const service = new PaymobWalletProviderService({} as any, {});
    const result = await service.updatePayment({
      amount: 15000,
      currency_code: "egp",
      data: {},
      context: {},
    } as any);

    expect(result.data).toEqual({});
  });

  it("getWebhookActionAndData returns captured when HMAC verifies and success=true", async () => {
    vi.spyOn(gateways, "verifyPaymobWebhookHmac").mockResolvedValue(true);

    const service = new PaymobWalletProviderService({} as any, {});
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
    vi.spyOn(gateways, "extractPaymobDeclineReason").mockResolvedValue(
      "PAYMOB_DECLINED: Do not honour (code 05)",
    );

    const service = new PaymobWalletProviderService({} as any, {});
    const result = await service.getWebhookActionAndData({
      data: {
        obj: { id: "txn_1", success: false, order: { id: "pmb_order_1" } },
        hmac: "abc123",
      },
    } as any);

    expect(result.action).toBe("failed");
  });
});
