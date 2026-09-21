import type { MedusaContainer } from "@medusajs/framework/types"
import {
  createOrUpdateOrderPaymentCollectionWorkflow,
  markPaymentCollectionAsPaid,
} from "@medusajs/medusa/core-flows"

type PaymentCollectionLike = {
  id: string
  status: string
}

type OrderLike = {
  id: string
  status?: string | null
  summary?: { pending_difference?: number | null } | null
  payment_collections?: PaymentCollectionLike[] | null
}

/**
 * Admin "Mark as paid" only appears when the order has a payment collection
 * with status `not_paid` and a positive pending difference. Draft→order sync
 * from the Express storefront often leaves collections empty, so Mark as paid
 * never shows. This creates/updates one when needed.
 */
export async function ensureOrderPaymentCollection(
  container: MedusaContainer,
  orderId: string,
  options?: { markPaid?: boolean; providerId?: string },
): Promise<{ paymentCollectionId: string | null; created: boolean }> {
  const query = container.resolve("query") as {
    graph: (input: Record<string, unknown>) => Promise<{ data: OrderLike[] }>
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "status",
      "summary.*",
      "payment_collections.id",
      "payment_collections.status",
    ],
    filters: { id: orderId },
  })

  const order = orders[0]
  if (!order || order.status === "canceled") {
    return { paymentCollectionId: null, created: false }
  }

  const unpaidBefore = (order.payment_collections ?? []).find(
    (pc) => pc.status === "not_paid",
  )
  const pending = Number(order.summary?.pending_difference ?? 0)

  if (!unpaidBefore && !(pending > 0)) {
    return { paymentCollectionId: null, created: false }
  }

  // Already authorized/captured — Capture UI handles that path.
  if (
    !unpaidBefore &&
    (order.payment_collections ?? []).some((pc) =>
      ["awaiting", "authorized", "partially_authorized", "captured"].includes(
        pc.status,
      ),
    )
  ) {
    return { paymentCollectionId: null, created: false }
  }

  let collectionId = unpaidBefore?.id ?? null
  let created = false

  if (!collectionId && pending > 0) {
    const { result } = await createOrUpdateOrderPaymentCollectionWorkflow(
      container,
    ).run({
      input: { order_id: order.id },
    })
    const list = Array.isArray(result) ? result : result ? [result] : []
    collectionId = list[0]?.id ?? null
    created = Boolean(collectionId)
  }

  if (options?.markPaid && collectionId) {
    await markPaymentCollectionAsPaid(container).run({
      input: {
        order_id: order.id,
        payment_collection_id: collectionId,
        provider_id: options.providerId,
      },
    })
  }

  return { paymentCollectionId: collectionId, created }
}
