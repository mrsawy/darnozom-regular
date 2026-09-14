import { boolean, numeric, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const shippingRates = pgTable("shipping_rates", {
  id: serial("id").primaryKey(),
  city: varchar("city", { length: 200 }).notNull().unique(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ShippingRate = typeof shippingRates.$inferSelect;
export type NewShippingRate = typeof shippingRates.$inferInsert;
