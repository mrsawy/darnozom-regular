export type CheckoutPaymentMethod =
  | "paypal"
  | "card"
  | "wallet"
  | "cash_on_delivery";

/**
 * Medusa region payment provider ids look like `pp_{identifier}_{id}`
 * (for example `pp_paymob-card_paymob-card`). Map those to the Express
 * checkout methods this storefront can actually charge.
 */
export function checkoutMethodFromProviderId(
  providerId: string,
): CheckoutPaymentMethod | null {
  const id = providerId.toLowerCase();
  if (id.includes("paymob-wallet") || id.includes("paymob_wallet")) return "wallet";
  if (id.includes("paymob-card") || id.includes("paymob_card")) return "card";
  if (id.includes("paypal")) return "paypal";
  // `pp_cod_cod` — avoid matching unrelated ids that merely contain those letters.
  if (/(^|[_-])cod($|[_-])/.test(id)) return "cash_on_delivery";
  return null;
}

export function checkoutMethodsFromProviderIds(
  providerIds: string[],
): CheckoutPaymentMethod[] {
  const methods: CheckoutPaymentMethod[] = [];
  for (const providerId of providerIds) {
    const method = checkoutMethodFromProviderId(providerId);
    if (method && !methods.includes(method)) methods.push(method);
  }
  return methods;
}
