import { model } from "@medusajs/framework/utils";

// One downloadable file (PDF, EPUB, MP3, ZIP, …) of a book's digital
// variant. A variant can have many. `relative_key` points into the private
// object store (book-files/<variant_id>/…) — never a public URL.
export const DigitalBookFile = model
  .define("digital_book_file", {
    id: model.id().primaryKey(),
    variant_id: model.text(),
    title: model.text(),
    file_name: model.text(),
    relative_key: model.text(),
    mime_type: model.text(),
    size: model.number(),
    sort_order: model.number().default(0),
  })
  .indexes([{ on: ["variant_id"] }]);
