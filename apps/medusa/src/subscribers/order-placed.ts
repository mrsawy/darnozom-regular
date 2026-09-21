import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { sendOrderConfirmationWorkflow } from "../workflows/send-order-confirmation"

/**
 * Native Medusa checkouts get a Resend confirmation. Hybrid Express orders
 * are mirrored into Medusa with metadata.source = "darnozom_storefront" and
 * already email via apps/api — skip those to avoid duplicate / premature mail.
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query")
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: data.id },
  })
  const order = orders[0] as
    | { id: string; metadata?: Record<string, unknown> | null }
    | undefined
  if (!order) return

  const meta = order.metadata ?? {}
  if (
    meta.source === "darnozom_storefront" ||
    meta.darnozom_order_id != null
  ) {
    return
  }

  await sendOrderConfirmationWorkflow(container).run({
    input: { id: data.id },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
