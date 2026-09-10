import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }),
  addedByEmail: varchar("added_by_email", { length: 255 }),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

export const adminUserEvents = pgTable("admin_user_events", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 32 }).notNull(),
  targetEmail: varchar("target_email", { length: 255 }).notNull(),
  actorEmail: varchar("actor_email", { length: 255 }),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminUserEvent = typeof adminUserEvents.$inferSelect;
export type NewAdminUserEvent = typeof adminUserEvents.$inferInsert;
