import { describe, it, expect } from "vitest";
import InstapayProviderService from "./service";

describe("InstapayProviderService", () => {
  const service = new InstapayProviderService({} as any, {});

  it("has the instapay identifier", () => {
    expect(InstapayProviderService.identifier).toBe("instapay");
  });

  it("authorizePayment leaves the payment pending verification", async () => {
    const result = await service.authorizePayment({ data: {} } as any);
    expect(result.status).toBe("pending");
  });

  it("refunds are manual", async () => {
    await expect(service.refundPayment({ data: {}, amount: 1 } as any)).rejects.toThrow(
      /InstaPay refunds must be processed manually/,
    );
  });
});
