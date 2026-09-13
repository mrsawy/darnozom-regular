import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Audit log for admin grants and revocations.
 *
 * The `admin_users` allowlist this used to accompany is gone: admin access is
 * now `users.role`, so there is no second table to keep in sync. The log stays
 * because "who promoted whom, and when" is not recoverable from a role column.
 */
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
