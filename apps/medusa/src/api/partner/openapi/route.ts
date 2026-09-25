import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { buildPartnerOpenApi } from "../../../lib/partner-openapi";

/** Public: paste this URL into the Custom GPT's "Import from URL". */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json(buildPartnerOpenApi(process.env.MEDUSA_BACKEND_URL || "http://localhost:9010"));
}
