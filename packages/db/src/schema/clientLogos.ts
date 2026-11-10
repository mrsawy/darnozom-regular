import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/** Logos shown in the "our clients" strip on the home page. Admin-managed. */
export const clientLogos = pgTable("client_logos", {
  id: serial("id").primaryKey(),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  nameAr: varchar("name_ar", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }).notNull().default(""),
  descriptionAr: text("description_ar").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  logoUrl: varchar("logo_url", { length: 1000 }).notNull().default(""),
  websiteUrl: varchar("website_url", { length: 1000 }).notNull().default(""),
  /** Logo is light/white artwork: render it on a dark card. */
  darkBackground: boolean("dark_background").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ClientLogo = typeof clientLogos.$inferSelect;
export type NewClientLogo = typeof clientLogos.$inferInsert;
