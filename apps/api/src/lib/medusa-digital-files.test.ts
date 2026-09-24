import { afterEach, describe, expect, it, vi } from "vitest";

const { medusaAdminMock } = vi.hoisted(() => ({ medusaAdminMock: vi.fn() }));
vi.mock("./medusa-admin", () => ({ medusaAdmin: medusaAdminMock }));

const { listDigitalFilesForVariants, getDigitalFile } = await import("./medusa-digital-files");

afterEach(() => medusaAdminMock.mockReset());

describe("listDigitalFilesForVariants", () => {
  it("does not call Medusa for an empty list", async () => {
    expect(await listDigitalFilesForVariants([])).toEqual([]);
    expect(medusaAdminMock).not.toHaveBeenCalled();
  });

  it("asks Medusa for all variants in one request", async () => {
    medusaAdminMock.mockResolvedValue({ files: [{ id: "f1" }] });
    expect(await listDigitalFilesForVariants(["v1", "v 2"])).toEqual([{ id: "f1" }]);
    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/digital-files?variant_id=v1&variant_id=v%202");
  });
});

describe("getDigitalFile", () => {
  it("returns the file", async () => {
    medusaAdminMock.mockResolvedValue({ file: { id: "f1" } });
    expect(await getDigitalFile("f1")).toEqual({ id: "f1" });
    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/digital-files/f1");
  });

  it("returns null on a Medusa 404 and rethrows other errors", async () => {
    medusaAdminMock.mockRejectedValueOnce(new Error("Medusa admin GET /admin/digital-files/x failed (404): {}"));
    expect(await getDigitalFile("x")).toBeNull();
    medusaAdminMock.mockRejectedValueOnce(new Error("Medusa admin GET /admin/digital-files/x failed (500): boom"));
    await expect(getDigitalFile("x")).rejects.toThrow(/500/);
  });
});
