import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function fakeReq(code: string, body: unknown, upsertMethod = vi.fn()) {
  return { params: { code }, body, scope: { resolve: () => ({ upsertMethod }) } } as any;
}

describe("POST /admin/manual-payment-methods/:code", () => {
  it("upserts a valid patch", async () => {
    const upsertMethod = vi
      .fn()
      .mockResolvedValue({ id: "a", code: "vodafone_cash", account_number: "01012345678" });
    const res = fakeRes();
    await POST(fakeReq("vodafone_cash", { account_number: "01012345678" }, upsertMethod), res);
    expect(upsertMethod).toHaveBeenCalledWith("vodafone_cash", { account_number: "01012345678" });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects an unknown code", async () => {
    const upsertMethod = vi.fn();
    const res = fakeRes();
    await POST(fakeReq("cod", {}, upsertMethod), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(upsertMethod).not.toHaveBeenCalled();
  });

  it("rejects an invalid patch", async () => {
    const upsertMethod = vi.fn();
    const res = fakeRes();
    await POST(fakeReq("instapay", { qr_image_url: "ftp://x" }, upsertMethod), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(upsertMethod).not.toHaveBeenCalled();
  });
});
