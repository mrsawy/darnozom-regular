import { db, orders, type Order } from "@workspace/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { sendOrderPaidNotifications } from "../email/orderPaidNotifications";
import { logger } from "../logger";

// Manual transfers (Vodafone Cash, InstaPay): the buyer pays outside any
// gateway and sends proof over WhatsApp; staff confirm from Medusa Admin
// ("Mark as paid", synced here by the manual-payment-captured subscriber) or
// from the storefront admin ("Confirm payment").
export const MANUAL_PAYMENT_METHODS = ["vodafone_cash", "instapay"] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export function isManualPaymentMethod(m: string | null | undefined): m is ManualPaymentMethod {
  return !!m && (MANUAL_PAYMENT_METHODS as readonly string[]).includes(m);
}

export type MarkOrderPaidResult =
  | { status: "paid"; order: Order }
  | { status: "already_paid"; order: Order }
  | { status: "not_found" }
  | { status: "not_manual" }
  | { status: "cancelled" };

/**
 * Idempotently mark a manual-transfer order paid. The conditional update
 * (`paymentStatus <> 'paid'`) guarantees only one caller wins, so the
 * Medusa callback and the storefront confirm can both run without sending
 * the buyer two receipts.
 */
export async function markOrderPaid(
  orderId: number,
  opts: { source: "medusa" | "storefront_admin" },
): Promise<MarkOrderPaidResult> {
  const [existing] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!existing) return { status: "not_found" };
  if (!isManualPaymentMethod(existing.paymentMethod)) return { status: "not_manual" };
  if (existing.paymentStatus === "paid") return { status: "already_paid", order: existing };
  if (existing.status === "cancelled") return { status: "cancelled" };

  const now = new Date();
  const [updated] = await db
    .update(orders)
    .set({
      paymentStatus: "paid",
      // Same as Paymob: a paid order is confirmed. Don't undo a later status
      // (processing/completed) staff may already have set.
      status: sql`case when ${orders.status} = 'pending' then 'confirmed'::order_status else ${orders.status} end`,
      paidAt: now,
      paymentFailureReason: null,
      updatedAt: now,
    })
    .where(and(eq(orders.id, orderId), ne(orders.paymentStatus, "paid")))
    .returning();

  if (!updated) {
    const [current] = await db.select().from(orders).where(eq(orders.id, orderId));
    return { status: "already_paid", order: current ?? existing };
  }

  logger.info({ orderId, source: opts.source }, "manual payment confirmed");
  await sendOrderPaidNotifications(updated);
  return { status: "paid", order: updated };
}
