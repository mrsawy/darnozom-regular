import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ensureOrderPaymentCollection } from "../../../../../lib/ensure-order-payment-collection"

/**
 * POST /admin/orders/:id/ensure-payment-collection
 *
 * Creates a `not_paid` payment collection when the order has an outstanding
 * balance but Admin would otherwise hide Mark as paid (Express draft sync).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  if (!orderId) {
    res.status(400).json({ message: "order id is required" })
    return
  }

  try {
    const result = await ensureOrderPaymentCollection(req.scope, orderId)
    res.status(200).json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ message })
  }
}
