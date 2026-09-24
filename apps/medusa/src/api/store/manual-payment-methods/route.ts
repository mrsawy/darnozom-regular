import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MANUAL_PAYMENT_MODULE } from "../../../modules/manual-payment";
import type ManualPaymentModuleService from "../../../modules/manual-payment/service";

const PUBLIC_FIELDS = [
  "code",
  "account_number",
  "account_name",
  "whatsapp_number",
  "instapay_address",
  "qr_image_url",
  "instructions_ar",
  "instructions_en",
] as const;

// Public display data for the checkout instructions page. Store routes
// already require the publishable API key.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ManualPaymentModuleService>(MANUAL_PAYMENT_MODULE);
  const rows = await service.listAllMethods();
  const methods = rows.map((row) =>
    Object.fromEntries(
      PUBLIC_FIELDS.map((k) => [k, (row as Record<string, unknown>)[k] ?? null]),
    ),
  );
  res.status(200).json({ methods });
}
