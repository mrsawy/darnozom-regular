import { describe, it, expect, vi, beforeEach } from "vitest";

const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn() }));
vi.mock("../../../../../lib/save-book-profile", async (orig) => ({
  ...(await orig<typeof import("../../../../../lib/save-book-profile")>()),
  saveBookProfile: saveMock,
  makeSaveProfileDeps: () => ({}),
}));

import { GET, POST } from "./route";
import { BookProfileConflictError } from "../../../../../modules/book-catalog";
import { BookNotFoundError } from "../../../../../lib/save-book-profile";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}
const profileRow = { id: "bp_1", product_id: "prod_1", authors: ["A"] };
function fakeReq(body: unknown = {}) {
  const svc = { listBookProfiles: vi.fn(async () => [profileRow]) };
  return { params: { id: "prod_1" }, body, scope: { resolve: () => svc } } as any;
}

describe("/admin/books/:id/profile", () => {
  beforeEach(() => saveMock.mockReset());

  it("GET returns the stored profile", async () => {
    const res = fakeRes();
    await GET(fakeReq(), res);
    expect(res.json).toHaveBeenCalledWith({ profile: profileRow });
  });

  it("POST validates before saving", async () => {
    const res = fakeRes();
    await POST(fakeReq({ authors: [], language: "ar" }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("POST saves a valid profile", async () => {
    saveMock.mockResolvedValue(profileRow);
    const res = fakeRes();
    await POST(fakeReq({ authors: ["A"], language: "ar" }), res);
    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("POST maps conflicts to 409 and missing books to 404", async () => {
    saveMock.mockRejectedValueOnce(new BookProfileConflictError("isbn taken"));
    const r1 = fakeRes();
    await POST(fakeReq({ authors: ["A"], language: "ar" }), r1);
    expect(r1.status).toHaveBeenCalledWith(409);
    saveMock.mockRejectedValueOnce(new BookNotFoundError("prod_1"));
    const r2 = fakeRes();
    await POST(fakeReq({ authors: ["A"], language: "ar" }), r2);
    expect(r2.status).toHaveBeenCalledWith(404);
  });
});
