import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { EditionError, makeEditionDeps, setEditionSaleEnabled } from "../../../../../../lib/book-editions";

/** Put an edition on sale or take it off sale: body { sale_enabled: boolean }. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const saleEnabled = (req.body as { sale_enabled?: unknown } | undefined)?.sale_enabled;
  if (typeof saleEnabled !== "boolean") {
    return res.status(400).json({ message: "sale_enabled must be true or false" });
  }
  try {
    await setEditionSaleEnabled(makeEditionDeps(req.scope), req.params.id, req.params.variantId, saleEnabled);
    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof EditionError) return res.status(err.status).json({ message: err.message });
    throw err;
  }
}
