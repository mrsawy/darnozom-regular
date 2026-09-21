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

/** Medusa Admin dashboard URL (Create Book, products, regions, …). */
export function getMedusaAdminUrl(): string {
  const base = (
    import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9010"
  ).replace(/\/$/, "");
  return `${base}/app`;
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

/**
 * Payment methods enabled on the cart's Medusa region
 * (Admin → Settings → Regions → Payment Providers).
 */
export async function fetchAvailablePaymentMethods(
  regionId: string,
): Promise<StorePaymentMethod[]> {
  const { payment_providers } = await getMedusaClient().store.payment.listPaymentProviders({
    region_id: regionId,
  });
  const methods = (payment_providers ?? [])
    .map((provider) => checkoutMethodFromRawId(provider.id))
    .filter((method): method is StorePaymentMethod => !!method);
  return [...new Set(methods)];
}

function checkoutMethodFromRawId(providerId: string): StorePaymentMethod | null {
  const id = providerId.toLowerCase();
  if (id.includes("paymob-wallet")) return "wallet";
  if (id.includes("paymob-card")) return "card";
  if (id.includes("paypal")) return "paypal";
  if (/(^|[_-])cod($|[_-])/.test(id)) return "cash_on_delivery";
  return null;
}
