import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "./logger.js";

const LEMONSQUEEZY_BASE_URL = "https://api.lemonsqueezy.com/v1";

export interface LemonSqueezyCheckout {
  checkoutId: string;
  checkoutUrl: string;
}

export function getLemonSqueezyConfig() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!apiKey || !storeId || !webhookSecret) return null;
  return { apiKey, storeId, webhookSecret };
}

export async function createLemonSqueezyCheckout(params: {
  variantId: string;
  amountCents: number;
  customerEmail: string;
  redirectUrl: string;
}): Promise<LemonSqueezyCheckout> {
  const config = getLemonSqueezyConfig();
  if (!config) throw new Error("Lemon Squeezy is not configured");

  const res = await fetch(`${LEMONSQUEEZY_BASE_URL}/checkouts`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: { email: params.customerEmail },
          product_options: { redirect_url: params.redirectUrl },
        },
        relationships: {
          store: { data: { type: "stores", id: config.storeId } },
          variant: { data: { type: "variants", id: params.variantId } },
        },
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ status: res.status, text }, "lemonsqueezy: create checkout failed");
    throw new Error(`Lemon Squeezy create checkout failed (${res.status})`);
  }

  const body = (await res.json()) as {
    data: { id: string; attributes: { url: string } };
  };
  return { checkoutId: body.data.id, checkoutUrl: body.data.attributes.url };
}

export function verifyLemonSqueezyWebhookSignature(
  rawBody: string,
  signature: string | undefined,
): boolean {
  const config = getLemonSqueezyConfig();
  if (!config || !signature) return false;
  const expected = createHmac("sha256", config.webhookSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
