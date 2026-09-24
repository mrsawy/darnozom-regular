import { describe, it, expect, vi } from "vitest";
import DigitalProductModuleService from "./service";

// Generated CRUD needs a DB; stub it on a bare instance and test our logic.
function makeService(listDigitalBookFiles = vi.fn()) {
  const svc = Object.create(DigitalProductModuleService.prototype) as any;
  svc.listDigitalBookFiles = listDigitalBookFiles;
  return svc as DigitalProductModuleService & Record<string, any>;
}

describe("DigitalProductModuleService.listFilesForVariants", () => {
  it("returns [] without querying when no variant ids are given", async () => {
    const list = vi.fn();
    expect(await makeService(list).listFilesForVariants([])).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  it("lists the variants' files in display order", async () => {
    const rows = [{ id: "f1", variant_id: "v1" }];
    const list = vi.fn().mockResolvedValue(rows);
    expect(await makeService(list).listFilesForVariants(["v1", "v2"])).toBe(rows);
    expect(list).toHaveBeenCalledWith(
      { variant_id: ["v1", "v2"] },
      { order: { sort_order: "ASC", created_at: "ASC" } },
    );
  });
});
