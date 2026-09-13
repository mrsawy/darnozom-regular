/**
 * Better Auth tables.
 *
 * These four tables are the contract Better Auth's Drizzle adapter expects.
 * The adapter is configured with `usePlural: true`, so it looks for the export
 * keys `users` / `sessions` / `accounts` / `verifications` below rather than
 * the singular names it uses internally.
 *
 * `users` is the ONLY user table in this schema — there is no separate app-side
 * profile row. The app-specific columns (`role`, `client_id`, `tenant_id`) ride
 * along as Better Auth `additionalFields`; see apps/api/src/lib/auth.ts.
 *
 * Columns Better Auth owns are fixed by the adapter and must not be renamed.
 */
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { tenants } from "./tenants";

/**
 * Single source of truth for authorization. Replaces the old two-value enum
 * plus `users.is_super_admin` plus the `admin_users` allowlist plus Clerk's
 * `publicMetadata.isAdmin` — all four collapsed into this one column.
 */
export const userRoleEnum = pgEnum("user_role", [
  "client",
  "consultant",
  "admin",
  "super_admin",
]);

export type UserRole = (typeof userRoleEnum.enumValues)[number];

export const users = pgTable("users", {
  // Better Auth generates its own string ids; never a serial.
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),

  // --- additionalFields (all `input: false` server-side, so a sign-up request
  // --- can never set them) ---
  role: userRoleEnum("role").notNull().default("client"),
  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  tenantId: integer("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
  }),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

/**
 * One row per authentication method. A password account has
 * `provider_id = 'credential'` and the argon2 hash in `password`; a Google
 * sign-in adds a second row with `provider_id = 'google'`.
 */
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Backs email verification, password reset, and email OTP tokens. */
export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
