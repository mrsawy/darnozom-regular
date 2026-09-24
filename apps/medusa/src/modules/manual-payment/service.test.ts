import { describe, it, expect, vi } from "vitest";
import ManualPaymentModuleService from "./service";

// MedusaService-generated CRUD needs a DB; stub the generated methods on a
// bare instance and test only our composition logic.
function makeService(rows: any[]) {
  const svc = Object.create(ManualPaymentModuleService.prototype) as any;
  svc.listManualPaymentMethods = vi.fn(async (filter: any = {}) =>
    rows.filter((r) => !filter.code || r.code === filter.code),
  );
  svc.createManualPaymentMethods = vi.fn(async (data: any) => {
    const row = { id: `mpm_${data.code}`, ...nullRow(), ...data };
    rows.push(row);
    return row;
  });
  svc.updateManualPaymentMethods = vi.fn(async (data: any) => {
    const row = rows.find((r) => r.id === data.id);
    Object.assign(row, data);
    return row;
  });
  return svc as ManualPaymentModuleService & Record<string, any>;
}

function nullRow() {
  return {
    account_number: null,
    account_name: null,
    whatsapp_number: null,
    instapay_address: null,
    qr_image_url: null,
    instructions_ar: null,
    instructions_en: null,
  };
}

describe("ManualPaymentModuleService", () => {
  it("listAllMethods creates missing rows and returns both codes in order", async () => {
    const svc = makeService([{ id: "mpm_i", code: "instapay", ...nullRow() }]);
    const list = await svc.listAllMethods();
    expect(list.map((m) => m.code)).toEqual(["vodafone_cash", "instapay"]);
    expect(svc.createManualPaymentMethods).toHaveBeenCalledWith({ code: "vodafone_cash" });
  });

  it("upsertMethod updates an existing row", async () => {
    const svc = makeService([{ id: "mpm_v", code: "vodafone_cash", ...nullRow() }]);
    const updated = await svc.upsertMethod("vodafone_cash", { account_number: "01012345678" });
    expect(svc.updateManualPaymentMethods).toHaveBeenCalledWith({
      id: "mpm_v",
      account_number: "01012345678",
    });
    expect(updated.account_number).toBe("01012345678");
  });

  it("upsertMethod creates a row when missing", async () => {
    const svc = makeService([]);
    const created = await svc.upsertMethod("instapay", { instapay_address: "dar@instapay" });
    expect(created.code).toBe("instapay");
    expect(created.instapay_address).toBe("dar@instapay");
  });
});
