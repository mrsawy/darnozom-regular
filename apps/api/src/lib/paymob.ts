import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "./logger";

// Paymob (Accept) card payments integration.
//
// The store charges cards in EGP directly through Paymob — no USD conversion.
// Flow (classic Accept API):
//   1. POST /api/auth/tokens        → short-lived auth token (from PAYMOB_API_KEY)
//   2. POST /api/ecommerce/orders   → register a Paymob order for the EGP amount
//   3. POST /api/acceptance/payment_keys → payment token for the card iframe
//   4. The buyer enters card details in the hosted iframe:
//        https://accept.paymob.com/api/acceptance/iframes/<IFRAME_ID>?payment_token=<token>
//   5. Paymob POSTs a transaction-processed webhook (verified via HMAC-SHA512)
//      and/or we confirm by transaction inquiry (poll + reconciliation sweep).
//
// Required env vars (all four must be set for card payments to be enabled):
//   PAYMOB_API_KEY        — merchant API key (Paymob dashboard → Settings → Account Info)
//   PAYMOB_INTEGRATION_ID — the card (online) integration id
//   PAYMOB_HMAC_SECRET    — HMAC secret used to verify callbacks
//   PAYMOB_IFRAME_ID      — the payment iframe id for card entry
//
// Mobile wallets (Vodafone Cash / Orange Money / Etisalat Cash) additionally
// require:
//   PAYMOB_WALLET_INTEGRATION_ID — the "Mobile Wallets" integration id
// The wallet flow reuses steps 1–3 (with the wallet integration id) and then
// POSTs /api/acceptance/payments/pay with the wallet phone number, which
// returns a redirect URL to the wallet provider's payment page.
//
// Auth tokens are fetched fresh per call (they expire) — same policy as the
// PayPal client.

const PAYMOB_BASE_URL = "https://accept.paymob.com";

export interface PaymobConfig {
  apiKey: string;
  integrationId: string;
  hmacSecret: string;
  iframeId: string;
}

/** Returns the Paymob configuration, or null when any secret is missing. */
export function getPaymobConfig(): PaymobConfig | null {
  const apiKey = process.env.PAYMOB_API_KEY;
  const integrationId = process.env.PAYMOB_INTEGRATION_ID;
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  const iframeId = process.env.PAYMOB_IFRAME_ID;
  if (!apiKey || !integrationId || !hmacSecret || !iframeId) return null;
  return { apiKey, integrationId, hmacSecret, iframeId };
}

export function isPaymobConfigured(): boolean {
  return getPaymobConfig() !== null;
}

/**
 * Wallet payments need the base Paymob config plus a dedicated mobile-wallet
 * integration id. Returns null when either piece is missing.
 */
export function getPaymobWalletIntegrationId(): string | null {
  if (!isPaymobConfigured()) return null;
  const id = process.env.PAYMOB_WALLET_INTEGRATION_ID;
  return id && id.trim() ? id.trim() : null;
}

export function isPaymobWalletConfigured(): boolean {
  return getPaymobWalletIntegrationId() !== null;
}

async function authenticate(config: PaymobConfig): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE_URL}/api/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: config.apiKey }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ status: res.status, text }, "paymob: auth failed");
    throw new Error(`Paymob auth failed (${res.status})`);
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) {
    throw new Error("Paymob auth response missing token");
  }
  return body.token;
}

export interface PaymobBilling {
  name: string;
  email: string;
  phone: string;
  city?: string | null;
  address?: string | null;
}

// Paymob's payment_keys endpoint requires every billing field to be present;
// unknown fields must be sent as the literal string "NA".
function buildBillingData(billing: PaymobBilling): Record<string, string> {
  const nameParts = billing.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "NA";
  const lastName = nameParts.slice(1).join(" ") || firstName;
  return {
    first_name: firstName,
    last_name: lastName,
    email: billing.email || "NA",
    phone_number: billing.phone || "NA",
    apartment: "NA",
    floor: "NA",
    street: billing.address?.trim() || "NA",
    building: "NA",
    shipping_method: "NA",
    postal_code: "NA",
    city: billing.city?.trim() || "NA",
    country: "NA",
    state: "NA",
  };
}

