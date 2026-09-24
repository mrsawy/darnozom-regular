import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("GET /admin/digital-files", () => {
  it("lists files for one or many variant_id query values", async () => {
    const listFilesForVariants = vi.fn().mockResolvedValue([{ id: "f1" }]);
    const scope = { resolve: () => ({ listFilesForVariants }) };
    const res = fakeRes();
    await GET({ query: { variant_id: ["v1", "v2"] }, scope } as any, res);
    expect(listFilesForVariants).toHaveBeenCalledWith(["v1", "v2"]);
    expect(res.json).toHaveBeenCalledWith({ files: [{ id: "f1" }] });

    await GET({ query: { variant_id: "v3" }, scope } as any, fakeRes());
    expect(listFilesForVariants).toHaveBeenLastCalledWith(["v3"]);
  });

  it("400s without variant_id", async () => {
    const res = fakeRes();
    await GET({ query: {}, scope: { resolve: () => ({}) } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
