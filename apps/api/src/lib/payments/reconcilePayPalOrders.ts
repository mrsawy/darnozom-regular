import { db, orders, orderItems, type Order } from "@workspace/db";
import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { logger } from "../logger";
import { sendAdminSalesNotification, sendOrderAutoCancelledEmail } from "../email/email";
import { sendOrderPaidNotifications } from "../orderPaidNotifications";
import { capturePayPalOrder, getPayPalOrderStatus } from "./paypal";

// Server-side safety net for PayPal payments.
//
// A PayPal order normally becomes "paid" only when the buyer returns to our
// capture page and the capture POST succeeds. If the buyer closes the tab after
// approving on PayPal, that return never fires and the local order is left
// stuck at "pending" (so any digital book stays locked). This reconciler runs
// periodically, looks up each pending PayPal order, and:
//   - APPROVED  → captures it now (the money was authorized but never captured)
//   - COMPLETED → flips it to paid (the money was already captured on PayPal)
// using the exact same idempotent conditional update as the capture route, so
// it can never double-charge and is safe to run repeatedly.

// Orders younger than this are still inside the live browser-return capture
// window, so we skip them to avoid racing the buyer's own capture request and
// to avoid needless PayPal API calls. The idempotent update below still makes
// any race harmless if one does happen.
const DEFAULT_MIN_AGE_MS = 2 * 60 * 1000;

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export interface ReconcileSummary {
  scanned: number;
  /** Orders already captured on PayPal that we flipped to paid. */
  reconciled: number;
  /** Approved orders we captured ourselves and flipped to paid. */
  captured: number;
  /** Orders left pending (not approved yet, or already paid by a racing call). */
  stillPending: number;
  /** Orders whose PayPal lookup/capture threw or returned no usable state. */
  errors: number;
}

/**
 * Marks a PayPal order paid + confirmed, but only if it is not already paid.
 * The conditional `payment_status <> 'paid'` guard makes concurrent captures
 * (the live browser flow, a retry, and this reconciler) safe: whoever wins
 * stamps paidAt + captureId once; everyone else gets `null` back and reports
 * the already-paid state. Never overwrites an existing captureId with null.
 *
 * Returns the updated row, or null when the order was already paid.
 */
