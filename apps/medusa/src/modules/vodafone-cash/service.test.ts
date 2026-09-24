import { describe, it, expect } from "vitest";
import VodafoneCashProviderService from "./service";

describe("VodafoneCashProviderService", () => {
  const service = new VodafoneCashProviderService({} as any, {});

  it("has the vodafone-cash identifier", () => {
    expect(VodafoneCashProviderService.identifier).toBe("vodafone-cash");
  });

  it("initiatePayment returns an id and empty data", async () => {
    const result = await service.initiatePayment({ amount: 25000, currency_code: "egp" } as any);
    expect(result).toEqual({ data: {}, id: expect.any(String) });
  });

  it("authorizePayment leaves the payment pending verification", async () => {
    const result = await service.authorizePayment({ data: { a: 1 } } as any);
    expect(result).toEqual({ data: { a: 1 }, status: "pending" });
  });

  it("getPaymentStatus is pending", async () => {
    expect((await service.getPaymentStatus({ data: {} } as any)).status).toBe("pending");
  });

  it("capturePayment passes data through", async () => {
    expect(await service.capturePayment({ data: { x: 1 } } as any)).toEqual({ data: { x: 1 } });
  });

  it("refunds are manual", async () => {
    await expect(service.refundPayment({ data: {}, amount: 1 } as any)).rejects.toThrow(
      /Vodafone Cash refunds must be processed manually/,
    );
  });

  it("does not support webhooks", async () => {
    expect(await service.getWebhookActionAndData({} as any)).toEqual({ action: "not_supported" });
  });
});
