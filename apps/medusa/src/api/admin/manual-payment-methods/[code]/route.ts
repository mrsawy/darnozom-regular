import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  MANUAL_PAYMENT_MODULE,
  isManualPaymentCode,
  parseManualPaymentPatch,
} from "../../../../modules/manual-payment";
import type ManualPaymentModuleService from "../../../../modules/manual-payment/service";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { code } = req.params;
  if (!isManualPaymentCode(code)) {
    return res.status(400).json({ error: `Unknown manual payment method: ${code}` });
  }
  const parsed = parseManualPaymentPatch(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }
  const service = req.scope.resolve<ManualPaymentModuleService>(MANUAL_PAYMENT_MODULE);
  const method = await service.upsertMethod(code, parsed.patch);
  return res.status(200).json({ method });
}
