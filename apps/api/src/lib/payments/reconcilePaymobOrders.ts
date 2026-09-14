import { db, orders, type Order } from "@workspace/db";
import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { logger } from "../logger";
import { sendOrderPaidNotifications } from "../orderPaidNotifications";
import { getPaymobTransactionStatus, isPaymobConfigured } from "./paymob";

// Server-side safety net for Paymob card and mobile-wallet payments — mirrors
// the PayPal reconciler (reconcilePayPalOrders.ts).
//
// A Paymob order normally becomes "paid" when Paymob's transaction webhook
// arrives or the pay page's confirm poll succeeds. If the buyer pays and then
// closes the tab before either fires (or the webhook is dropped), the local
// order stays stuck at "pending" and any digital book stays locked. This
// reconciler periodically inquires each pending Paymob order and flips it to
// paid using the same idempotent conditional update as the webhook/confirm
// paths, so concurrent flows can never double-process.

const DEFAULT_MIN_AGE_MS = 2 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export interface PaymobReconcileSummary {
  scanned: number;
  /** Orders whose Paymob transaction succeeded that we flipped to paid. */
  reconciled: number;
  /** Orders left pending (no successful transaction yet, or already paid by a racing call). */
  stillPending: number;
  /** Orders whose Paymob lookup threw or returned no usable state. */
  errors: number;
}

/**
 * Marks a Paymob card order paid + confirmed, but only if it is not already
 * paid. The conditional `payment_status <> 'paid'` guard makes concurrent
 * writers (webhook, pay-page confirm poll, and this reconciler) safe: whoever
 * wins stamps paidAt + transactionId once; everyone else gets `null` back.
 * Never overwrites an existing transaction id with null.
 */
export async function markPaymobOrderPaid(
  orderId: number,
  transactionId: string | null,
  opts?: {
    /**
     * True when the background reconciler (not the live flow) flipped the
     * order — stamps paymentRecoveredAt so the customer's account page can
     * show a "payment recovered" note.
     */
    recovered?: boolean;
  },
): Promise<Order | null> {
  const now = new Date();
  const [updated] = await db
    .update(orders)
    .set({
      paymentStatus: "paid",
      status: "confirmed",
      ...(transactionId ? { paymobTransactionId: transactionId } : {}),
      ...(opts?.recovered ? { paymentRecoveredAt: now } : {}),
      paidAt: now,
      updatedAt: now,
    })
    .where(and(eq(orders.id, orderId), sql`${orders.paymentStatus} <> 'paid'`))
    .returning();
  return updated ?? null;
}

/**
 * Scans pending Paymob card orders and flips any whose payment actually went
 * through on Paymob's side. Idempotent and safe to run repeatedly.
 */
export async function reconcilePendingPaymobOrders(opts?: {
  minAgeMs?: number;
}): Promise<PaymobReconcileSummary> {
  const minAgeMs = opts?.minAgeMs ?? DEFAULT_MIN_AGE_MS;
  const cutoff = new Date(Date.now() - minAgeMs);
  const summary: PaymobReconcileSummary = {
    scanned: 0,
    reconciled: 0,
    stillPending: 0,
    errors: 0,
  };

  if (!isPaymobConfigured()) return summary;

  const pending = await db
    .select()
    .from(orders)
    .where(
      and(
        inArray(orders.paymentMethod, ["card", "wallet"]),
        eq(orders.paymentStatus, "pending"),
        isNotNull(orders.paymobOrderId),
        lt(orders.createdAt, cutoff),
      ),
    );

  summary.scanned = pending.length;

  for (const order of pending) {
    const paymobOrderId = order.paymobOrderId;
    if (!paymobOrderId) continue;
    try {
      const status = await getPaymobTransactionStatus(paymobOrderId);
      if (!status) {
        // Network/auth failure — leave it pending and retry next pass.
        summary.errors++;
        continue;
      }
      if (status.found && status.success && !status.pending) {
        const updated = await markPaymobOrderPaid(order.id, status.transactionId, {
          recovered: true,
        });
        if (updated) {
          summary.reconciled++;
          logger.info(
            { orderId: order.id, paymobOrderId },
            "paymob reconcile: flipped successful transaction to paid",
          );
          // Same confirmation email as a live confirmation (best-effort).
          await sendOrderPaidNotifications(updated);
        } else {
          summary.stillPending++;
        }
      } else {
        // No transaction yet, still pending 3DS, or declined — nothing to do.
        summary.stillPending++;
      }
    } catch (err) {
      summary.errors++;
      logger.error(
        { err, orderId: order.id, paymobOrderId },
        "paymob reconcile: order failed",
      );
    }
  }

  if (summary.reconciled || summary.errors) {
    logger.info(summary, "paymob reconcile: run complete");
  }
  return summary;
}

let running = false;

/**
 * Starts the periodic Paymob reconciliation job. Runs shortly after boot and
 * then on a fixed interval. Overlapping runs are prevented with a simple
 * guard. The timer is unref'd so it never keeps the process alive on its own.
 */
export function startPaymobReconciliationJob(
  intervalMs = DEFAULT_INTERVAL_MS,
): NodeJS.Timeout {
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await reconcilePendingPaymobOrders();
    } catch (err) {
      logger.error({ err }, "paymob reconcile: job tick failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  // Kick off an initial pass a little after boot (let seeds/warmup settle).
  const initial = setTimeout(() => void tick(), 45 * 1000);
  initial.unref?.();
  return timer;
}
