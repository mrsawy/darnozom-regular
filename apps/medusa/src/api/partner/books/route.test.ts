import { describe, it, expect, vi, beforeEach } from "vitest";

const { upsertMock } = vi.hoisted(() => ({ upsertMock: vi.fn() }));
vi.mock("../../../lib/partner-books", async (orig) => ({
  ...(await orig<typeof import("../../../lib/partner-books")>()),
  upsertPartnerBook: upsertMock,
  makePartnerDeps: () => ({}),
}));

import { POST } from "./route";
import { PartnerError } from "../../../lib/partner-books";
import { resetPartnerRateLimit } from "../../../lib/partner-auth";

const KEY = "k_" + "y".repeat(40);
function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("POST /partner/books", () => {
  beforeEach(() => {
    process.env.BOOKS_API_KEY = KEY;
    resetPartnerRateLimit();
    upsertMock.mockReset();
  });

  it("requires the API key", async () => {
    const res = fakeRes();
    await POST({ headers: {}, body: {}, scope: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns 201 for a new draft and 200 for an update", async () => {
    upsertMock.mockResolvedValueOnce({ status: "created", product_id: "p1" });
    const r1 = fakeRes();
    await POST({ headers: { "x-api-key": KEY }, body: {}, scope: {} } as any, r1);
    expect(r1.status).toHaveBeenCalledWith(201);
    upsertMock.mockResolvedValueOnce({ status: "updated", product_id: "p1" });
    const r2 = fakeRes();
    await POST({ headers: { "x-api-key": KEY }, body: {}, scope: {} } as any, r2);
    expect(r2.status).toHaveBeenCalledWith(200);
  });

  it("passes PartnerError status and message through", async () => {
    upsertMock.mockRejectedValue(new PartnerError(409, "already published"));
    const res = fakeRes();
    await POST({ headers: { "x-api-key": KEY }, body: {}, scope: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "already published", errors: undefined });
  });
});
