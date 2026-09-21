import Medusa from "@medusajs/js-sdk";

const TOKEN_STORAGE_KEY = "medusa_customer_token";

export function getMedusaCustomerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setMedusaCustomerToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage unavailable (private browsing etc.) — session simply
    // won't persist across reloads; not fatal.
  }
}

let cachedClient: Medusa | null = null;
let cachedRegionId: Promise<string> | null = null;

export function getMedusaClient(): Medusa {
  if (cachedClient) return cachedClient;
  cachedClient = new Medusa({
    baseUrl: import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9010",
    publishableKey: import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY,
  });
  return cachedClient;
}

/** Region required by Store API calls that request calculated_price. Prefers EGP. */
export function getStoreRegionId(): Promise<string> {
  if (!cachedRegionId) {
    cachedRegionId = getMedusaClient()
      .store.region.list({ limit: 50 })
      .then(({ regions }) => {
        const egp = regions.find((region) => region.currency_code === "egp");
        const region = egp ?? regions[0];
        if (!region) throw new Error("No Medusa region is configured");
        return region.id;
      })
      .catch((error) => {
        cachedRegionId = null;
        throw error;
      });
  }
  return cachedRegionId;
}

export type StorePaymentMethod =
  | "paypal"
  | "card"
  | "wallet"
  | "cash_on_delivery";

const PROVIDER_TO_METHOD: Record<string, StorePaymentMethod> = {
  "paypal-egp": "paypal",
  "paymob-card": "card",
  "paymob-wallet": "wallet",
  cod: "cash_on_delivery",
};

/**
 * Asks Medusa which payment providers apply to this cart / destination.
 * Maps provider ids to the Express checkout paymentMethod union.
 */
export async function fetchAvailablePaymentMethods(input: {
  cartId: string;
  countryCode?: string | null;
}): Promise<StorePaymentMethod[]> {
  const base =
    import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9010";
  const key = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY;
  const params = new URLSearchParams({ cart_id: input.cartId });
  if (input.countryCode) params.set("country_code", input.countryCode);
  const res = await fetch(
    `${base.replace(/\/$/, "")}/store/available-payment-providers?${params}`,
    {
      headers: key ? { "x-publishable-api-key": key } : undefined,
    },
  );
  if (!res.ok) throw new Error(`available-payment-providers failed (${res.status})`);
  const body = (await res.json()) as { providerIds?: string[] };
  const methods = (body.providerIds ?? [])
    .map((id) => PROVIDER_TO_METHOD[id])
    .filter((m): m is StorePaymentMethod => !!m);
  // De-dupe while preserving order
  return [...new Set(methods)];
}
