import { model } from "@medusajs/framework/utils";

// Scholarly metadata for one book product (one row per product). Lists are
// JSON arrays of strings. ISBN / external_id are unique so the ChatGPT API
// can upsert without creating duplicates.
export const BookProfile = model
  .define("book_profile", {
    id: model.id().primaryKey(),
    product_id: model.text().unique(),
    authors: model.json().nullable(),
    editors: model.json().nullable(),
    translators: model.json().nullable(),
    publisher: model.text().nullable(),
    isbn: model.text().nullable(),
    external_id: model.text().nullable(),
    publication_year: model.number().nullable(),
    edition_number: model.number().nullable(),
    pages: model.number().nullable(),
    volumes: model.number().default(1),
    language: model.enum(["ar", "en", "both"]).default("ar"),
    primary_category_id: model.text().nullable(),
    keywords: model.json().nullable(),
    target_audience: model.text().nullable(),
    table_of_contents: model.text().nullable(),
    digital_rights: model.boolean().default(false),
  })
  .indexes([
    { on: ["isbn"], unique: true, where: "isbn IS NOT NULL" },
    { on: ["external_id"], unique: true, where: "external_id IS NOT NULL" },
  ]);
