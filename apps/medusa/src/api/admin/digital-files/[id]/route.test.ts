import { describe, it, expect, vi, beforeEach } from "vitest";

const { deleteMock } = vi.hoisted(() => ({ deleteMock: vi.fn() }));
vi.mock("../../../../lib/private-file-store", () => ({ deletePrivateFile: deleteMock }));

import { GET, POST, DELETE } from "./route";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const file = { id: "dbf_1", variant_id: "v1", relative_key: "book-files/v1/x-a.pdf", title: "A" };

function fakeReq(body: unknown = {}, found: any = file) {
  const svc = {
    listDigitalBookFiles: vi.fn(async () => (found ? [found] : [])),
    updateDigitalBookFiles: vi.fn(async (d: any) => ({ ...file, ...d })),
    deleteDigitalBookFiles: vi.fn(async () => undefined),
  };
  return { req: { params: { id: "dbf_1" }, body, scope: { resolve: () => svc } } as any, svc };
}

describe("/admin/digital-files/:id", () => {
  beforeEach(() => {
    deleteMock.mockReset().mockResolvedValue(undefined);
  });

  it("GET returns the file or 404", async () => {
    const res = fakeRes();
    await GET(fakeReq().req, res);
    expect(res.json).toHaveBeenCalledWith({ file });
    const res404 = fakeRes();
    await GET(fakeReq({}, null).req, res404);
    expect(res404.status).toHaveBeenCalledWith(404);
  });

  it("POST updates only title and sort_order", async () => {
    const { req, svc } = fakeReq({ title: "  Part 1 ", sort_order: 3, relative_key: "hack" });
    await POST(req, fakeRes());
    expect(svc.updateDigitalBookFiles).toHaveBeenCalledWith({
      id: "dbf_1",
      title: "Part 1",
      sort_order: 3,
    });
  });

  it("POST rejects an empty title", async () => {
    const { req, svc } = fakeReq({ title: "   " });
    const res = fakeRes();
    await POST(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(svc.updateDigitalBookFiles).not.toHaveBeenCalled();
  });

  it("DELETE removes the row and the stored object", async () => {
    const { req, svc } = fakeReq();
    const res = fakeRes();
    await DELETE(req, res);
    expect(svc.deleteDigitalBookFiles).toHaveBeenCalledWith("dbf_1");
    expect(deleteMock).toHaveBeenCalledWith("book-files/v1/x-a.pdf");
    expect(res.json).toHaveBeenCalledWith({ id: "dbf_1", deleted: true });
  });

  it("DELETE 404s for an unknown file", async () => {
    const { req, svc } = fakeReq({}, null);
    const res = fakeRes();
    await DELETE(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(svc.deleteDigitalBookFiles).not.toHaveBeenCalled();
  });
});
