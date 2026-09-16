import type { MedusaContainer } from "@medusajs/framework/types";

/**
 * The real Medusa v2.21.0 Payment module service (`IPaymentModuleService`,
 * `@medusajs/types/dist/payment/service.d.ts`) has no `getPaymentStatus` or
 * status-filtered `listPaymentSessions` method — those were assumed by the
 * plan brief but do not exist. The verified real surface used here is:
 *
 * - `listPaymentSessions(filters?, config?)` — `filters` has no `status`
 *   field (only id/currency_code/amount/provider_id/payment_collection_id/
 *   dates), so we list all sessions and filter client-side on the real
 *   `PaymentSessionStatus` value `"pending_authorization"`.
 * - `authorizePaymentSession(id, context)` — the real way to re-poll a
 *   session's provider and resolve its outcome. It returns the resulting
 *   `PaymentDTO` when authorization resolves (captured/authorized), or
 *   `null` when the provider still reports `pending_authorization`.
 * - `retrievePaymentSession(id)` — used after a `null` result to read back
 *   the session's current status and decide whether the provider actually
 *   errored/canceled (vs. still genuinely pending).
 * - `capturePayment({ payment_id })` — takes the payment ID (not the
 *   session), returns `PaymentDTO`.
 * - `cancelPayment(paymentId)` — takes the payment ID directly as a string,
 *   returns `PaymentDTO`.
 */
interface PaymentSessionLike {
  id: string;
  status: string;
  provider_id: string;
  data: Record<string, unknown>;
  updated_at: string | Date;
  payment?: { id: string } | null;
}

interface PaymentServiceLike {
  listPaymentSessions(filters?: Record<string, unknown>): Promise<PaymentSessionLike[]>;
  authorizePaymentSession(
    id: string,
    context: Record<string, unknown>,
  ): Promise<{ id: string } | null>;
  retrievePaymentSession(id: string): Promise<PaymentSessionLike>;
  capturePayment(data: { payment_id: string }): Promise<unknown>;
  cancelPayment(paymentId: string): Promise<unknown>;
}

// Sessions that report `pending_authorization` and haven't moved in this
// long are considered stale and re-polled/finalized here. 15 minutes
// matches the cadence of the two legacy Express reconcilers this job
// replaces.
const STALENESS_THRESHOLD_MS = 15 * 60 * 1000;

const TERMINAL_FAILURE_STATUSES = new Set(["error", "canceled"]);

export default async function reconcilePaymentsJob(container: MedusaContainer) {
  const paymentService = container.resolve<PaymentServiceLike>("payment");

  const sessions = await paymentService.listPaymentSessions();
  const stalePendingSessions = sessions.filter((session) => {
    if (session.status !== "pending_authorization") return false;
    const updatedAt = new Date(session.updated_at).getTime();
    return Date.now() - updatedAt >= STALENESS_THRESHOLD_MS;
  });

  for (const session of stalePendingSessions) {
    const payment = await paymentService.authorizePaymentSession(session.id, {});

    if (payment) {
      // Authorization resolved successfully - capture the resulting payment.
      await paymentService.capturePayment({ payment_id: payment.id });
      continue;
    }

    // Still `null` after re-authorizing: ask the module what the session's
    // status actually is now. If the provider reported a terminal failure
    // (error/canceled), cancel the underlying payment; otherwise it's
    // still genuinely pending and we leave it for the next run.
    const refreshedSession = await paymentService.retrievePaymentSession(session.id);
    if (TERMINAL_FAILURE_STATUSES.has(refreshedSession.status) && refreshedSession.payment?.id) {
      await paymentService.cancelPayment(refreshedSession.payment.id);
    }
  }
}

export const config = {
  name: "reconcile-payments",
  schedule: "*/15 * * * *", // every 15 minutes, matching the cadence of the two existing Express reconcilers
};
