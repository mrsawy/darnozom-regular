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
import { randomUUID } from "crypto";
import {
  createPayPalOrder,
  capturePayPalOrder,
  fetchEgpToUsdRate,
  convertEgpToUsd,
} from "../../lib/medusa-payment-gateways";

// PayPal (EGP-to-USD) redirect checkout: the store displays and totals in
// EGP, but PayPal only settles in USD, so the authoritative EGP amount is
// converted server-side at initiatePayment time using a live exchange rate
// (never trust a client-supplied USD figure). The buyer is redirected to
// PayPal's hosted approval page and returns to the storefront's
// checkout-paypal-return flow, which calls Medusa's authorize-payment-session
// endpoint to synchronously capture the order — unlike the Paymob providers,
// there is no async webhook notification for this provider (see
// getWebhookActionAndData below).
class PaypalEgpProviderService extends AbstractPaymentProvider {
  static identifier = "paypal-egp";

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const amountEgp = Number(input.amount) / 100;
    const rate = await fetchEgpToUsdRate();
    const usdAmount = await convertEgpToUsd(amountEgp, rate);
    const data = (input.data ?? {}) as {
      returnUrl: string;
      cancelUrl: string;
      referenceId?: string;
    };

    if (!data.returnUrl || !data.cancelUrl) {
      throw new Error("Missing returnUrl/cancelUrl for PayPal payment");
    }

    const order = await createPayPalOrder({
      usdAmount,
      referenceId: data.referenceId ?? randomUUID(),
      returnUrl: data.returnUrl,
      cancelUrl: data.cancelUrl,
    });

    // createPayPalOrder (packages/payment-gateways/src/paypal.ts) returns
    // { id, approveUrl } — `id` is the PayPal order id.
    const paypalOrderId = (order as any).id;

    return {
      data: {
        paypalOrderId,
        approveUrl: (order as any).approveUrl,
        usdAmount,
        exchangeRate: rate,
      },
      id: paypalOrderId,
    };
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    // Capture happens synchronously here (not via webhook): the buyer
    // approves on PayPal's hosted page, returns to
    // checkout-paypal-return.tsx, and that page calls Medusa's
    // authorize-payment-session endpoint, which invokes this method.
    const data = (input.data ?? {}) as Record<string, unknown>;
    const paypalOrderId = data.paypalOrderId as string | undefined;
    if (!paypalOrderId) {
      throw new Error("Missing paypalOrderId for PayPal authorization");
    }

    const result = await capturePayPalOrder(paypalOrderId);
    if (!(result as any).captured) {
      return {
        data: { ...data, paypalCaptureStatus: (result as any).status },
        status: "error",
      };
    }

    return {
      data: { ...data, paypalCaptureId: (result as any).captureId },
      status: "authorized",
    };
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // The capture already happened in authorizePayment above (PayPal's
    // capture-on-approve flow) — nothing further to do here.
    return { data: input.data ?? {} };
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    // Unlike paymob-wallet's updatePayment (which re-mints an expiring
    // wallet token via a dedicated Paymob endpoint), PayPal has no
    // "refresh an existing order" API — a PayPal order's approve link is
    // valid until the order expires, and once approved/captured it cannot
    // be updated. There is nothing meaningful to wire in here, so this is
    // an explicit no-op passthrough rather than a re-mint.
    return { data: input.data ?? {} };
  }

  async refundPayment(_input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new Error("PayPal refunds must be processed manually via the PayPal dashboard");
  }

  async getPaymentStatus(_input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: "authorized" };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    // PayPal capture happens synchronously in authorizePayment (buyer
    // returns from the PayPal-hosted approval page to
    // checkout-paypal-return.tsx, which calls Medusa's authorize-payment-
    // session endpoint) rather than via an async webhook — mirrors the
    // existing checkout-paypal-return.tsx flow. No webhook is registered
    // for this provider, so this method is never actually invoked in
    // practice; it throws to make that explicit if it ever is.
    throw new Error("paypal-egp does not use webhooks");
  }
}

export default PaypalEgpProviderService;
