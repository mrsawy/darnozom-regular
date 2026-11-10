import { boolean, index, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * First-party page-view log (cookieless, no IP stored). `visitorId` is a random
 * id kept in the visitor's localStorage; `sessionId` is per-tab-session.
 */
export const pageViews = pgTable(
  "page_views",
  {
    id: serial("id").primaryKey(),
    visitorId: varchar("visitor_id", { length: 64 }).notNull(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    path: varchar("path", { length: 512 }).notNull(),
    referrerHost: varchar("referrer_host", { length: 255 }),
    device: varchar("device", { length: 16 }).notNull().default("desktop"),
    browser: varchar("browser", { length: 32 }),
    os: varchar("os", { length: 32 }),
    country: varchar("country", { length: 2 }),
    isBot: boolean("is_bot").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("page_views_created_at_idx").on(t.createdAt),
    index("page_views_visitor_idx").on(t.visitorId),
    index("page_views_path_idx").on(t.path),
  ],
);

export type PageView = typeof pageViews.$inferSelect;
