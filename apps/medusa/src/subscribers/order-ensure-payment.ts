import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ensureOrderPaymentCollection } from "../lib/ensure-order-payment-collection"

/**
 * After any order is placed (including draft→order convert from Express sync),
 * ensure a `not_paid` payment collection exists so Admin can Mark as paid.
 */
export default async function orderEnsurePaymentHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await ensureOrderPaymentCollection(container, data.id)
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
