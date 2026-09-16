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
  createPaymobCheckout,
  verifyPaymobWebhookHmac,
  extractPaymobDeclineReason,
} from "../../lib/medusa-payment-gateways";

// Paymob hosted card checkout: the buyer completes payment in an iframe, and
// Paymob notifies us asynchronously via webhook (see getWebhookActionAndData)
// once the transaction succeeds or fails. Matches Medusa's deferred /
// asynchronous authorization flow.
class PaymobCardProviderService extends AbstractPaymentProvider {
  static identifier = "paymob-card";

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const amountEgp = Number(input.amount) / 100;
    const customer = (input.context as any)?.customer;
    const merchantOrderId = (input.data as any)?.merchantOrderId ?? randomUUID();

    const checkout = await createPaymobCheckout({
      amountEgp,
      merchantOrderId,
      billing: {
        email: customer?.email ?? "unknown@darnozom.com",
        firstName: customer?.first_name ?? "N/A",
        lastName: customer?.last_name ?? "N/A",
      } as any,
    });

    return {
      data: {
        paymobOrderId: checkout.paymobOrderId,
        checkoutUrl: checkout.checkoutUrl,
      },
      id: checkout.paymobOrderId,
    };
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    // Authorization happens asynchronously via the webhook
    // (getWebhookActionAndData below) once the buyer completes the
    // iframe — Medusa's deferred-authorization support (pending_authorization)
    // matches this flow.
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
    return { data: input.data ?? {} };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new Error("Paymob card refunds must be processed manually via the Paymob dashboard");
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

export default PaymobCardProviderService;
