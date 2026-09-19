import { model } from "@medusajs/framework/utils";

export const DigitalProductFile = model.define("digital_product_file", {
  id: model.id().primaryKey(),
  // Relative key into the existing PRIVATE_OBJECT_DIR store
  // (apps/api/src/lib/storage/objectStore.ts) — never a public URL.
  relative_key: model.text(),
  checksum: model.text().nullable(),
});
