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
  createPaymobWalletPayment,
  createPaymobWalletRedirectForExistingOrder,
  verifyPaymobWebhookHmac,
  extractPaymobDeclineReason,
} from "../../lib/medusa-payment-gateways";

// Paymob mobile wallet checkout (Vodafone/Orange/Etisalat Cash): the buyer is
// redirected to their wallet provider to approve the payment request, and
// Paymob notifies us asynchronously via webhook (see getWebhookActionAndData)
// once the transaction succeeds or fails. Same deferred / asynchronous
// authorization flow as paymob-card, and Paymob sends the same webhook shape
// for both card and wallet transactions.
class PaymobWalletProviderService extends AbstractPaymentProvider {
  static identifier = "paymob-wallet";

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const walletPhone = (input.data as any)?.walletPhone;
    if (!walletPhone || typeof walletPhone !== "string") {
      throw new Error("Missing wallet phone number for Paymob wallet payment");
    }

    const amountEgp = Number(input.amount) / 100;
    const customer = (input.context as any)?.customer;
    const merchantOrderId = (input.data as any)?.merchantOrderId ?? randomUUID();

    const payment = await createPaymobWalletPayment({
      amountEgp,
      merchantOrderId,
      walletPhone,
      billing: {
        email: customer?.email ?? "unknown@darnozom.com",
        firstName: customer?.first_name ?? "N/A",
        lastName: customer?.last_name ?? "N/A",
      } as any,
    });

    return {
      data: {
        paymobOrderId: payment.paymobOrderId,
        redirectUrl: payment.redirectUrl,
        merchantOrderId,
      },
      id: payment.paymobOrderId,
    };
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    // Authorization happens asynchronously via the webhook
    // (getWebhookActionAndData below) once the buyer approves the wallet
    // payment request — Medusa's deferred-authorization support
    // (pending_authorization) matches this flow.
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
    // Unlike paymob-card's updatePayment (a tracked no-op follow-up), the
    // wallet flow has a real re-mint capability:
    // createPaymobWalletRedirectForExistingOrder mints a fresh payment token
    // and wallet redirect URL for an already-registered Paymob order (wallet
    // payment tokens expire after an hour). Wire it in whenever we have
    // enough data on the existing payment session to re-mint — otherwise
    // fall back to a passthrough, e.g. when initiatePayment was never called
    // for this session yet.
    const data = (input.data ?? {}) as Record<string, unknown>;
    const paymobOrderId = data.paymobOrderId as string | undefined;
    const walletPhone = (data.walletPhone as string | undefined) ?? undefined;

    if (!paymobOrderId || !walletPhone) {
      return { data };
    }

    const amountEgp = Number(input.amount ?? 0) / 100;
    const customer = (input.context as any)?.customer;

    const redirectUrl = await createPaymobWalletRedirectForExistingOrder({
      paymobOrderId,
      amountEgp,
      walletPhone,
      billing: {
        email: customer?.email ?? "unknown@darnozom.com",
        firstName: customer?.first_name ?? "N/A",
        lastName: customer?.last_name ?? "N/A",
      } as any,
    });

    return { data: { ...data, redirectUrl } };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new Error("Paymob wallet refunds must be processed manually via the Paymob dashboard");
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: "pending" };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const body = payload.data as any;
    const transactionObj = body.obj;
    const receivedHmac = body.hmac;

    if (!(await verifyPaymobWebhookHmac(transactionObj, receivedHmac))) {
      throw new Error("Invalid Paymob webhook HMAC");
    }

    const paymobOrderId = String(transactionObj.order?.id ?? "");

    if (transactionObj.success) {
      return {
        action: "captured",
        data: { session_id: paymobOrderId, amount: transactionObj.amount_cents },
      };
    }

    const reason = await extractPaymobDeclineReason(transactionObj);
    return {
      action: "failed",
      data: { session_id: paymobOrderId, amount: transactionObj.amount_cents ?? 0, reason } as any,
    };
  }
}

export default PaymobWalletProviderService;
