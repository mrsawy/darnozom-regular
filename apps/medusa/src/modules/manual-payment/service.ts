import { MedusaService } from "@medusajs/framework/utils";
import { ManualPaymentMethod } from "./models/manual-payment-method";
import {
  MANUAL_PAYMENT_CODES,
  type ManualPaymentCode,
  type ManualPaymentMethodDTO,
  type ManualPaymentPatch,
} from "./validation";

// Generated CRUD (pluralized from "ManualPaymentMethod"):
// listManualPaymentMethods / createManualPaymentMethods / updateManualPaymentMethods.
class ManualPaymentModuleService extends MedusaService({ ManualPaymentMethod }) {
  async listAllMethods(): Promise<ManualPaymentMethodDTO[]> {
    const rows = (await this.listManualPaymentMethods({})) as ManualPaymentMethodDTO[];
    const out: ManualPaymentMethodDTO[] = [];
    for (const code of MANUAL_PAYMENT_CODES) {
      const existing = rows.find((r) => r.code === code);
      out.push(
        existing ??
          ((await this.createManualPaymentMethods({ code })) as ManualPaymentMethodDTO),
      );
    }
    return out;
  }

  async upsertMethod(
    code: ManualPaymentCode,
    patch: ManualPaymentPatch,
  ): Promise<ManualPaymentMethodDTO> {
    const [existing] = (await this.listManualPaymentMethods({ code })) as ManualPaymentMethodDTO[];
    if (existing) {
      return (await this.updateManualPaymentMethods({
        id: existing.id,
        ...patch,
      })) as ManualPaymentMethodDTO;
    }
    return (await this.createManualPaymentMethods({ code, ...patch })) as ManualPaymentMethodDTO;
  }
}

export default ManualPaymentModuleService;
