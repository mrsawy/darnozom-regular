import { model } from "@medusajs/framework/utils";

// Display settings for the manual-transfer payment methods (Vodafone Cash,
// InstaPay). One row per `code`. Editable from Medusa Admin (Settings →
// Manual payments) and the storefront admin (proxied through Express).
export const ManualPaymentMethod = model.define("manual_payment_method", {
  id: model.id().primaryKey(),
  code: model.text().unique(),
  account_number: model.text().nullable(),
  account_name: model.text().nullable(),
  whatsapp_number: model.text().nullable(),
  instapay_address: model.text().nullable(),
  qr_image_url: model.text().nullable(),
  instructions_ar: model.text().nullable(),
  instructions_en: model.text().nullable(),
});
