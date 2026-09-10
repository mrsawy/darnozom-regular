import { boolean, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const appPlatformEnum = pgEnum("app_platform", ["web", "ios", "android", "all"]);
export const appPricingEnum = pgEnum("app_pricing", ["free", "subscription", "one_time", "request"]);
export const appStatusEnum = pgEnum("app_status", ["live", "beta", "coming_soon"]);

export const storeApps = pgTable("store_apps", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  nameAr: varchar("name_ar", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  taglineAr: varchar("tagline_ar", { length: 500 }),
  taglineEn: varchar("tagline_en", { length: 500 }),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  iconUrl: text("icon_url"),
  category: varchar("category", { length: 100 }).default("productivity"),
  platform: appPlatformEnum("platform").notNull().default("web"),
  pricing: appPricingEnum("pricing").notNull().default("request"),
  price: varchar("price", { length: 50 }),
  currency: varchar("currency", { length: 10 }).default("SAR"),
  status: appStatusEnum("status").notNull().default("live"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isNewRelease: boolean("is_new_release").notNull().default(false),
  webUrl: text("web_url"),
  iosUrl: text("ios_url"),
  androidUrl: text("android_url"),
  detailsUrl: text("details_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type StoreApp = typeof storeApps.$inferSelect;
export type NewStoreApp = typeof storeApps.$inferInsert;
