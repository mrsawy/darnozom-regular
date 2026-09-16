import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";
import * as signedUrl from "../../../../lib/signed-object-url";
import * as objectStore from "../../../../lib/medusa-object-store";

function fakeReq(query: Record<string, string>) {
  return { query } as any;
}
function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn();
  res.pipe = vi.fn();
  return res;
}

describe("GET /store/digital-products/download", () => {
  it("returns 400 when token is missing", async () => {
    const res = fakeRes();
    await GET(fakeReq({}), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 403 when the token is invalid or expired", async () => {
    vi.spyOn(signedUrl, "verifySignedObjectToken").mockImplementation(() => {
      throw new Error("Token expired");
    });
    const res = fakeRes();
    await GET(fakeReq({ token: "bad" }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("streams the file when the token is valid", async () => {
    vi.spyOn(signedUrl, "verifySignedObjectToken").mockReturnValue({
      relativeKey: "books/digital/42.pdf",
    });
    const fakeStream = { pipe: vi.fn() };
    vi.spyOn(objectStore, "openPrivateObjectStream").mockResolvedValue(fakeStream as any);

    const res = fakeRes();
    await GET(fakeReq({ token: "good" }), res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(fakeStream.pipe).toHaveBeenCalledWith(res);
  });
});
