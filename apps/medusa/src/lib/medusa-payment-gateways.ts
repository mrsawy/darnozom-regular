// apps/medusa has no "type": "module" (CJS, per create-medusa-app's scaffold),
// but @workspace/payment-gateways is ESM ("type": "module", matching the rest
// of the workspace's convention). A static `import { x } from "@workspace/payment-gateways"`
// fails at Medusa's CJS-based module-provider-loading time with
// "Must use import to load ES Module". Dynamic import() works in CJS and defers
// resolution to runtime, so this file lazily loads the real module on first use
// and caches it. Mirrors the same pattern used for @workspace/object-store in
// ./medusa-object-store.ts.

import type {
  createPaymobCheckout as CreatePaymobCheckout,
  verifyPaymobWebhookHmac as VerifyPaymobWebhookHmac,
  extractPaymobDeclineReason as ExtractPaymobDeclineReason,
} from "@workspace/payment-gateways" with { "resolution-mode": "import" };

type PaymentGatewaysModule = typeof import("@workspace/payment-gateways", { with: { "resolution-mode": "import" } });

let cached: PaymentGatewaysModule | null = null;

async function loadPaymentGateways(): Promise<PaymentGatewaysModule> {
  if (!cached) {
    cached = await import("@workspace/payment-gateways");
  }
  return cached;
}

export async function createPaymobCheckout(
  ...args: Parameters<typeof CreatePaymobCheckout>
): Promise<ReturnType<typeof CreatePaymobCheckout>> {
  const mod = await loadPaymentGateways();
  return mod.createPaymobCheckout(...args);
}

export async function verifyPaymobWebhookHmac(
  ...args: Parameters<typeof VerifyPaymobWebhookHmac>
): Promise<ReturnType<typeof VerifyPaymobWebhookHmac>> {
  const mod = await loadPaymentGateways();
  return mod.verifyPaymobWebhookHmac(...args);
}

export async function extractPaymobDeclineReason(
  ...args: Parameters<typeof ExtractPaymobDeclineReason>
): Promise<ReturnType<typeof ExtractPaymobDeclineReason>> {
  const mod = await loadPaymentGateways();
  return mod.extractPaymobDeclineReason(...args);
}
