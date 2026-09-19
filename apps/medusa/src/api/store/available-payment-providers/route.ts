import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cartId = (req.query as Record<string, string>).cart_id;
  if (!cartId) {
    return res.status(400).json({ error: "Missing cart_id" });
  }

  const query = req.scope.resolve("query");
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "items.product.metadata", "shipping_address.country_code"],
    filters: { id: cartId },
  });

  const cart = data[0];
  if (!cart) {
    return res.status(404).json({ error: "Cart not found" });
  }

  const items = (cart.items ?? []) as Array<{ product?: { metadata?: { kind?: string } } }>;
  const isDigitalOnly = items.length > 0 && items.every((i) => i.product?.metadata?.kind === "digital");
  const countryCode = (cart.shipping_address as any)?.country_code?.toLowerCase();
  const shipsWithinEgypt = countryCode === "eg";

  const providerIds =
    isDigitalOnly || !shipsWithinEgypt
      ? ["lemonsqueezy", "paypal-egp"]
      : ["paymob-card", "paymob-wallet", "cod", "paypal-egp"];

  return res.status(200).json({ providerIds });
}
