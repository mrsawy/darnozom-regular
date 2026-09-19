import { describe, it, expect, vi } from "vitest";
import PaypalEgpProviderService from "./service";
import * as gateways from "../../lib/medusa-payment-gateways";

describe("PaypalEgpProviderService", () => {
  it("initiatePayment converts EGP to USD and stores the rate used", async () => {
    vi.spyOn(gateways, "fetchEgpToUsdRate").mockResolvedValue(0.0204);
    vi.spyOn(gateways, "convertEgpToUsd").mockResolvedValue("7.14");
    vi.spyOn(gateways, "createPayPalOrder").mockResolvedValue({
      id: "pp_order_1",
      approveUrl: "https://paypal.com/checkoutnow?token=pp_order_1",
    } as any);

    const service = new PaypalEgpProviderService({} as any, {});
    const result = await service.initiatePayment({
      amount: 35000, // 350.00 EGP
      currency_code: "egp",
      data: {
        returnUrl: "https://darnozom.com/checkout-paypal-return",
        cancelUrl: "https://darnozom.com/cart",
      },
      context: {},
    } as any);

    expect(gateways.fetchEgpToUsdRate).toHaveBeenCalledTimes(1);
    expect(gateways.convertEgpToUsd).toHaveBeenCalledWith(350, 0.0204);
    expect(result.data.exchangeRate).toBe(0.0204);
    expect(result.data.usdAmount).toBe("7.14");
    expect(result.data.paypalOrderId).toBe("pp_order_1");
    expect(result.data.approveUrl).toBe(
      "https://paypal.com/checkoutnow?token=pp_order_1",
    );
    expect(result.id).toBe("pp_order_1");
  });

  it("initiatePayment throws when returnUrl/cancelUrl are missing", async () => {
    vi.spyOn(gateways, "fetchEgpToUsdRate").mockResolvedValue(0.0204);
    vi.spyOn(gateways, "convertEgpToUsd").mockResolvedValue("7.14");

    const service = new PaypalEgpProviderService({} as any, {});
    await expect(
      service.initiatePayment({
        amount: 35000,
        currency_code: "egp",
        data: {},
        context: {},
      } as any),
    ).rejects.toThrow(/returnUrl|cancelUrl/i);
  });

  it("authorizePayment captures the PayPal order and returns authorized on success", async () => {
    vi.spyOn(gateways, "capturePayPalOrder").mockResolvedValue({
      captured: true,
      captureId: "cap_1",
      status: "COMPLETED",
    } as any);

    const service = new PaypalEgpProviderService({} as any, {});
    const result = await service.authorizePayment({
      data: { paypalOrderId: "pp_order_1" },
      context: {},
    } as any);

    expect(result.status).toBe("authorized");
    expect((result.data as any).paypalCaptureId).toBe("cap_1");
  });

  it("authorizePayment returns error status when the capture did not complete", async () => {
    vi.spyOn(gateways, "capturePayPalOrder").mockResolvedValue({
      captured: false,
      captureId: null,
      status: "FAILED",
    } as any);

    const service = new PaypalEgpProviderService({} as any, {});
    const result = await service.authorizePayment({
      data: { paypalOrderId: "pp_order_1" },
      context: {},
    } as any);

    expect(result.status).toBe("error");
  });

  it("refundPayment always throws (manual refunds only)", async () => {
    const service = new PaypalEgpProviderService({} as any, {});
    await expect(service.refundPayment({} as any)).rejects.toThrow(
      /manually via the PayPal dashboard/,
    );
  });

  it("getWebhookActionAndData always throws (no webhook flow)", async () => {
    const service = new PaypalEgpProviderService({} as any, {});
    await expect(
      service.getWebhookActionAndData({ data: {} } as any),
    ).rejects.toThrow(/does not use webhooks/);
  });

  it("updatePayment is a no-op passthrough", async () => {
    const service = new PaypalEgpProviderService({} as any, {});
    const result = await service.updatePayment({
      data: { paypalOrderId: "pp_order_1" },
      context: {},
    } as any);

    expect(result.data).toEqual({ paypalOrderId: "pp_order_1" });
  });
});
