import { describe, it, expect } from "vitest";
import CodProviderService from "./service";

describe("CodProviderService", () => {
  const service = new CodProviderService({} as any, {});

  it("initiatePayment returns a pending session with no external id", async () => {
    const result = await service.initiatePayment({ amount: 50000, currency_code: "egp" } as any);
    expect(result).toEqual({ data: {}, id: expect.any(String) });
  });

  it("authorizePayment always authorizes immediately", async () => {
    const result = await service.authorizePayment({ data: {} } as any);
    expect(result.status).toBe("authorized");
  });

  it("capturePayment marks captured (COD is captured on delivery confirmation, not at checkout)", async () => {
    const result = await service.capturePayment({ data: {} } as any);
    expect(result.data).toEqual({});
  });
});
