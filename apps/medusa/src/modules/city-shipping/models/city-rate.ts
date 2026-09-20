import { model } from "@medusajs/framework/utils";

export const CityRate = model.define("city_rate", {
  id: model.id().primaryKey(),
  city: model.text().unique(),
  // Decimal major units (e.g. 50 means 50.00 EGP) — matching Medusa v2's own
  // Money convention for `calculated_amount` (v2 changed from v1's cents-based
  // amounts to decimals; see product variant `prices[]` and
  // migrate-books.ts). Previously stored ×100 as if amounts were minor units,
  // which fulfillment-provider.ts then returned unconverted as
  // `calculated_amount` — a 100x inflation had this module ever been wired
  // into checkout. Not live yet (storefront checkout uses the separate
  // Express /api/shipping-rates table instead), so no data migration needed.
  price: model.number(),
  currency: model.text(),
  is_default: model.boolean().default(false),
});
