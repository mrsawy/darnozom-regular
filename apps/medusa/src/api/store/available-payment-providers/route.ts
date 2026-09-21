import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * Returns payment provider ids appropriate for the cart's region / destination.
 *
 * Preference order for "Egypt domestic" detection:
 * 1. Explicit ?country_code= query (storefront checkout)
 * 2. cart.shipping_address.country_code
 * 3. cart.region.currency_code === "egp" (storefront always uses EGP region)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = req.query as Record<string, string>;
  const cartId = q.cart_id;
  if (!cartId) {
    return res.status(400).json({ error: "Missing cart_id" });
  }

  const query = req.scope.resolve("query");
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "items.product.metadata",
      "shipping_address.country_code",
      "region.currency_code",
      "region.countries.iso_2",
    ],
    filters: { id: cartId },
  });

  const cart = data[0];
  if (!cart) {
    return res.status(404).json({ error: "Cart not found" });
  }

  const items = (cart.items ?? []) as Array<{
    product?: { metadata?: { kind?: string } };
  }>;
  const isDigitalOnly =
    items.length > 0 &&
    items.every((i) => i.product?.metadata?.kind === "digital");

  const explicitCountry = q.country_code?.toLowerCase();
  const addressCountry = (
    cart.shipping_address as { country_code?: string } | null
  )?.country_code?.toLowerCase();
  const regionCurrency = (
    cart.region as { currency_code?: string } | null
  )?.currency_code?.toLowerCase();
  const regionHasEg = (
    (cart.region as { countries?: Array<{ iso_2?: string }> } | null)
      ?.countries ?? []
  ).some((c) => c.iso_2?.toLowerCase() === "eg");

  const countryCode = explicitCountry || addressCountry;
  const shipsWithinEgypt =
    countryCode === "eg" ||
    (!countryCode && (regionCurrency === "egp" || regionHasEg));

  const providerIds =
    isDigitalOnly || !shipsWithinEgypt
      ? ["lemonsqueezy", "paypal-egp"]
      : ["paymob-card", "paymob-wallet", "cod", "paypal-egp"];

  return res.status(200).json({
    providerIds,
    region: {
      currency_code: regionCurrency ?? null,
      country_code: countryCode ?? null,
      shipsWithinEgypt,
      isDigitalOnly,
    },
  });
}
