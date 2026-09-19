import { logger } from "./logger.js";

// PayPal REST integration.
//
// Credential resolution order (see getConnectionSettings):
//   1. Explicit API secrets: PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET
//      (+ optional PAYPAL_ENVIRONMENT, default "live"). This is the primary
//      path for this deployment — the account owner opted to supply Live REST
//      app credentials directly instead of authorizing the Replit connector.
//   2. Fallback: the Replit "paypal" connector credential proxy, if no secrets
//      are set.
//
// In both cases we fetch a fresh access token on every call (never cache it —
// tokens expire) and talk to the PayPal Orders v2 REST API directly.

interface PayPalConnectionSettings {
  access_token?: string;
  oauth?: {
    credentials?: {
      access_token?: string;
      client_id?: string;
      client_secret?: string;
    };
  };
  api_base_url?: string;
  environment?: string;
  sandbox?: boolean;
  client_id?: string;
  client_secret?: string;
  [key: string]: unknown;
}

function getReplitToken(): string | null {
  if (process.env.REPL_IDENTITY) return "repl " + process.env.REPL_IDENTITY;
  if (process.env.WEB_REPL_RENEWAL) return "depl " + process.env.WEB_REPL_RENEWAL;
  return null;
}

function getEnvSettings(): PayPalConnectionSettings | null {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  return {
    client_id: clientId,
    client_secret: clientSecret,
    environment: process.env.PAYPAL_ENVIRONMENT || "live",
  };
}

async function getConnectionSettings(): Promise<PayPalConnectionSettings> {
  // Prefer explicit API credentials provided as secrets, if present.
  const envSettings = getEnvSettings();
  if (envSettings) {
    return envSettings;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = getReplitToken();
  if (!hostname) {
    throw new Error("REPLIT_CONNECTORS_HOSTNAME is not set");
  }
  if (!token) {
    throw new Error("No Replit connector identity token available");
  }
  const res = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=paypal`,
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: token,
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Connector proxy returned ${res.status}`);
  }
  const data = (await res.json()) as {
    items?: Array<{ settings?: PayPalConnectionSettings }>;
  };
  const settings = data.items?.[0]?.settings;
  if (!settings) {
    throw new Error("PayPal connection is not configured");
  }
  return settings;
}