export async function markPayPalOrderPaid(
  orderId: number,
  captureId: string | null,
  opts?: {
    /**
     * True when the background reconciler (not the live browser flow) is the
     * one flipping the order — stamps paymentRecoveredAt so the customer's
     * account page can show a "payment recovered" note.
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
      ...(captureId ? { paypalCaptureId: captureId } : {}),
      ...(opts?.recovered ? { paymentRecoveredAt: now } : {}),
      paidAt: now,
      updatedAt: now,
    })
    .where(and(eq(orders.id, orderId), sql`${orders.paymentStatus} <> 'paid'`))
    .returning();
  return updated ?? null;
}

/**
 * Marks an order's payment as terminally failed (e.g. a definitive PayPal
 * capture rejection like COMPLIANCE_VIOLATION, where retrying can never
 * succeed and PayPal auto-refunds any charged amount). Stores the reason so
 * admins and the customer's account page can see why. Conditional: never
 * touches an order that already became paid (a racing capture may have won).
 *
 * Returns the updated row, or null when the order was already paid/failed.
 */
export async function markOrderPaymentFailed(
  orderId: number,
  reason: string,
): Promise<Order | null> {
  const now = new Date();
  const [updated] = await db
    .update(orders)
    .set({
      paymentStatus: "failed",
      paymentFailureReason: reason.slice(0, 500),
      updatedAt: now,
    })
    .where(
      and(
        eq(orders.id, orderId),
        inArray(orders.paymentStatus, ["pending", "unpaid"]),
      ),
    )
    .returning();
  return updated ?? null;
}

/**
 * Notifies the store admin that an order's payment terminally failed.
 * Best-effort — never throws.
 */
export async function notifyAdminPaymentFailed(
  order: Order,
  reason: string,
): Promise<void> {
  try {
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    await sendAdminSalesNotification({
      orderId: order.id,
      stage: "failed",
      paymentMethod: order.paymentMethod,
      customerName: order.fullName,
      customerEmail: order.userEmail,
      phone: order.phone,
      currency: order.currency,
      totalAmount: order.totalAmount,
      city: order.shippingCity,
      address: order.address,
      reason,
      items: items.map((it) => ({
        productTitle: it.productTitle,
        quantity: it.quantity,
        format: it.format,
      })),
    });
  } catch (err) {
    logger.error(
      { err, orderId: order.id },
      "payment-failed admin notification failed",
    );
  }
}

/**
 * Emails the customer that their order was auto-cancelled (expired checkout)
 * or that its payment terminally failed (with the auto-refund note).
 * Best-effort — never throws.
 */
export async function notifyCustomerOrderCancelled(
  order: Pick<Order, "id" | "userEmail" | "fullName">,
  reason: "expired" | "payment_failed",
  failureCode?: string | null,
): Promise<void> {
  try {
    if (!order.userEmail) return;
    const result = await sendOrderAutoCancelledEmail({
      to: order.userEmail,
      orderId: order.id,
      customerName: order.fullName,
      reason,
      failureCode,
    });
    if (!result.ok) {
      logger.warn(
        { orderId: order.id, reason, error: result.error },
        "order auto-cancelled customer email not sent",
      );
    }
  } catch (err) {
    logger.error(
      { err, orderId: order.id, reason },
      "order auto-cancelled customer email failed",
    );
  }
}

// Stale pending online-payment orders older than this are auto-cancelled by
// the sweep — the buyer clearly abandoned the checkout. COD orders are never
// expired (they legitimately stay unpaid until delivery).
const STALE_PENDING_MAX_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * Auto-expires stale pending/unpaid online-payment orders (~48h grace):
 * cancels them and stamps paymentStatus=failed with reason "expired" so they
 * stop cluttering the admin list and drop out of the reconcile sweeps.
 * COD orders are skipped. Runs after the reconcile pass in the same tick so
 * any order the buyer actually paid gets rescued first. Idempotent.
 */
export async function expireStalePendingOrders(opts?: {
  maxAgeMs?: number;
}): Promise<{ expired: number; orderIds: number[] }> {
  const maxAgeMs = opts?.maxAgeMs ?? STALE_PENDING_MAX_AGE_MS;
  const cutoff = new Date(Date.now() - maxAgeMs);
  const now = new Date();
  const expiredRows = await db
    .update(orders)
    .set({
      status: "cancelled",
      paymentStatus: "failed",
      paymentFailureReason: "expired",
      updatedAt: now,
    })
    .where(
      and(
        inArray(orders.paymentMethod, ["paypal", "card", "wallet"]),
        inArray(orders.paymentStatus, ["pending", "unpaid"]),
        sql`${orders.status} <> 'cancelled'`,
        sql`${orders.status} <> 'completed'`,
        lt(orders.createdAt, cutoff),
      ),
    )
    .returning({
      id: orders.id,
      userEmail: orders.userEmail,
      fullName: orders.fullName,
    });
  const orderIds = expiredRows.map((r) => r.id);
  if (orderIds.length) {
    logger.info(
      { count: orderIds.length, orderIds },
      "order expiry: cancelled stale pending unpaid orders",
    );
    // Tell each customer their order was auto-cancelled (best-effort).
    for (const row of expiredRows) {
      await notifyCustomerOrderCancelled(row, "expired");
    }
  }
  return { expired: orderIds.length, orderIds };
}

/**
 * Scans pending PayPal orders and reconciles any whose payment actually went
 * through on PayPal's side. Idempotent and safe to run repeatedly.
 */
export async function reconcilePendingPayPalOrders(opts?: {
  minAgeMs?: number;
}): Promise<ReconcileSummary> {
  const minAgeMs = opts?.minAgeMs ?? DEFAULT_MIN_AGE_MS;
  const cutoff = new Date(Date.now() - minAgeMs);
  const summary: ReconcileSummary = {
    scanned: 0,
    reconciled: 0,
    captured: 0,
    stillPending: 0,
    errors: 0,
  };

  const pending = await db
    .select()
    .from(orders)
    .where(
      and(
        // Card orders settle through PayPal too (Advanced Card Fields), so
        // they share the same PayPal order ids and the same recovery path.
        inArray(orders.paymentMethod, ["paypal", "card"]),
        eq(orders.paymentStatus, "pending"),
        // Cancelled orders (customer/admin cancel, dedupe, expiry) are out of
        // the payment flow — never retry their captures.
        sql`${orders.status} <> 'cancelled'`,
        isNotNull(orders.paypalOrderId),
        lt(orders.createdAt, cutoff),
      ),
    );

  summary.scanned = pending.length;

  for (const order of pending) {
    const paypalOrderId = order.paypalOrderId;
    if (!paypalOrderId) continue;
    try {
      const lookup = await getPayPalOrderStatus(paypalOrderId);
      if (!lookup) {
        // Network/auth failure — leave it pending and retry next pass.
        summary.errors++;
        continue;
      }

      if (lookup.status === "COMPLETED" && lookup.capture?.captured) {
        // Money was already captured on PayPal's side but our order was left
        // pending (buyer closed the tab before the return capture ran).
        const updated = await markPayPalOrderPaid(
          order.id,
          lookup.capture.captureId,
          { recovered: true },
        );
        if (updated) {
          summary.reconciled++;
          logger.info(
            { orderId: order.id, paypalOrderId },
            "paypal reconcile: flipped already-captured order to paid",
          );
          // Same confirmation email as a normal capture (best-effort).
          await sendOrderPaidNotifications(updated);
        } else {
          summary.stillPending++;
        }
      } else if (lookup.status === "APPROVED") {
        // Buyer approved but the capture never ran — capture it now. This reuses
        // the same idempotent capture (handles ORDER_ALREADY_CAPTURED) as the
        // route, so it can never double-charge.
        const result = await capturePayPalOrder(paypalOrderId);
        if (result.captured) {
          const updated = await markPayPalOrderPaid(order.id, result.captureId, {
            recovered: true,
          });
          if (updated) {
            summary.captured++;
            logger.info(
              { orderId: order.id, paypalOrderId },
              "paypal reconcile: captured approved order",
            );
            // Same confirmation email as a normal capture (best-effort).
            await sendOrderPaidNotifications(updated);
          } else {
            summary.stillPending++;
          }
        } else if (result.permanentFailure) {
          // Definitive rejection (e.g. COMPLIANCE_VIOLATION): retrying can
          // never succeed, so stop the retry loop by marking the payment
          // failed with the PayPal issue code and alerting the admin.
          const reason = result.failureIssue || result.status || "PAYMENT_FAILED";
          const failed = await markOrderPaymentFailed(order.id, reason);
          if (failed) {
            logger.warn(
              { orderId: order.id, paypalOrderId, reason },
              "paypal reconcile: capture permanently failed — marked order failed",
            );
            await notifyAdminPaymentFailed(
              failed,
              `فشل تحصيل الدفع نهائياً عبر PayPal (رمز الخطأ: ${reason}). أي مبلغ تم خصمه يُعاد تلقائياً من PayPal. لن تتم إعادة المحاولة.`,
            );
            // Tell the customer too — includes the auto-refund note.
            await notifyCustomerOrderCancelled(failed, "payment_failed", reason);
          }
          summary.stillPending++;
        } else {
          summary.stillPending++;
        }
      } else {
        // CREATED (never approved), VOIDED, PAYER_ACTION_REQUIRED, etc — the
        // buyer has not paid, so there is nothing to reconcile.
        summary.stillPending++;
      }
    } catch (err) {
      summary.errors++;
      logger.error(
        { err, orderId: order.id, paypalOrderId },
        "paypal reconcile: order failed",
      );
    }
  }

  if (summary.reconciled || summary.captured || summary.errors) {
    logger.info(summary, "paypal reconcile: run complete");
  }
  return summary;
}

let running = false;

/**
 * Starts the periodic reconciliation job. Runs shortly after boot and then on a
 * fixed interval. Overlapping runs are prevented with a simple guard. The timer
 * is unref'd so it never keeps the process alive on its own.
 */
export function startPayPalReconciliationJob(
  intervalMs = DEFAULT_INTERVAL_MS,
): NodeJS.Timeout {
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await reconcilePendingPayPalOrders();
      // After rescuing any actually-paid orders, expire stale abandoned ones
      // (~48h grace; COD is never touched).
      await expireStalePendingOrders();
    } catch (err) {
      logger.error({ err }, "paypal reconcile: job tick failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  // Kick off an initial pass a little after boot (let seeds/warmup settle).
  const initial = setTimeout(() => void tick(), 30 * 1000);
  initial.unref?.();
  return timer;
}