function toAmountCents(amountEgp: number): number {
  const cents = Math.round(amountEgp * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new Error("Invalid EGP amount for Paymob");
  }
  return cents;
}

async function createPaymentKey(params: {
  config: PaymobConfig;
  authToken: string;
  paymobOrderId: string;
  amountCents: number;
  billing: PaymobBilling;
  /** Overrides the card integration id (used for the mobile-wallet flow). */
  integrationId?: string;
}): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE_URL}/api/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: params.authToken,
      amount_cents: params.amountCents,
      expiration: 3600,
      order_id: params.paymobOrderId,
      billing_data: buildBillingData(params.billing),
      currency: "EGP",
      integration_id: Number(params.integrationId ?? params.config.integrationId),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ status: res.status, text }, "paymob: payment key failed");
    throw new Error(`Paymob payment key failed (${res.status})`);
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) {
    throw new Error("Paymob payment key response missing token");
  }
  return body.token;
}

function iframeUrl(config: PaymobConfig, paymentToken: string): string {
  return `${PAYMOB_BASE_URL}/api/acceptance/iframes/${encodeURIComponent(
    config.iframeId,
  )}?payment_token=${encodeURIComponent(paymentToken)}`;
}

export interface PaymobCheckout {
  paymobOrderId: string;
  checkoutUrl: string;
}

