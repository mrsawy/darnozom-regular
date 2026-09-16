import { model } from "@medusajs/framework/utils";

export const CityRate = model.define("city_rate", {
  id: model.id().primaryKey(),
  city: model.text().unique(),
  price: model.number(), // minor currency units, matching Medusa's amount convention
  currency: model.text(),
  is_default: model.boolean().default(false),
});
