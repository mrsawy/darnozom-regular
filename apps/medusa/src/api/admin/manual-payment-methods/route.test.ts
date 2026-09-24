import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("GET /admin/manual-payment-methods", () => {
  it("returns all methods from listAllMethods", async () => {
    const methods = [{ id: "a", code: "vodafone_cash" }, { id: "b", code: "instapay" }];
    const listAllMethods = vi.fn().mockResolvedValue(methods);
    const res = fakeRes();
    await GET({ scope: { resolve: () => ({ listAllMethods }) } } as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ methods });
  });
});