/** Registers a Paymob order for the EGP amount and returns its Paymob id. */
async function registerPaymobOrder(params: {
  authToken: string;
  amountCents: number;
  merchantOrderId: string;
}): Promise<string> {
  const orderRes = await fetch(`${PAYMOB_BASE_URL}/api/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: params.authToken,
      delivery_needed: "false",
      amount_cents: params.amountCents,
      currency: "EGP",
      merchant_order_id: params.merchantOrderId,
      items: [],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!orderRes.ok) {
    const text = await orderRes.text().catch(() => "");
    logger.error({ status: orderRes.status, text }, "paymob: create order failed");
    throw new Error(`Paymob create order failed (${orderRes.status})`);
  }
  const orderBody = (await orderRes.json()) as { id?: number };
  if (!orderBody.id) {
    throw new Error("Paymob create order response missing id");
  }
  return String(orderBody.id);
}

/**
 * Registers a Paymob order for the EGP amount and returns the hosted card
 * iframe URL the buyer completes payment in. `merchantOrderId` must be unique
 * per Paymob merchant account — we use our local order id.
 */
export async function createPaymobCheckout(params: {
  amountEgp: number;
  merchantOrderId: string;
  billing: PaymobBilling;
}): Promise<PaymobCheckout> {
  const config = getPaymobConfig();
  if (!config) {
    throw new Error("Paymob is not configured");
  }
  const amountCents = toAmountCents(params.amountEgp);
  const authToken = await authenticate(config);

  const paymobOrderId = await registerPaymobOrder({
    authToken,
    amountCents,
    merchantOrderId: params.merchantOrderId,
  });

  const paymentToken = await createPaymentKey({
    config,
    authToken,
    paymobOrderId,
    amountCents,
    billing: params.billing,
  });

  return { paymobOrderId, checkoutUrl: iframeUrl(config, paymentToken) };
}

// ---------------------------------------------------------------------------
// Mobile wallets (Vodafone Cash / Orange Money / Etisalat Cash)
// ---------------------------------------------------------------------------

/**
 * Executes the wallet pay request for a freshly minted payment token: Paymob
 * pushes a payment request to the wallet phone and returns a redirect URL to
 * the wallet provider's payment page.
 */
async function executeWalletPay(params: {
  paymentToken: string;
  walletPhone: string;
}): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE_URL}/api/acceptance/payments/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: { identifier: params.walletPhone, subtype: "WALLET" },
      payment_token: params.paymentToken,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ status: res.status, text }, "paymob: wallet pay failed");
    throw new Error(`Paymob wallet pay failed (${res.status})`);
  }
  const body = (await res.json()) as {
    redirect_url?: string;
    iframe_redirection_url?: string;
    pending?: boolean;
    success?: boolean;
  };
  const redirectUrl = body.redirect_url || body.iframe_redirection_url || "";
  if (!redirectUrl) {
    logger.error({ body }, "paymob: wallet pay response missing redirect url");
    throw new Error("Paymob wallet pay response missing redirect URL");
  }
  return redirectUrl;
}

export interface PaymobWalletPayment {
  paymobOrderId: string;
  redirectUrl: string;
}

/**
 * Registers a Paymob order and starts a mobile-wallet payment for it. Returns
 * the wallet provider's redirect URL the buyer completes payment on (Paymob
 * also pushes a payment request to the wallet phone).
 */
export async function createPaymobWalletPayment(params: {
  amountEgp: number;
  merchantOrderId: string;
  billing: PaymobBilling;
  walletPhone: string;
}): Promise<PaymobWalletPayment> {
  const config = getPaymobConfig();
  const walletIntegrationId = getPaymobWalletIntegrationId();
  if (!config || !walletIntegrationId) {
    throw new Error("Paymob wallet payments are not configured");
  }
  const amountCents = toAmountCents(params.amountEgp);
  const authToken = await authenticate(config);

  const paymobOrderId = await registerPaymobOrder({
    authToken,
    amountCents,
    merchantOrderId: params.merchantOrderId,
  });

  const paymentToken = await createPaymentKey({
    config,
    authToken,
    paymobOrderId,
    amountCents,
    billing: params.billing,
    integrationId: walletIntegrationId,
  });

  const redirectUrl = await executeWalletPay({
    paymentToken,
    walletPhone: params.walletPhone,
  });

  return { paymobOrderId, redirectUrl };
}

/**
 * Restarts the wallet payment for an existing Paymob order (payment tokens
 * expire after an hour) and returns a fresh redirect URL.
 */
export async function createPaymobWalletRedirectForExistingOrder(params: {
  paymobOrderId: string;
  amountEgp: number;
  billing: PaymobBilling;
  walletPhone: string;
}): Promise<string> {
  const config = getPaymobConfig();
  const walletIntegrationId = getPaymobWalletIntegrationId();
  if (!config || !walletIntegrationId) {
    throw new Error("Paymob wallet payments are not configured");
  }
  const authToken = await authenticate(config);
  const paymentToken = await createPaymentKey({
    config,
    authToken,
    paymobOrderId: params.paymobOrderId,
    amountCents: toAmountCents(params.amountEgp),
    billing: params.billing,
    integrationId: walletIntegrationId,
  });
  return executeWalletPay({ paymentToken, walletPhone: params.walletPhone });
}

/**
 * Regenerates a fresh payment key (and iframe URL) for an existing Paymob
 * order — payment tokens expire after an hour, so the pay page always fetches
 * a fresh one instead of reusing the token minted at order creation.
 */
export async function createPaymobCheckoutUrlForExistingOrder(params: {
  paymobOrderId: string;
  amountEgp: number;
  billing: PaymobBilling;
}): Promise<string> {
  const config = getPaymobConfig();
  if (!config) {
    throw new Error("Paymob is not configured");
  }
  const authToken = await authenticate(config);
  const paymentToken = await createPaymentKey({
    config,
    authToken,
    paymobOrderId: params.paymobOrderId,
    amountCents: toAmountCents(params.amountEgp),
    billing: params.billing,
  });
  return iframeUrl(config, paymentToken);
}

export interface PaymobTransactionStatus {
  /** True when a transaction exists for the order at all. */
  found: boolean;
  /** True when the transaction succeeded (money captured). */
  success: boolean;
  /** True while the transaction is still pending (e.g. 3DS in progress). */
  pending: boolean;
  transactionId: string | null;
  amountCents: number | null;
}

/**
 * Looks up the latest transaction for a Paymob order (read-only, never
 * charges). Returns `found: false` when no transaction has been attempted yet,
 * and null on network/auth failure so callers can retry on the next pass.
 */
export async function getPaymobTransactionStatus(
  paymobOrderId: string,
): Promise<PaymobTransactionStatus | null> {
  const config = getPaymobConfig();
  if (!config) return null;
  try {
    const authToken = await authenticate(config);
    const res = await fetch(
      `${PAYMOB_BASE_URL}/api/ecommerce/orders/transaction_inquiry`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth_token: authToken, order_id: paymobOrderId }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (res.status === 404) {
      // No transaction attempted on this order yet.
      return { found: false, success: false, pending: false, transactionId: null, amountCents: null };
    }
    if (!res.ok) {
      logger.warn(
        { status: res.status, paymobOrderId },
        "paymob: transaction inquiry failed",
      );
      return null;
    }
    const body = (await res.json().catch(() => ({}))) as {
      id?: number;
      success?: boolean;
      pending?: boolean;
      amount_cents?: number;
    };
    if (body.id === undefined) {
      return { found: false, success: false, pending: false, transactionId: null, amountCents: null };
    }
    return {
      found: true,
      success: body.success === true,
      pending: body.pending === true,
      transactionId: String(body.id),
      amountCents: typeof body.amount_cents === "number" ? body.amount_cents : null,
    };
  } catch (err) {
    logger.error({ err, paymobOrderId }, "paymob: transaction inquiry error");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Webhook HMAC verification
// ---------------------------------------------------------------------------

// Paymob's transaction-processed webhook is authenticated by an HMAC-SHA512
// hex digest (sent as the `hmac` query param) over the concatenation of these
// fields of the transaction object, in exactly this (lexicographic) order.
const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function hmacValue(obj: Record<string, unknown>, path: string): string {
  let current: unknown = obj;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  if (current === undefined || current === null) return "";
  if (typeof current === "boolean") return current ? "true" : "false";
  return String(current);
}

/** Computes the expected HMAC for a webhook transaction object. */
export function computePaymobWebhookHmac(
  transactionObj: Record<string, unknown>,
  hmacSecret: string,
): string {
  const concatenated = HMAC_FIELDS.map((f) => hmacValue(transactionObj, f)).join("");
  return createHmac("sha512", hmacSecret).update(concatenated).digest("hex");
}

/**
 * Extracts a human-readable decline reason from a Paymob transaction webhook
 * object (success=false). Paymob puts the acquirer's response message and
 * code inside `data` (e.g. data.message = "Do not honour",
 * data.txn_response_code = "05"). Falls back to a generic code when absent.
 */
export function extractPaymobDeclineReason(
  transactionObj: Record<string, unknown>,
): string {
  const data =
    transactionObj.data && typeof transactionObj.data === "object"
      ? (transactionObj.data as Record<string, unknown>)
      : null;
  const message =
    data && typeof data.message === "string" && data.message.trim()
      ? data.message.trim()
      : null;
  const code =
    data && data.txn_response_code !== undefined && data.txn_response_code !== null
      ? String(data.txn_response_code).trim()
      : null;
  if (message && code && message !== code) {
    return `PAYMOB_DECLINED: ${message} (code ${code})`.slice(0, 500);
  }
  if (message) return `PAYMOB_DECLINED: ${message}`.slice(0, 500);
  if (code) return `PAYMOB_DECLINED: code ${code}`.slice(0, 500);
  return "PAYMOB_DECLINED";
}

/**
 * Verifies the HMAC signature of a Paymob transaction webhook. Constant-time
 * comparison; returns false when Paymob is not configured or the signature is
 * missing/malformed.
 */
export function verifyPaymobWebhookHmac(
  transactionObj: Record<string, unknown>,
  receivedHmac: string | undefined | null,
): boolean {
  const config = getPaymobConfig();
  if (!config || !receivedHmac) return false;
  const expected = computePaymobWebhookHmac(transactionObj, config.hmacSecret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(receivedHmac).toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
