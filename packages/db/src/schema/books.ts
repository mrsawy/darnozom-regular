import { boolean, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const bookStatusEnum = pgEnum("book_status", ["available", "coming_soon", "out_of_stock"]);
export const bookFormatEnum = pgEnum("book_format", ["online", "hardcopy", "both"]);
export const bookLanguageEnum = pgEnum("book_language", ["ar", "en", "both"]);

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  titleEn: varchar("title_en", { length: 500 }),
  author: varchar("author", { length: 255 }),
  description: text("description"),
  descriptionEn: text("description_en"),
  coverImageUrl: text("cover_image_url"),
  // Stored as plain text in the DB (existing rows include "other", which the
  // old pg enum lacked — converting the column would fail). The enum list here
  // is TypeScript-level only.
  category: text("category", { enum: ["shariah", "management", "digital_transformation", "other"] })
    .notNull()
    .default("management"),
  format: bookFormatEnum("format").notNull().default("online"),
  language: bookLanguageEnum("language").notNull().default("ar"),
  pages: varchar("pages", { length: 20 }),
  isbn: varchar("isbn", { length: 50 }),
  // Legacy single-price fields kept as fallback for read-paths.
  price: varchar("price", { length: 50 }),
  currency: varchar("currency", { length: 10 }).default("EGP"),
  // New separate paper / digital availability + pricing.
  paperAvailable: boolean("paper_available").notNull().default(false),
  paperPrice: varchar("paper_price", { length: 50 }),
  digitalAvailable: boolean("digital_available").notNull().default(false),
  digitalPrice: varchar("digital_price", { length: 50 }),
  digitalFileUrl: text("digital_file_url"),
  status: bookStatusEnum("status").notNull().default("available"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isNewRelease: boolean("is_new_release").notNull().default(false),
  externalUrl: text("external_url"),
  buyLink: text("buy_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
