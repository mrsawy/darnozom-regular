import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { DIGITAL_PRODUCT_MODULE } from "../../../modules/digital-product";
import type DigitalProductModuleService from "../../../modules/digital-product/service";

/**
 * Files of one or more digital variants (`?variant_id=a&variant_id=b`).
 * Used by the Medusa Admin "Digital files" widget and, server-to-server with
 * the admin API key, by the Express customer library.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const raw = (req.query as Record<string, unknown>).variant_id;
  const variantIds = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String).filter(Boolean);
  if (variantIds.length === 0) {
    return res.status(400).json({ error: "variant_id is required" });
  }
  const service = req.scope.resolve<DigitalProductModuleService>(DIGITAL_PRODUCT_MODULE);
  const files = await service.listFilesForVariants(variantIds);
  return res.status(200).json({ files });
}
