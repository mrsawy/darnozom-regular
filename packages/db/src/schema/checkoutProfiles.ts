import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Last-used checkout contact details per authenticated user (users.id).
// Upserted whenever an order is placed so returning customers get their
// name/phone/city/address pre-filled on the next checkout. Notes are
// intentionally NOT stored (order-specific).
export const checkoutProfiles = pgTable("checkout_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 120 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CheckoutProfile = typeof checkoutProfiles.$inferSelect;
export type NewCheckoutProfile = typeof checkoutProfiles.$inferInsert;