function resolveBaseUrl(settings: PayPalConnectionSettings): string {
  if (settings.api_base_url && /^https?:\/\//.test(settings.api_base_url)) {
    return settings.api_base_url.replace(/\/$/, "");
  }
  const env = (settings.environment || "").toLowerCase();
  const isSandbox =
    settings.sandbox === true ||
    env === "sandbox" ||
    env === "test" ||
    env === "development";
  return isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

interface PayPalAuth {
  accessToken: string;
  baseUrl: string;
}

async function getAuth(): Promise<PayPalAuth> {
  const settings = await getConnectionSettings();
  const baseUrl = resolveBaseUrl(settings);

  // Prefer a ready-made access token from the connector.
  const token =
    settings.access_token || settings.oauth?.credentials?.access_token;
  if (token) {
    return { accessToken: token, baseUrl };
  }

  // Fall back to client credentials (OAuth2 client_credentials grant).
  const clientId =
    settings.client_id || settings.oauth?.credentials?.client_id;
  const clientSecret =
    settings.client_secret || settings.oauth?.credentials?.client_secret;
  if (clientId && clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PayPal token request failed (${res.status}): ${text}`);
    }
    const body = (await res.json()) as { access_token?: string };
    if (!body.access_token) {
      throw new Error("PayPal token response missing access_token");
    }
    return { accessToken: body.access_token, baseUrl };
  }

  throw new Error("PayPal connection has no usable credentials");
}

export interface PayPalClientConfig {
  clientId: string;
  environment: "live" | "sandbox";
}

/**
 * Public client-side config for the PayPal JS SDK (Card Fields). The client id
 * is public by design; the secret never leaves the server. Returns null when
 * no explicit REST credentials are configured (the connector fallback has no
 * stable client id to expose, so card fields are simply unavailable then).
 */
export function getPayPalClientConfig(): PayPalClientConfig | null {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const env = (process.env.PAYPAL_ENVIRONMENT || "live").toLowerCase();
  const isSandbox = env === "sandbox" || env === "test" || env === "development";
  return { clientId, environment: isSandbox ? "sandbox" : "live" };
}

export interface CreatedPayPalOrder {
  id: string;
  approveUrl: string;
}

/**
 * Creates a PayPal order (intent=CAPTURE) intended for Advanced Card Fields.
 * Unlike the redirect flow, no approve/return URLs are involved — the buyer
 * enters card details inline and the JS SDK links the card (incl. any 3DS
 * challenge) to this order before our server captures it.
 */
export async function createPayPalCardOrder(params: {
  usdAmount: string;
  referenceId: string;
  description?: string;
}): Promise<{ id: string }> {
  const { accessToken, baseUrl } = await getAuth();
  const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.referenceId,
          description: params.description?.slice(0, 127),
          amount: {
            currency_code: "USD",
            value: params.usdAmount,
          },
        },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ status: res.status, text }, "paypal: create card order failed");
    throw new Error(`PayPal create card order failed (${res.status})`);
  }
  const body = (await res.json()) as { id?: string };
  if (!body.id) {
    throw new Error("PayPal create card order response missing id");
  }
  return { id: body.id };
}

/**
 * Creates a PayPal order (intent=CAPTURE) for the given USD amount and returns
 * the PayPal order id + the approval URL the buyer must be redirected to.
 */
export async function createPayPalOrder(params: {
  usdAmount: string;
  referenceId: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<CreatedPayPalOrder> {
  const { accessToken, baseUrl } = await getAuth();
  const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.referenceId,
          description: params.description?.slice(0, 127),
          amount: {
            currency_code: "USD",
            value: params.usdAmount,
          },
        },
      ],
      application_context: {
        brand_name: "DarNozom",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ status: res.status, text }, "paypal: create order failed");
    throw new Error(`PayPal create order failed (${res.status})`);
  }
  const body = (await res.json()) as {
    id?: string;
    links?: Array<{ rel: string; href: string }>;
  };
  const id = body.id;
  const approveUrl = body.links?.find((l) => l.rel === "approve")?.href;
  if (!id || !approveUrl) {
    throw new Error("PayPal create order response missing id/approve link");
  }
  return { id, approveUrl };
}

export interface PayPalCaptureResult {
  captured: boolean;
  captureId: string | null;
  status: string;
  /**
   * True when this capture did not charge the buyer now because the order had
   * already been captured previously (double-capture / retry / race). The buyer
   * was still charged exactly once — just not by this call.
   */
  alreadyCaptured?: boolean;
  /**
   * True when PayPal rejected the capture with a definitive, non-retryable
   * issue (e.g. COMPLIANCE_VIOLATION — any charged amount is auto-refunded by
   * PayPal). Retrying the same capture can never succeed, so callers should
   * mark the order's payment as terminally failed instead of leaving it
   * pending forever.
   */
  permanentFailure?: boolean;
  /** The PayPal issue code behind a failed capture, when one was returned. */
  failureIssue?: string | null;
}

// PayPal issue codes that can never succeed on retry for the same order.
// Anything else (network blips, PAYER_ACTION_REQUIRED, etc.) stays retryable.
const PERMANENT_CAPTURE_ISSUES = new Set([
  "COMPLIANCE_VIOLATION",
  "PAYEE_ACCOUNT_RESTRICTED",
  "PAYEE_ACCOUNT_LOCKED_OR_CLOSED",
  "PAYER_ACCOUNT_RESTRICTED",
  "PAYER_ACCOUNT_LOCKED_OR_CLOSED",
  "TRANSACTION_BLOCKED_BY_PAYEE",
  "TRANSACTION_REFUSED",
]);

interface PayPalOrderBody {
  status?: string;
  details?: Array<{ issue?: string }>;
  purchase_units?: Array<{
    payments?: { captures?: Array<{ id?: string; status?: string }> };
  }>;
}

/**
 * Fetches a PayPal order and extracts a COMPLETED capture, if any. Used to
 * reconcile the payment state after an ORDER_ALREADY_CAPTURED response so we can
 * recover the existing capture id instead of double-charging.
 */
async function fetchExistingCapture(
  paypalOrderId: string,
  accessToken: string,
  baseUrl: string,
): Promise<PayPalCaptureResult | null> {
  try {
    const res = await fetch(
      `${baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    const body = (await res.json().catch(() => ({}))) as PayPalOrderBody;
    const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
    if (capture?.status === "COMPLETED") {
      return {
        captured: true,
        captureId: capture.id ?? null,
        status: "COMPLETED",
        alreadyCaptured: true,
      };
    }
    return null;
  } catch (err) {
    logger.error({ err, paypalOrderId }, "paypal: fetch existing capture failed");
    return null;
  }
}

export interface PayPalOrderStatus {
  /** Raw PayPal order status: CREATED | APPROVED | COMPLETED | VOIDED | ... */
  status: string;
  /**
   * A COMPLETED capture already recorded on the PayPal order, if any. Present
   * when the money was captured on PayPal's side (e.g. the buyer paid but never
   * returned to us) so the reconciler can flip the local order to paid without
   * re-charging.
   */
  capture: PayPalCaptureResult | null;
}

/**
 * Looks up a PayPal order and returns its current status plus any COMPLETED
 * capture. Read-only (never charges). Returns null on network/auth failure so
 * the caller can safely retry on the next reconciliation pass.
 */
export async function getPayPalOrderStatus(
  paypalOrderId: string,
): Promise<PayPalOrderStatus | null> {
  try {
    const { accessToken, baseUrl } = await getAuth();
    const res = await fetch(
      `${baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      logger.warn(
        { status: res.status, paypalOrderId },
        "paypal: order lookup failed",
      );
      return null;
    }
    const body = (await res.json().catch(() => ({}))) as PayPalOrderBody;
    const cap = body.purchase_units?.[0]?.payments?.captures?.[0];
    const capture: PayPalCaptureResult | null =
      cap?.status === "COMPLETED"
        ? {
            captured: true,
            captureId: cap.id ?? null,
            status: "COMPLETED",
            alreadyCaptured: true,
          }
        : null;
    return { status: body.status || "UNKNOWN", capture };
  } catch (err) {
    logger.error({ err, paypalOrderId }, "paypal: order lookup error");
    return null;
  }
}

/**
 * Captures a previously-approved PayPal order. Returns whether the capture
 * completed and the capture id (used as the payment reference).
 *
 * Idempotent: if the order was already captured (a retried/duplicate capture,
 * a lost-response race, or a double-click), PayPal replies 422
 * ORDER_ALREADY_CAPTURED. That is a success, not a failure — the buyer was
 * charged exactly once — so we reconcile the existing capture and report it as
 * captured with `alreadyCaptured: true`.
 */
export async function capturePayPalOrder(
  paypalOrderId: string,
): Promise<PayPalCaptureResult> {
  const { accessToken, baseUrl } = await getAuth();
  const res = await fetch(
    `${baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );
  const body = (await res.json().catch(() => ({}))) as PayPalOrderBody;
  if (!res.ok) {
    const alreadyCaptured = body?.details?.some(
      (d) => d.issue === "ORDER_ALREADY_CAPTURED",
    );
    if (alreadyCaptured) {
      logger.warn(
        { paypalOrderId },
        "paypal: order already captured — reconciling instead of recharging",
      );
      const existing = await fetchExistingCapture(
        paypalOrderId,
        accessToken,
        baseUrl,
      );
      if (existing) return existing;
      // The capture exists but we couldn't resolve its id; still treat as paid
      // so the buyer isn't shown a false failure and never re-charged.
      return {
        captured: true,
        captureId: null,
        status: "COMPLETED",
        alreadyCaptured: true,
      };
    }
    const failureIssue =
      body?.details?.find((d) => d.issue)?.issue ?? null;
    const permanentFailure = Boolean(
      failureIssue && PERMANENT_CAPTURE_ISSUES.has(failureIssue),
    );
    logger.error(
      { status: res.status, body, failureIssue, permanentFailure },
      "paypal: capture failed",
    );
    return {
      captured: false,
      captureId: null,
      status: body?.status || "FAILED",
      permanentFailure,
      failureIssue,
    };
  }
  const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
  const completed =
    body.status === "COMPLETED" && capture?.status === "COMPLETED";
  return {
    captured: Boolean(completed),
    captureId: capture?.id ?? null,
    status: body.status || "UNKNOWN",
  };
}
