import { model } from "@medusajs/framework/utils";

export const Entitlement = model.define("entitlement", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  variant_id: model.text(),
  order_id: model.text(),
});
