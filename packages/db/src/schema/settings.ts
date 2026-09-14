import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Generic admin-editable site settings, stored as typed key/value rows so new
// settings can be added from the admin UI without a schema migration. `value`
// is always stored as text and parsed per `valueType` by lib/settings.ts.
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  valueType: varchar("value_type", { length: 20 }).notNull().default("string"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by", { length: 255 }),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type NewSiteSetting = typeof siteSettings.$inferInsert;
