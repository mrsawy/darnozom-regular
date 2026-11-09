import { index, pgEnum, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const newsletterStatusEnum = pgEnum("newsletter_status", ["pending", "confirmed", "unsubscribed"]);

/**
 * Email newsletter subscribers. Double opt-in: a row is `pending` until the
 * address owner clicks the confirm link. Emails are stored lowercased.
 */
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    status: newsletterStatusEnum("status").notNull().default("pending"),
    locale: varchar("locale", { length: 2 }).notNull().default("ar"),
    confirmToken: varchar("confirm_token", { length: 64 }).notNull(),
    unsubscribeToken: varchar("unsubscribe_token", { length: 64 }).notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("newsletter_subscribers_email_uq").on(t.email),
    uniqueIndex("newsletter_subscribers_confirm_token_uq").on(t.confirmToken),
    uniqueIndex("newsletter_subscribers_unsub_token_uq").on(t.unsubscribeToken),
    index("newsletter_subscribers_status_idx").on(t.status),
  ],
);

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
