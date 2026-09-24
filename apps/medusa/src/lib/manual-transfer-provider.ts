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

// Manual bank/wallet transfer (Vodafone Cash, InstaPay): the buyer pays
// outside any gateway and sends proof over WhatsApp. The payment stays
// "pending" until staff verify it and press Mark as paid (Medusa) or
// Confirm payment (storefront admin). No webhooks, no automated refunds.
export abstract class ManualTransferProvider extends AbstractPaymentProvider {
  /** Human label used in error messages, e.g. "Vodafone Cash". */
  protected abstract readonly label: string;

  constructor(cradle: Record<string, unknown>, config?: Record<string, unknown>) {
    super(cradle, config);
  }

  async initiatePayment(_input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    return { data: {}, id: randomUUID() };
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
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

  async refundPayment(_input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new Error(`${this.label} refunds must be processed manually`);
  }

  async getPaymentStatus(_input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: "pending" };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    return { action: "not_supported" };
  }
}
