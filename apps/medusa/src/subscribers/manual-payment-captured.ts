import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { expressInternalFetch } from "../lib/express-internal";

const MANUAL_METHODS = new Set(["vodafone_cash", "instapay"]);

type PaymentRow = {
  id: string;
  payment_collection?: {
    order?: { id: string; metadata?: Record<string, unknown> | null } | null;
  } | null;
};

/**
 * Staff confirmed a Vodafone Cash / InstaPay transfer with Medusa's
 * "Mark as paid" (or Express confirmed and mirrored it here). Push "paid"
 * to Express, which owns digital access and the buyer emails. Express is
 * idempotent, so the Express-initiated round trip is a harmless no-op.
 *
 * payment.captured carries only { id: <payment id> } — resolve the order
 * through payment → payment_collection → order.
 */
export default async function manualPaymentCapturedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query");
  const logger = container.resolve("logger");

  const { data } = await query.graph({
    entity: "payment",
    fields: ["id", "payment_collection.order.id", "payment_collection.order.metadata"],
    filters: { id: event.data.id },
  });
  const order = (data[0] as PaymentRow | undefined)?.payment_collection?.order;
  const meta = order?.metadata ?? {};
  if (
    !order ||
    meta.source !== "darnozom_storefront" ||
    !MANUAL_METHODS.has(String(meta.payment_method)) ||
    meta.darnozom_order_id == null
  ) {
    return;
  }

  const darnozomOrderId = Number(meta.darnozom_order_id);
  const res = await expressInternalFetch(`/api/internal/orders/${darnozomOrderId}/mark-paid`, {
    medusaOrderId: order.id,
  });
  if (!res) {
    throw new Error(
      "BETTER_AUTH_BRIDGE_SECRET is not set — cannot sync manual payment to Express",
    );
  }
  if (res.status === 409) {
    logger.warn(
      `manual payment for cancelled Express order ${darnozomOrderId} (Medusa ${order.id}) not synced`,
    );
    return;
  }
  if (!res.ok) {
    throw new Error(
      `Express mark-paid for order ${darnozomOrderId} failed (${res.status}): ${(await res.text()).slice(0, 200)}`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
};
