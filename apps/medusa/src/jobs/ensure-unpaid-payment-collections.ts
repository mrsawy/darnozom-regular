import type { MedusaContainer } from "@medusajs/framework/types"
import { ensureOrderPaymentCollection } from "../lib/ensure-order-payment-collection"

/**
 * Backfill payment collections for orders that show an outstanding balance
 * but have no `not_paid` collection (e.g. Express draft→order sync). Without
 * that collection, Medusa Admin hides the Mark as paid button.
 */
export default async function ensureUnpaidPaymentCollectionsJob(
  container: MedusaContainer,
) {
  const query = container.resolve("query") as {
    graph: (input: Record<string, unknown>) => Promise<{
      data: Array<{ id: string; status?: string | null }>
    }>
  }
  const logger = container.resolve("logger") as {
    info: (msg: string) => void
    warn: (msg: string, meta?: unknown) => void
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "status"],
    pagination: { take: 100, skip: 0 },
  })

  for (const order of orders) {
    if (order.status === "canceled") continue
    try {
      const result = await ensureOrderPaymentCollection(container, order.id)
      if (result.created) {
        logger.info(
          `ensure-unpaid-payment-collections: created collection for ${order.id}`,
        )
      }
    } catch (err) {
      logger.warn(
        `ensure-unpaid-payment-collections: failed for ${order.id}`,
        err,
      )
    }
  }
}

export const config = {
  name: "ensure-unpaid-payment-collections",
  // Soon after deploy so existing Not-paid orders (e.g. #2) get Mark as paid.
  schedule: "*/5 * * * *",
}
