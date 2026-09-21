import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { checkoutMethodsFromProviderIds } from "../../../lib/region-payment-methods";

/**
 * Payment methods for checkout = the providers enabled on the cart's Medusa
 * region (Admin → Settings → Regions), not a fixed list.
 * Cash on delivery is removed when every line is a digital product, because
 * the Express checkout cannot collect COD for digital files.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cartId = (req.query as Record<string, string>).cart_id;
  if (!cartId) {
    return res.status(400).json({ error: "Missing cart_id" });
  }

  const query = req.scope.resolve("query");
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "region_id",
      "items.product.metadata",
      "items.variant.metadata",
    ],
    filters: { id: cartId },
  });

  const cart = data[0] as
    | {
        id: string;
        region_id?: string | null;
        items?: Array<{
          product?: { metadata?: { kind?: string } | null } | null;
          variant?: { metadata?: { kind?: string } | null } | null;
        }> | null;
      }
    | undefined;

  if (!cart) {
    return res.status(404).json({ error: "Cart not found" });
  }
  if (!cart.region_id) {
    return res.status(200).json({ providerIds: [], methods: [] });
  }

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code", "payment_providers.id", "payment_providers.is_enabled"],
    filters: { id: cart.region_id },
  });

  const region = regions[0] as
    | {
        id: string;
        currency_code?: string | null;
        payment_providers?: Array<{ id: string; is_enabled?: boolean | null }> | null;
      }
    | undefined;

  const providerIds = (region?.payment_providers ?? [])
    .filter((provider) => provider.is_enabled !== false)
    .map((provider) => provider.id);

  let methods = checkoutMethodsFromProviderIds(providerIds);

  const items = cart.items ?? [];
  const isDigitalOnly =
    items.length > 0 &&
    items.every((item) => {
      const variantKind = item.variant?.metadata?.kind;
      const productKind = item.product?.metadata?.kind;
      return variantKind === "digital" || productKind === "digital";
    });
  if (isDigitalOnly) {
    methods = methods.filter((method) => method !== "cash_on_delivery");
  }

  return res.status(200).json({
    providerIds,
    methods,
    region: {
      id: cart.region_id,
      currency_code: region?.currency_code ?? null,
      isDigitalOnly,
    },
  });
}
