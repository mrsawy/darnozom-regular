import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MANUAL_PAYMENT_MODULE } from "../../../modules/manual-payment";
import type ManualPaymentModuleService from "../../../modules/manual-payment/service";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ManualPaymentModuleService>(MANUAL_PAYMENT_MODULE);
  const methods = await service.listAllMethods();
  res.status(200).json({ methods });
}
