import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types";
import {
  createLemonSqueezyCheckout,
  verifyLemonSqueezyWebhookSignature,
} from "../../lib/medusa-payment-gateways";

// Lemon Squeezy hosted checkout: acts as merchant of record for
// digital-only and international orders. The buyer completes payment on
// Lemon Squeezy's hosted checkout page and Lemon Squeezy notifies us
// asynchronously via webhook (see getWebhookActionAndData) once the order
// is created. Matches Medusa's deferred / asynchronous authorization flow,
// same as the Paymob providers.
class LemonSqueezyProviderService extends AbstractPaymentProvider {
  static identifier = "lemonsqueezy";

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const data = (input.data ?? {}) as { lemonSqueezyVariantId?: string; redirectUrl?: string };
    if (!data.lemonSqueezyVariantId) {
      throw new Error("Missing Lemon Squeezy variant id for checkout");
    }
    const customer = (input.context as any)?.customer;

    const checkout = await createLemonSqueezyCheckout({
      variantId: data.lemonSqueezyVariantId,
      amountCents: Number(input.amount),
      customerEmail: customer?.email ?? "unknown@darnozom.com",
      redirectUrl: data.redirectUrl ?? "https://darnozom.com/checkout-lemonsqueezy-return",
    });

    return {
      data: { checkoutId: checkout.checkoutId, checkoutUrl: checkout.checkoutUrl },
      id: checkout.checkoutId,
    };
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    // Authorization happens asynchronously via the webhook
    // (getWebhookActionAndData below) once the buyer completes the hosted
    // checkout — Medusa's deferred-authorization support (pending) matches
    // this flow, same as the Paymob providers.
    return { data: input.data ?? {}, status: "pending" };
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    // Lemon Squeezy has no documented "re-mint an existing checkout" API
    // in this codebase's client (packages/payment-gateways/src/lemonsqueezy.ts
    // only exposes createLemonSqueezyCheckout / verifyLemonSqueezyWebhookSignature).
    // A Lemon Squeezy hosted checkout URL remains valid until used or expired,
    // so — matching cod's and paypal-egp's explicit no-op passthrough
    // precedent — there is nothing meaningful to wire in here.
    return { data: input.data ?? {} };
  }

  async refundPayment(_input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new Error("Lemon Squeezy refunds must be processed manually via the Lemon Squeezy dashboard");
  }

  async getPaymentStatus(_input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: "pending" };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    const body = payload.data as { rawData: string; headers: Record<string, string> };
    const signature = body.headers["x-signature"];
    if (!(await verifyLemonSqueezyWebhookSignature(body.rawData, signature))) {
      throw new Error("Invalid Lemon Squeezy webhook signature");
    }

    const parsed = JSON.parse(body.rawData) as {
      meta: { event_name: string };
      data: { id: string };
    };

    if (parsed.meta.event_name === "order_created") {
      return { action: "captured", data: { session_id: parsed.data.id, amount: 0 } };
    }
    if (parsed.meta.event_name === "order_refunded") {
      return { action: "not_supported" };
    }
    return { action: "not_supported" };
  }
}

export default LemonSqueezyProviderService;
