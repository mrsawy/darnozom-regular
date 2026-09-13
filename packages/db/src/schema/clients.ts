import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  organization: varchar("organization", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  challenges: text("challenges").notNull(),
  goals: text("goals").notNull(),
  context: text("context"),
  selfRegistered: boolean("self_registered").notNull().default(false),
  /** Owning auth user (`users.id`), set when a client self-registers. */
  ownerUserId: text("owner_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
