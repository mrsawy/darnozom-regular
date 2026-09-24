import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { sendOrderConfirmationWorkflow } from "../workflows/send-order-confirmation"
import { expressInternalFetch } from "../lib/express-internal"

async function notifyExpressAdminSocket(payload: {
  id: string
  email?: string | null
  createdAt: string
  totalAmount?: string | null
  currency?: string | null
}) {
  try {
    await expressInternalFetch("/api/internal/admin-notify/order-new", {
      id: payload.id,
      source: "medusa",
      email: payload.email,
      createdAt: payload.createdAt,
      totalAmount: payload.totalAmount,
      currency: payload.currency,
      medusaOrderId: payload.id,
    })
  } catch {
    // Best-effort — polling still covers missed pushes.
  }
}

/**
 * Native Medusa checkouts get a Resend confirmation. Hybrid Express orders
 * are mirrored into Medusa with metadata.source = "darnozom_storefront" and
 * already email via apps/api — skip those to avoid duplicate / premature mail.
 *
 * Also notifies the Express Socket.IO hub so admin bells refresh live.
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query")
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "email",
      "created_at",
      "currency_code",
      "total",
      "metadata",
      "summary.*",
    ],
    filters: { id: data.id },
  })
  const order = orders[0] as
    | {
        id: string
        email?: string | null
        created_at?: string | Date
        currency_code?: string | null
        total?: number | null
        summary?: { total?: number } | null
        metadata?: Record<string, unknown> | null
      }
    | undefined
  if (!order) return

  const meta = order.metadata ?? {}
  const isHybrid =
    meta.source === "darnozom_storefront" || meta.darnozom_order_id != null

  // Hybrid orders already emitted order:new from Express after sync.
  if (!isHybrid) {
    // Medusa v2 amounts are in major units (66 = 66.00 EGP), not cents.
    const amount = order.summary?.total ?? order.total
    const createdAt =
      order.created_at instanceof Date
        ? order.created_at.toISOString()
        : String(order.created_at ?? new Date().toISOString())

    await notifyExpressAdminSocket({
      id: order.id,
      email: order.email,
      createdAt,
      totalAmount: typeof amount === "number" ? amount.toFixed(2) : null,
      currency: order.currency_code ?? null,
    })

    await sendOrderConfirmationWorkflow(container).run({
      input: { id: data.id },
    })
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
