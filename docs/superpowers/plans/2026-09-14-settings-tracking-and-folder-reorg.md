# Site Settings, Order Tracking, and Folder Reorg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the API `lib/`, DB `schema/`, and client `pages/admin/` folders into domain-grouped subfolders (pure moves, no behavior change), then add an admin-editable site-settings mechanism seeded with a default shipping cost/currency, and per-order carrier + tracking URL fields visible to admins and customers.

**Architecture:** Folder moves happen first and are commit-isolated from feature work. The settings feature is a new `site_settings` key-value table + `lib/settings.ts` helper + `admin/settings` routes + admin page, additive and independent of the existing `shippingRates.isDefault` mechanism. Order tracking extends the existing generic `PUT /admin/orders/:id` handler (which already whitelists partial updates) rather than adding a new endpoint, and surfaces on the customer account page using the existing bilingual `COPY` pattern.

**Tech Stack:** Express + TypeScript (API), Drizzle ORM + Postgres (`packages/db`), React + TanStack Query + wouter (client), Vitest + Supertest (tests).

**Spec:** `docs/superpowers/specs/2026-09-14-settings-tracking-and-folder-reorg-design.md`

## Global Constraints

- All DB schema changes go in `packages/db/src/schema/*.ts`; the deploy mechanism is `drizzle-kit push` (schema diff), not applied migration files — but this repo also keeps a hand-written changelog of `.sql` files under `packages/db/drizzle/` (numbered, `IF NOT EXISTS`/idempotent style, `--> statement-breakpoint` separators) plus a `meta/_journal.json` entry per file. Every schema change task adds both.
- `shippingRates` and its `isDefault` invariant (enforced in `routes/shipping-rates/index.ts`) must not be touched or altered by this work — the new settings feature is additive only.
- All new admin routes require `requireAdmin` from `middlewares/adminAuth.ts`.
- All new client-facing text in `apps/client/src` follows the existing bilingual `COPY = { ar: {...}, en: {...} }` object pattern already used in the files being edited — never hardcode a single-language string into new JSX in `account.tsx`.
- Folder-move tasks change only file paths and import paths — no line of moved-file content changes except the import statements that reference other moved files.
- Every task that touches `apps/api/src` ends by running `pnpm --filter @workspace/api-server exec vitest run` (or the narrower single-file form shown in that task) and every task that touches `apps/client/src` ends by running `pnpm --filter @workspace/client exec tsc --noEmit` (client has no unit test suite — type-check is the verification gate).

---

## File Structure Overview

**New files:**
- `packages/db/src/schema/shipping.ts` — `shippingRates` table, moved out of `books.ts`
- `packages/db/src/schema/settings.ts` — new `siteSettings` table
- `packages/db/drizzle/0012_shipping_settings_tracking.sql` — changelog SQL for both new/changed tables
- `apps/api/src/lib/settings.ts` — `getSettings`/`updateSettings` helpers
- `apps/api/src/lib/settings.test.ts` — tests for the helpers
- `apps/api/src/routes/admin/settings.ts` — `GET`/`PUT /admin/settings`
- `apps/api/src/routes/admin/settings.test.ts` — route tests
- `apps/client/src/pages/admin/store/settings.tsx` — admin settings page

**Moved files (content unchanged except internal import paths):**
- `packages/db/src/schema/books.ts` (shippingRates removed)
- `apps/api/src/lib/{paymob,paypal,reconcilePaymobOrders,reconcilePayPalOrders,reconcilePayPalOrders.test}.ts` → `apps/api/src/lib/payments/`
- `apps/api/src/lib/{email,authEmail,consultationEmail,orderPaidNotifications}.ts` → `apps/api/src/lib/email/`
- `apps/api/src/lib/{objectStore,objectStorage,objectAcl}.ts` → `apps/api/src/lib/storage/`
- `apps/api/src/lib/{seedAdminUsers,seedDevUsers,seedJobOpenings,seedStoreApps}.ts` → `apps/api/src/lib/seed/`
- `apps/client/src/pages/admin/{orders,shipping,books,store-courses}.tsx` → `apps/client/src/pages/admin/store/`
- `apps/client/src/pages/admin/{academy,registrations}.tsx` → `apps/client/src/pages/admin/academy/`
- `apps/client/src/pages/admin/{admins,job-applications}.tsx` → `apps/client/src/pages/admin/people/`

**Modified files:**
- `packages/db/src/schema/index.ts` — barrel exports for `shipping.ts`, `settings.ts`
- `packages/db/src/schema/orders.ts` — add `trackingUrl`, `trackingCarrier`, `shippedAt`
- `packages/db/drizzle/meta/_journal.json` — new entry
- `apps/api/src/index.ts` — updated imports (seed, reconcile)
- `apps/api/src/routes/orders/index.ts` — updated imports (payments, email, storage); `PUT /admin/orders/:id` accepts tracking fields
- `apps/api/src/routes/{academy/applications,assessments,contact,email,job-applications,orchestrator,reports,rfp}/index.ts` — updated `email` import path
- `apps/api/src/routes/consultations/index.ts` — updated `consultationEmail` import path
- `apps/api/src/routes/{admin,books,job-applications,storage}` — updated `objectStore` import path
- `apps/api/src/routes/{conversations/attachments,conversations/index,reports/attachments,storage}` — updated `objectStorage` import path
- `apps/api/src/scripts/seedDevUsers.ts` — updated `seedDevUsers` import path
- `apps/api/src/lib/auth.ts` — updated `authEmail` import path
- `apps/api/src/routes/admin/index.ts` — mounts new `settings.ts` router
- `apps/client/src/App.tsx` — updated import paths for all moved admin pages
- `apps/client/src/pages/admin/layout.tsx` — new `NAV_ITEMS` entry for Settings
- `apps/client/src/pages/admin/store/orders.tsx` (post-move) — tracking UI + `saveTracking`
- `apps/client/src/pages/account.tsx` — tracking link display

---

## Task 1: Move DB schema — extract `shippingRates` into `shipping.ts`

**Files:**
- Modify: `packages/db/src/schema/books.ts`
- Create: `packages/db/src/schema/shipping.ts`
- Modify: `packages/db/src/schema/index.ts`

**Interfaces:**
- Produces: `shippingRates` table, `ShippingRate`, `NewShippingRate` types — same names/shapes as before, now exported from `shipping.ts` (still re-exported from the `@workspace/db` package root, so no importer elsewhere changes).

- [ ] **Step 1: Create `shipping.ts` with the shippingRates table**

Create `packages/db/src/schema/shipping.ts`:

```ts
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
```

- [ ] **Step 2: Remove shippingRates from books.ts**

In `packages/db/src/schema/books.ts`, delete lines 46-57 (the `shippingRates` table definition and its two type exports) and remove now-unused imports. The file's import line changes from:

```ts
import { boolean, numeric, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
```

to:

```ts
import { boolean, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
```

(`numeric` was only used by `shippingRates`; `books` never used it.) The file should end at the `NewBook` type export (original line 44) with nothing after it.

- [ ] **Step 3: Update the schema barrel**

In `packages/db/src/schema/index.ts`, add after `export * from "./books";`:

```ts
export * from "./shipping";
```

- [ ] **Step 4: Verify it builds**

Run: `pnpm --filter @workspace/db exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/books.ts packages/db/src/schema/shipping.ts packages/db/src/schema/index.ts
git commit -m "refactor(db): move shippingRates out of books.ts into shipping.ts"
```

---

## Task 2: Add `site_settings` schema

**Files:**
- Create: `packages/db/src/schema/settings.ts`
- Modify: `packages/db/src/schema/index.ts`

**Interfaces:**
- Produces: `siteSettings` table, `SiteSetting`, `NewSiteSetting` types, exported from `@workspace/db`.

- [ ] **Step 1: Create settings.ts**

Create `packages/db/src/schema/settings.ts`:

```ts
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
```

- [ ] **Step 2: Update the schema barrel**

In `packages/db/src/schema/index.ts`, add after `export * from "./shipping";`:

```ts
export * from "./settings";
```

- [ ] **Step 3: Verify it builds**

Run: `pnpm --filter @workspace/db exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/settings.ts packages/db/src/schema/index.ts
git commit -m "feat(db): add site_settings key-value table"
```

---

## Task 3: Add order tracking columns

**Files:**
- Modify: `packages/db/src/schema/orders.ts`

**Interfaces:**
- Produces: `orders.trackingUrl: string | null`, `orders.trackingCarrier: string | null`, `orders.shippedAt: Date | null` on the `Order` type.

- [ ] **Step 1: Add the three columns**

In `packages/db/src/schema/orders.ts`, inside the `orders` table definition, add after the `paymentRecoveredAt` column (after line 78, before `adminNote`):

```ts
  // Live tracking, set by an admin once the order ships. trackingUrl is
  // shown to the customer as a "Track your order" link; trackingCarrier is
  // a free-text label (e.g. "Aramex"). shippedAt is stamped automatically
  // the first time trackingUrl is set.
  trackingUrl: text("tracking_url"),
  trackingCarrier: varchar("tracking_carrier", { length: 100 }),
  shippedAt: timestamp("shipped_at"),
```

- [ ] **Step 2: Verify it builds**

Run: `pnpm --filter @workspace/db exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/orders.ts
git commit -m "feat(db): add tracking fields to orders"
```

---

## Task 4: Write the changelog SQL + journal entry for Tasks 1-3

**Files:**
- Create: `packages/db/drizzle/0012_shipping_settings_tracking.sql`
- Modify: `packages/db/drizzle/meta/_journal.json`

This project deploys schema changes via `drizzle-kit push` (diffing the TypeScript schema directly against the live DB), not by applying these `.sql` files at runtime — but the existing `drizzle/*.sql` files are kept as a hand-maintained changelog (see `0009_book_formats_and_shipping.sql` for the established style: `IF NOT EXISTS` guards, `--> statement-breakpoint` separators). This task keeps that changelog current; it does not get executed by the app.

- [ ] **Step 1: Write the SQL file**

Create `packages/db/drizzle/0012_shipping_settings_tracking.sql`:

```sql
-- Generic admin-editable settings (key/value), seeded with the default
-- shipping cost/currency used for display purposes.
CREATE TABLE IF NOT EXISTS "site_settings" (
  "key" varchar(100) PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "value_type" varchar(20) DEFAULT 'string' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "updated_by" varchar(255)
);
--> statement-breakpoint

INSERT INTO "site_settings" ("key", "value", "value_type")
VALUES ('default_shipping_cost', '50', 'number')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

INSERT INTO "site_settings" ("key", "value", "value_type")
VALUES ('default_shipping_currency', 'EGP', 'string')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- Live tracking fields on orders, set by an admin once an order ships.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_url" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_carrier" varchar(100);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipped_at" timestamp;
```

- [ ] **Step 2: Add the journal entry**

Read `packages/db/drizzle/meta/_journal.json`, note the highest `idx` value in the `entries` array (currently `11` for `0011_book_category_text_to_enum`), and append a new entry with `idx` one higher, a fresh `when` timestamp (use `Date.now()` in milliseconds — e.g. run `node -e "console.log(Date.now())"` to get a real current value), matching `tag`:

```json
    {
      "idx": 12,
      "version": "7",
      "when": <output of Date.now()>,
      "tag": "0012_shipping_settings_tracking",
      "breakpoints": true
    }
```

Add this object to the end of the `entries` array (keep valid JSON — add a comma after the previous last entry).

- [ ] **Step 3: Commit**

```bash
git add packages/db/drizzle/0012_shipping_settings_tracking.sql packages/db/drizzle/meta/_journal.json
git commit -m "chore(db): changelog entry for site_settings and order tracking columns"
```

---

## Task 5: Move `apps/api/src/lib/payments/*`

**Files:**
- Create: `apps/api/src/lib/payments/paymob.ts` (moved from `lib/paymob.ts`)
- Create: `apps/api/src/lib/payments/paypal.ts` (moved from `lib/paypal.ts`)
- Create: `apps/api/src/lib/payments/reconcilePaymobOrders.ts` (moved from `lib/reconcilePaymobOrders.ts`)
- Create: `apps/api/src/lib/payments/reconcilePayPalOrders.ts` (moved from `lib/reconcilePayPalOrders.ts`)
- Create: `apps/api/src/lib/payments/reconcilePayPalOrders.test.ts` (moved from `lib/reconcilePayPalOrders.test.ts`)
- Delete: `apps/api/src/lib/paymob.ts`, `apps/api/src/lib/paypal.ts`, `apps/api/src/lib/reconcilePaymobOrders.ts`, `apps/api/src/lib/reconcilePayPalOrders.ts`, `apps/api/src/lib/reconcilePayPalOrders.test.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/routes/orders/index.ts`

None of these five files import each other or any other `lib/` file by relative path (verified: `paymob.ts` and `paypal.ts` only import `./logger`; `reconcilePaymobOrders.ts`/`reconcilePayPalOrders.ts` import from `@workspace/db`, `./paymob`/`./paypal`, `./email` and `./logger`). Their **internal** relative imports need path updates when they move one level deeper.

- [ ] **Step 1: Move the five files**

```bash
mkdir -p apps/api/src/lib/payments
git mv apps/api/src/lib/paymob.ts apps/api/src/lib/payments/paymob.ts
git mv apps/api/src/lib/paypal.ts apps/api/src/lib/payments/paypal.ts
git mv apps/api/src/lib/reconcilePaymobOrders.ts apps/api/src/lib/payments/reconcilePaymobOrders.ts
git mv apps/api/src/lib/reconcilePayPalOrders.ts apps/api/src/lib/payments/reconcilePayPalOrders.ts
git mv apps/api/src/lib/reconcilePayPalOrders.test.ts apps/api/src/lib/payments/reconcilePayPalOrders.test.ts
```

- [ ] **Step 2: Fix internal imports in the moved files**

In `apps/api/src/lib/payments/paymob.ts` and `apps/api/src/lib/payments/paypal.ts`, the import `from "./logger"` becomes `from "../logger"`.

In `apps/api/src/lib/payments/reconcilePaymobOrders.ts`, imports change:
- `from "./paymob"` → `from "./paymob"` (unchanged — same folder now)
- `from "./email"` → `from "../email/email"` (email.ts moves to `lib/email/` in Task 6, which runs immediately after this task — apply this path now so Task 6 does not need to revisit these two files)
- `from "./logger"` → `from "../logger"`

In `apps/api/src/lib/payments/reconcilePayPalOrders.ts`, apply the same three changes as above.

In `apps/api/src/lib/payments/reconcilePayPalOrders.test.ts`, update any `from "./reconcilePayPalOrders"` (unchanged, same folder) and any `from "../lib/..."` style paths one level if present — check the file's actual import block and adjust relative depth by one for anything reaching outside `lib/payments/`.

- [ ] **Step 3: Update apps/api/src/index.ts**

Change:
```ts
import { startPayPalReconciliationJob } from "./lib/reconcilePayPalOrders";
import { startPaymobReconciliationJob } from "./lib/reconcilePaymobOrders";
```
to:
```ts
import { startPayPalReconciliationJob } from "./lib/payments/reconcilePayPalOrders";
import { startPaymobReconciliationJob } from "./lib/payments/reconcilePaymobOrders";
```

- [ ] **Step 4: Update apps/api/src/routes/orders/index.ts**

Change the import block that currently reads:
```ts
import {
  isPaymobConfigured,
  isPaymobWalletConfigured,
  createPaymobCheckout,
  createPaymobCheckoutUrlForExistingOrder,
  createPaymobWalletPayment,
  createPaymobWalletRedirectForExistingOrder,
  getPaymobTransactionStatus,
  verifyPaymobWebhookHmac,
  extractPaymobDeclineReason,
} from "../../lib/paymob";
import {
  markPaymobOrderPaid,
  reconcilePendingPaymobOrders,
} from "../../lib/reconcilePaymobOrders";
```
and:
```ts
import {
  createPayPalOrder,
  capturePayPalOrder,
  getPayPalClientConfig,
} from "../../lib/paypal";
import {
  markPayPalOrderPaid,
  reconcilePendingPayPalOrders,
  markOrderPaymentFailed,
  notifyAdminPaymentFailed,
  notifyCustomerOrderCancelled,
  expireStalePendingOrders,
} from "../../lib/reconcilePayPalOrders";
```
to use `"../../lib/payments/paymob"`, `"../../lib/payments/reconcilePaymobOrders"`, `"../../lib/payments/paypal"`, `"../../lib/payments/reconcilePayPalOrders"` respectively (same named imports, only the path changes).

- [ ] **Step 5: Verify it builds**

Run: `pnpm --filter @workspace/api-server exec tsc --noEmit`
Expected: no errors. If `../email` path errors appear from Step 2, proceed to Task 6 next — it fixes them.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/payments apps/api/src/index.ts apps/api/src/routes/orders/index.ts
git commit -m "refactor(api): move payment integrations into lib/payments/"
```

---

## Task 6: Move `apps/api/src/lib/email/*`

**Files:**
- Create: `apps/api/src/lib/email/email.ts`, `apps/api/src/lib/email/authEmail.ts`, `apps/api/src/lib/email/consultationEmail.ts`, `apps/api/src/lib/email/orderPaidNotifications.ts` (moved)
- Delete: the four originals at `apps/api/src/lib/*.ts`
- Modify: `apps/api/src/lib/auth.ts`
- Modify: `apps/api/src/lib/payments/reconcilePaymobOrders.ts`, `apps/api/src/lib/payments/reconcilePayPalOrders.ts` (finish the fix started in Task 5)
- Modify: `apps/api/src/routes/{academy/applications,assessments,contact,email,job-applications,orchestrator,reports,rfp}/index.ts`
- Modify: `apps/api/src/routes/consultations/index.ts`
- Modify: `apps/api/src/routes/orders/index.ts`

- [ ] **Step 1: Move the four files**

```bash
mkdir -p apps/api/src/lib/email
git mv apps/api/src/lib/email.ts apps/api/src/lib/email/email.ts
git mv apps/api/src/lib/authEmail.ts apps/api/src/lib/email/authEmail.ts
git mv apps/api/src/lib/consultationEmail.ts apps/api/src/lib/email/consultationEmail.ts
git mv apps/api/src/lib/orderPaidNotifications.ts apps/api/src/lib/email/orderPaidNotifications.ts
```

- [ ] **Step 2: Fix internal imports in the moved files**

Open each of the four moved files and update any relative import reaching outside the old `lib/` (now `lib/email/`) by one extra `../`:
- Any `from "./logger"` → `from "../logger"`
- Any `from "@workspace/db"` — unchanged (package import, not relative)
- `orderPaidNotifications.ts` likely imports from `./email` (now same-folder, unchanged) and possibly `./currency` or similar → becomes `../currency` if present.
- Check each file's actual import block and apply: same-folder siblings (`email.ts`, `authEmail.ts`, `consultationEmail.ts`, `orderPaidNotifications.ts` importing each other) stay as `./`; anything reaching `logger.ts`, `currency.ts`, `auth.ts`, or `db` at the old `lib/` level needs one more `../`.

- [ ] **Step 3: Fix apps/api/src/lib/auth.ts**

Change:
```ts
import {
  sendOtpEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
} from "./authEmail";
```
to:
```ts
import {
  sendOtpEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
} from "./email/authEmail";
```

- [ ] **Step 4: Finish the Task-5 fix in the payments reconcile files**

In `apps/api/src/lib/payments/reconcilePaymobOrders.ts` and `apps/api/src/lib/payments/reconcilePayPalOrders.ts`, confirm/set the email import to:
```ts
from "../email/email"
```
(adjust the exact imported names to match what each file already imports from the email module — do not change which functions are imported, only the path).

- [ ] **Step 5: Update route files importing `email`**

In each of `apps/api/src/routes/academy/applications.ts`, `apps/api/src/routes/assessments/index.ts`, `apps/api/src/routes/contact/index.ts`, `apps/api/src/routes/email/index.ts`, `apps/api/src/routes/job-applications/index.ts`, `apps/api/src/routes/orchestrator/index.ts`, `apps/api/src/routes/orders/index.ts`, `apps/api/src/routes/reports/index.ts`, `apps/api/src/routes/rfp/index.ts`: change the import path `"../../lib/email"` to `"../../lib/email/email"` (keep the exact same named imports on each line — only the path string changes).

- [ ] **Step 6: Update apps/api/src/routes/consultations/index.ts**

Change the import path for `consultationEmail` from `"../../lib/consultationEmail"` to `"../../lib/email/consultationEmail"`.

- [ ] **Step 7: Update apps/api/src/routes/orders/index.ts for orderPaidNotifications**

Change:
```ts
import { sendOrderPaidNotifications } from "../../lib/orderPaidNotifications";
```
to:
```ts
import { sendOrderPaidNotifications } from "../../lib/email/orderPaidNotifications";
```

- [ ] **Step 8: Verify it builds**

Run: `pnpm --filter @workspace/api-server exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Run the full API test suite**

Run: `pnpm --filter @workspace/api-server exec vitest run`
Expected: all tests pass (this exercises the payments + email import chains end to end).

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/lib/email apps/api/src/lib/auth.ts apps/api/src/lib/payments apps/api/src/routes
git commit -m "refactor(api): move email integrations into lib/email/"
```

---

## Task 7: Move `apps/api/src/lib/storage/*`

**Files:**
- Create: `apps/api/src/lib/storage/objectStore.ts`, `apps/api/src/lib/storage/objectStorage.ts`, `apps/api/src/lib/storage/objectAcl.ts` (moved)
- Delete: the three originals
- Modify: `apps/api/src/routes/{admin/index,books/index,job-applications/index,storage,conversations/attachments,conversations/index,reports/attachments}.ts`

`objectStorage.ts` imports `objectAcl.ts` via `from "./objectAcl"` — this stays unchanged since both move into `lib/storage/` together.

- [ ] **Step 1: Move the three files**

```bash
mkdir -p apps/api/src/lib/storage
git mv apps/api/src/lib/objectStore.ts apps/api/src/lib/storage/objectStore.ts
git mv apps/api/src/lib/objectStorage.ts apps/api/src/lib/storage/objectStorage.ts
git mv apps/api/src/lib/objectAcl.ts apps/api/src/lib/storage/objectAcl.ts
```

- [ ] **Step 2: Fix internal imports**

In `apps/api/src/lib/storage/objectStore.ts` and `objectStorage.ts`, any import reaching `./logger` becomes `../logger`; `from "./objectAcl"` in `objectStorage.ts` stays unchanged (same folder). Check `objectStore.ts` for an import of `objectStorage` (likely `from "./objectStorage"`) — stays unchanged, same folder.

- [ ] **Step 3: Update importers of objectStore**

In `apps/api/src/routes/admin/index.ts`, `apps/api/src/routes/books/index.ts`, `apps/api/src/routes/job-applications/index.ts`, `apps/api/src/routes/orders/index.ts`, `apps/api/src/routes/storage.ts`: change the import path from `"../../lib/objectStore"` (or `"../lib/objectStore"` for `storage.ts` which sits one level up — check the actual existing path in each file and add `storage/` before the filename, preserving the existing number of `../`) to point at `lib/storage/objectStore`.

- [ ] **Step 4: Update importers of objectStorage**

In `apps/api/src/routes/conversations/attachments.ts`, `apps/api/src/routes/conversations/index.ts`, `apps/api/src/routes/reports/attachments.ts`, `apps/api/src/routes/storage.ts`: change the import path from `.../lib/objectStorage` to `.../lib/storage/objectStorage`, preserving each file's existing `../` depth.

- [ ] **Step 5: Verify it builds**

Run: `pnpm --filter @workspace/api-server exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Run the full API test suite**

Run: `pnpm --filter @workspace/api-server exec vitest run`
Expected: all tests pass. (`checkout-profile.test.ts` mocks `../../lib/objectStorage` — update that mock's path to `../../lib/storage/objectStorage` too, in this same task, or the test will fail to intercept the real module.)

- [ ] **Step 7: Update the vi.mock path in checkout-profile.test.ts and any other test mocking objectStorage**

Search for `vi.mock(".*objectStorage"` across `apps/api/src/**/*.test.ts` and update each matched path the same way as Step 4.

- [ ] **Step 8: Re-run the full API test suite**

Run: `pnpm --filter @workspace/api-server exec vitest run`
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/lib/storage apps/api/src/routes
git commit -m "refactor(api): move object storage integrations into lib/storage/"
```

---

## Task 8: Move `apps/api/src/lib/seed/*`

**Files:**
- Create: `apps/api/src/lib/seed/seedAdminUsers.ts`, `apps/api/src/lib/seed/seedDevUsers.ts`, `apps/api/src/lib/seed/seedJobOpenings.ts`, `apps/api/src/lib/seed/seedStoreApps.ts` (moved)
- Delete: the four originals
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/scripts/seedDevUsers.ts`

- [ ] **Step 1: Move the four files**

```bash
mkdir -p apps/api/src/lib/seed
git mv apps/api/src/lib/seedAdminUsers.ts apps/api/src/lib/seed/seedAdminUsers.ts
git mv apps/api/src/lib/seedDevUsers.ts apps/api/src/lib/seed/seedDevUsers.ts
git mv apps/api/src/lib/seedJobOpenings.ts apps/api/src/lib/seed/seedJobOpenings.ts
git mv apps/api/src/lib/seedStoreApps.ts apps/api/src/lib/seed/seedStoreApps.ts
```

- [ ] **Step 2: Fix internal imports in the moved files**

Check each for a `from "./logger"` or similar → becomes `../logger`.

- [ ] **Step 3: Update apps/api/src/index.ts**

Change:
```ts
import { seedStoreApps } from "./lib/seedStoreApps";
import { seedJobOpenings } from "./lib/seedJobOpenings";
import { seedAdminUsers } from "./lib/seedAdminUsers";
```
to:
```ts
import { seedStoreApps } from "./lib/seed/seedStoreApps";
import { seedJobOpenings } from "./lib/seed/seedJobOpenings";
import { seedAdminUsers } from "./lib/seed/seedAdminUsers";
```

- [ ] **Step 4: Update apps/api/src/scripts/seedDevUsers.ts**

Change the import path for `seedDevUsers` from `"../lib/seedDevUsers"` to `"../lib/seed/seedDevUsers"`.

- [ ] **Step 5: Verify it builds**

Run: `pnpm --filter @workspace/api-server exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Run the full API test suite**

Run: `pnpm --filter @workspace/api-server exec vitest run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/seed apps/api/src/index.ts apps/api/src/scripts/seedDevUsers.ts
git commit -m "refactor(api): move seed scripts into lib/seed/"
```

---

## Task 9: Move `apps/client/src/pages/admin/store/*`

**Files:**
- Create: `apps/client/src/pages/admin/store/orders.tsx`, `store/shipping.tsx`, `store/books.tsx`, `store/store-courses.tsx` (moved)
- Delete: the four originals at `apps/client/src/pages/admin/*.tsx`
- Modify: `apps/client/src/App.tsx`

Each moved file currently imports `{ PageHeader, Toast, useToast } from "./layout"` and `{ adminFetch } from "../../lib/admin-api"` (or similar relative path to `lib/`). One directory deeper, these become `from "../layout"` and `from "../../../lib/admin-api"`.

- [ ] **Step 1: Move the four files**

```bash
mkdir -p apps/client/src/pages/admin/store
git mv apps/client/src/pages/admin/orders.tsx apps/client/src/pages/admin/store/orders.tsx
git mv apps/client/src/pages/admin/shipping.tsx apps/client/src/pages/admin/store/shipping.tsx
git mv apps/client/src/pages/admin/books.tsx apps/client/src/pages/admin/store/books.tsx
git mv apps/client/src/pages/admin/store-courses.tsx apps/client/src/pages/admin/store/store-courses.tsx
```

- [ ] **Step 2: Fix imports in each moved file**

In each of the four files, update:
- `from "./layout"` → `from "../layout"`
- `from "../../lib/admin-api"` → `from "../../../lib/admin-api"`
- Any `@/components/...` or `@/lib/...` alias imports are unaffected (path aliases resolve from `src/`, not relative to the file) — leave those unchanged.
- Any other relative import (e.g. to a sibling component under `pages/admin/`) needs the same one-level adjustment; check each file's full import block before editing.

- [ ] **Step 3: Update apps/client/src/App.tsx**

Change:
```ts
import AdminBooks from "@/pages/admin/books";
import AdminStoreCourses from "@/pages/admin/store-courses";
```
and:
```ts
import AdminOrders from "@/pages/admin/orders";
import AdminShipping from "@/pages/admin/shipping";
```
to:
```ts
import AdminBooks from "@/pages/admin/store/books";
import AdminStoreCourses from "@/pages/admin/store/store-courses";
```
and:
```ts
import AdminOrders from "@/pages/admin/store/orders";
import AdminShipping from "@/pages/admin/store/shipping";
```
(The `Route` JSX referencing `AdminOrders`, `AdminShipping`, `AdminBooks`, `AdminStoreCourses` by component name and URL path is unchanged — only the import source changes.)

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @workspace/client exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/pages/admin/store apps/client/src/App.tsx
git commit -m "refactor(client): group store admin pages under pages/admin/store/"
```

---

## Task 10: Move `apps/client/src/pages/admin/academy/*` and `people/*`

**Files:**
- Create: `apps/client/src/pages/admin/academy/academy.tsx`, `academy/registrations.tsx` (moved)
- Create: `apps/client/src/pages/admin/people/admins.tsx`, `people/job-applications.tsx` (moved)
- Delete: the four originals
- Modify: `apps/client/src/App.tsx`

- [ ] **Step 1: Move the four files**

```bash
mkdir -p apps/client/src/pages/admin/academy apps/client/src/pages/admin/people
git mv apps/client/src/pages/admin/academy.tsx apps/client/src/pages/admin/academy/academy.tsx
git mv apps/client/src/pages/admin/registrations.tsx apps/client/src/pages/admin/academy/registrations.tsx
git mv apps/client/src/pages/admin/admins.tsx apps/client/src/pages/admin/people/admins.tsx
git mv apps/client/src/pages/admin/job-applications.tsx apps/client/src/pages/admin/people/job-applications.tsx
```

- [ ] **Step 2: Fix imports in each moved file**

Same pattern as Task 9 Step 2: `from "./layout"` → `from "../layout"`; any relative `lib/` import gains one more `../`; `@/...` aliases unchanged. Check each file's actual import block before editing.

- [ ] **Step 3: Update apps/client/src/App.tsx**

Change:
```ts
import AdminAcademy from "@/pages/admin/academy";
```
and:
```ts
import AdminRegistrations from "@/pages/admin/registrations";
```
and:
```ts
import AdminJobApplications from "@/pages/admin/job-applications";
```
and:
```ts
import AdminAdmins from "@/pages/admin/admins";
```
to:
```ts
import AdminAcademy from "@/pages/admin/academy/academy";
import AdminRegistrations from "@/pages/admin/academy/registrations";
import AdminJobApplications from "@/pages/admin/people/job-applications";
import AdminAdmins from "@/pages/admin/people/admins";
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @workspace/client exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/pages/admin/academy apps/client/src/pages/admin/people apps/client/src/App.tsx
git commit -m "refactor(client): group academy and people admin pages into subfolders"
```

---

## Task 11: `lib/settings.ts` helper + tests

**Files:**
- Create: `apps/api/src/lib/settings.ts`
- Test: `apps/api/src/lib/settings.test.ts`

**Interfaces:**
- Consumes: `db`, `siteSettings` from `@workspace/db` (produced in Task 2).
- Produces:
  ```ts
  export interface ResolvedSettings {
    defaultShippingCost: number;
    defaultShippingCurrency: string;
  }
  export async function getSettings(): Promise<ResolvedSettings>;
  export async function updateSettings(
    patch: Partial<{ defaultShippingCost: number; defaultShippingCurrency: string }>,
    updatedByEmail: string | null,
  ): Promise<ResolvedSettings>;
  ```
  Used by Task 12 (`routes/admin/settings.ts`).

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/lib/settings.test.ts`:

```ts
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { db, siteSettings } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { getSettings, updateSettings } from "./settings";

const KEYS = ["default_shipping_cost", "default_shipping_currency"];

async function cleanup() {
  await db.delete(siteSettings).where(inArray(siteSettings.key, KEYS));
}

afterEach(cleanup);
afterAll(cleanup);

describe("settings helper", () => {
  it("returns hardcoded fallback defaults when no rows exist", async () => {
    await cleanup();
    const settings = await getSettings();
    expect(settings).toEqual({ defaultShippingCost: 50, defaultShippingCurrency: "EGP" });
  });

  it("updateSettings writes rows and getSettings reflects them", async () => {
    await cleanup();
    const updated = await updateSettings({ defaultShippingCost: 75 }, "admin@example.com");
    expect(updated.defaultShippingCost).toBe(75);
    expect(updated.defaultShippingCurrency).toBe("EGP");

    const fetched = await getSettings();
    expect(fetched.defaultShippingCost).toBe(75);

    const [row] = await db
      .select()
      .from(siteSettings)
      .where(inArray(siteSettings.key, ["default_shipping_cost"]));
    expect(row.value).toBe("75");
    expect(row.valueType).toBe("number");
    expect(row.updatedBy).toBe("admin@example.com");
  });

  it("updateSettings can change the currency independently", async () => {
    await cleanup();
    const updated = await updateSettings({ defaultShippingCurrency: "USD" }, null);
    expect(updated.defaultShippingCurrency).toBe("USD");
    expect(updated.defaultShippingCost).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/settings.test.ts`
Expected: FAIL — `./settings` module not found.

- [ ] **Step 3: Write the implementation**

Create `apps/api/src/lib/settings.ts`:

```ts
import { db, siteSettings } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

export interface ResolvedSettings {
  defaultShippingCost: number;
  defaultShippingCurrency: string;
}

// Hardcoded fallback used only when a row is genuinely missing (e.g. before
// the seed migration has run). Once Task 4's migration seeds the rows, this
// path is not normally hit.
const FALLBACKS: ResolvedSettings = {
  defaultShippingCost: 50,
  defaultShippingCurrency: "EGP",
};

const KEYS = {
  defaultShippingCost: "default_shipping_cost",
  defaultShippingCurrency: "default_shipping_currency",
} as const;

function parseValue(value: string, valueType: string): string | number | boolean {
  if (valueType === "number") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (valueType === "boolean") return value === "true";
  return value;
}

export async function getSettings(): Promise<ResolvedSettings> {
  const rows = await db
    .select()
    .from(siteSettings)
    .where(inArray(siteSettings.key, [KEYS.defaultShippingCost, KEYS.defaultShippingCurrency]));

  const byKey = new Map(rows.map((r) => [r.key, r]));

  const costRow = byKey.get(KEYS.defaultShippingCost);
  const currencyRow = byKey.get(KEYS.defaultShippingCurrency);

  return {
    defaultShippingCost: costRow
      ? (parseValue(costRow.value, costRow.valueType) as number)
      : FALLBACKS.defaultShippingCost,
    defaultShippingCurrency: currencyRow
      ? (parseValue(currencyRow.value, currencyRow.valueType) as string)
      : FALLBACKS.defaultShippingCurrency,
  };
}

export async function updateSettings(
  patch: Partial<{ defaultShippingCost: number; defaultShippingCurrency: string }>,
  updatedByEmail: string | null,
): Promise<ResolvedSettings> {
  const now = new Date();

  if (patch.defaultShippingCost !== undefined) {
    await db
      .insert(siteSettings)
      .values({
        key: KEYS.defaultShippingCost,
        value: String(patch.defaultShippingCost),
        valueType: "number",
        updatedAt: now,
        updatedBy: updatedByEmail,
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          value: String(patch.defaultShippingCost),
          valueType: "number",
          updatedAt: now,
          updatedBy: updatedByEmail,
        },
      });
  }

  if (patch.defaultShippingCurrency !== undefined) {
    await db
      .insert(siteSettings)
      .values({
        key: KEYS.defaultShippingCurrency,
        value: patch.defaultShippingCurrency,
        valueType: "string",
        updatedAt: now,
        updatedBy: updatedByEmail,
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          value: patch.defaultShippingCurrency,
          valueType: "string",
          updatedAt: now,
          updatedBy: updatedByEmail,
        },
      });
  }

  return getSettings();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/settings.test.ts`
Expected: PASS (3 tests). Note: this hits the real dev database per repo convention (see `checkout-profile.test.ts`) — ensure `DATABASE_URL` is set / the local Postgres from `pnpm dev:db` is running before executing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/settings.ts apps/api/src/lib/settings.test.ts
git commit -m "feat(api): add settings helper (getSettings/updateSettings)"
```

---

## Task 12: `routes/admin/settings.ts` — GET/PUT endpoints

**Files:**
- Create: `apps/api/src/routes/admin/settings.ts`
- Test: `apps/api/src/routes/admin/settings.test.ts`
- Modify: `apps/api/src/routes/admin/index.ts`

**Interfaces:**
- Consumes: `getSettings`, `updateSettings` from `../../lib/settings` (Task 11); `requireAdmin`, `type AdminAuthRequest` from `../../middlewares/adminAuth`.
- Produces: an Express `Router` default-exported, mounted at the router root (paths `/admin/settings`) — same mounting convention as every other file under `routes/admin/`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/routes/admin/settings.test.ts`:

```ts
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, siteSettings } from "@workspace/db";
import { inArray } from "drizzle-orm";

const KEYS = ["default_shipping_cost", "default_shipping_currency"];

vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (
    req: express.Request & { adminEmail?: string },
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.adminEmail = "admin@example.com";
    next();
  },
}));

const { default: settingsRouter } = await import("./settings");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(settingsRouter);
  return app;
}

const app = makeApp();

async function cleanup() {
  await db.delete(siteSettings).where(inArray(siteSettings.key, KEYS));
}

afterEach(cleanup);
afterAll(cleanup);

describe("admin settings routes", () => {
  it("GET /admin/settings returns defaults when unset", async () => {
    await cleanup();
    const res = await request(app).get("/admin/settings");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ defaultShippingCost: 50, defaultShippingCurrency: "EGP" });
  });

  it("PUT /admin/settings updates and returns the new values", async () => {
    await cleanup();
    const res = await request(app)
      .put("/admin/settings")
      .send({ defaultShippingCost: 80 });
    expect(res.status).toBe(200);
    expect(res.body.defaultShippingCost).toBe(80);

    const res2 = await request(app).get("/admin/settings");
    expect(res2.body.defaultShippingCost).toBe(80);
  });

  it("PUT /admin/settings rejects a negative cost", async () => {
    await cleanup();
    const res = await request(app)
      .put("/admin/settings")
      .send({ defaultShippingCost: -5 });
    expect(res.status).toBe(400);
  });

  it("PUT /admin/settings rejects an empty currency", async () => {
    await cleanup();
    const res = await request(app)
      .put("/admin/settings")
      .send({ defaultShippingCurrency: "" });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/admin/settings.test.ts`
Expected: FAIL — `./settings` module not found.

- [ ] **Step 3: Write the implementation**

Create `apps/api/src/routes/admin/settings.ts`:

```ts
import { Router, type Response } from "express";
import { getSettings, updateSettings } from "../../lib/settings";
import { requireAdmin, type AdminAuthRequest } from "../../middlewares/adminAuth";

const router = Router();

router.get("/admin/settings", requireAdmin, async (_req, res: Response) => {
  try {
    const settings = await getSettings();
    return res.json(settings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load settings" });
  }
});

router.put("/admin/settings", requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const patch: Partial<{ defaultShippingCost: number; defaultShippingCurrency: string }> = {};

    if (body.defaultShippingCost !== undefined) {
      const n = Number(body.defaultShippingCost);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: "defaultShippingCost must be a non-negative number" });
      }
      patch.defaultShippingCost = n;
    }

    if (body.defaultShippingCurrency !== undefined) {
      const currency = String(body.defaultShippingCurrency).trim().toUpperCase();
      if (!currency || currency.length > 10) {
        return res.status(400).json({ error: "defaultShippingCurrency must be a non-empty currency code" });
      }
      patch.defaultShippingCurrency = currency;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "No valid settings provided" });
    }

    const updated = await updateSettings(patch, req.adminEmail ?? null);
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/admin/settings.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Mount the router**

In `apps/api/src/routes/admin/index.ts`, add near the top with the other imports:

```ts
import settingsRouter from "./settings";
```

and mount it — add this line right after `const router = Router();` (or alongside where other admin sub-routers would be mounted; this file currently defines all its routes inline on `router` directly, so mount via `router.use(settingsRouter)` immediately after the `const router = Router();` line):

```ts
router.use(settingsRouter);
```

- [ ] **Step 6: Type-check and run the full API suite**

Run: `pnpm --filter @workspace/api-server exec tsc --noEmit`
Run: `pnpm --filter @workspace/api-server exec vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/admin/settings.ts apps/api/src/routes/admin/settings.test.ts apps/api/src/routes/admin/index.ts
git commit -m "feat(api): add GET/PUT /admin/settings routes"
```

---

## Task 13: Order tracking — API

**Files:**
- Modify: `apps/api/src/routes/orders/index.ts`

**Interfaces:**
- Consumes: existing `sanitizeAbsoluteUrl` helper already defined in this file (used today for PayPal return/cancel URLs).
- Produces: `PUT /admin/orders/:id` now additionally accepts `trackingUrl` and `trackingCarrier` in the request body and returns them on the updated `Order`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/routes/orders/tracking.test.ts`:

```ts
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, orders, orderItems, books, shippingRates, type NewBook } from "@workspace/db";
import { eq, inArray, like } from "drizzle-orm";

const TEST_USER_PREFIX = "test-tracking-";
const OWNER = `${TEST_USER_PREFIX}owner`;
const TEST_CITY = "TestTrackingCity";

vi.mock("../../middlewares/authMiddleware", () => ({
  requireAuth: (
    req: express.Request & { userId?: string; userEmail?: string },
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const uid = req.header("x-test-user");
    if (!uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = uid;
    req.userEmail = "buyer@example.com";
    next();
  },
}));

vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (
    req: express.Request & { adminUserId?: string; adminEmail?: string },
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.adminUserId = "test-admin";
    req.adminEmail = "admin@example.com";
    next();
  },
}));

vi.mock("../../lib/storage/objectStorage", () => ({
  ObjectStorageService: class {
    getPrivateObjectDir() {
      return "test-bucket/private";
    }
  },
  objectStorageClient: {
    bucket: () => ({ file: () => ({}) }),
  },
}));

const { default: ordersRouter } = await import("./index");

function makeApp() {
  const app = express();
  app.use(express.json());
  const noopLog = { info() {}, warn() {}, error() {}, debug() {} };
  app.use((req, _res, next) => {
    (req as unknown as { log: unknown }).log = noopLog;
    next();
  });
  app.use(ordersRouter);
  return app;
}

const app = makeApp();
const seededBookIds: number[] = [];

async function seedBook(): Promise<number> {
  const [row] = await db
    .insert(books)
    .values({
      title: "Tracking Test Book",
      category: "management",
      status: "available",
      currency: "EGP",
      paperAvailable: true,
      paperPrice: "100.00",
      digitalAvailable: false,
    } satisfies Partial<NewBook> as NewBook)
    .returning();
  seededBookIds.push(row.id);
  return row.id;
}

async function cleanup() {
  const testOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  const ids = testOrders.map((o) => o.id);
  if (ids.length) {
    await db.delete(orderItems).where(inArray(orderItems.orderId, ids));
    await db.delete(orders).where(inArray(orders.id, ids));
  }
  if (seededBookIds.length) {
    await db.delete(books).where(inArray(books.id, seededBookIds));
    seededBookIds.length = 0;
  }
  await db.delete(shippingRates).where(eq(shippingRates.city, TEST_CITY));
}

afterEach(cleanup);
afterAll(cleanup);

async function placeOrder(bookId: number) {
  await db.insert(shippingRates).values({ city: TEST_CITY, price: "20.00", currency: "EGP" });
  return request(app)
    .post("/store/orders")
    .set("x-test-user", OWNER)
    .send({
      fullName: "Tracking Buyer",
      phone: "+201000000099",
      city: TEST_CITY,
      address: "1 Track St",
      paymentMethod: "cash_on_delivery",
      items: [{ productType: "book", productId: bookId, quantity: 1, format: "paper" }],
    });
}

describe("order tracking", () => {
  it("sets trackingUrl, trackingCarrier, and stamps shippedAt on first set", async () => {
    const bookId = await seedBook();
    const created = await placeOrder(bookId);
    expect(created.status).toBe(201);
    const orderId = created.body.id;

    const res = await request(app)
      .put(`/admin/orders/${orderId}`)
      .send({ trackingUrl: "https://track.example.com/abc123", trackingCarrier: "Aramex" });
    expect(res.status).toBe(200);
    expect(res.body.trackingUrl).toBe("https://track.example.com/abc123");
    expect(res.body.trackingCarrier).toBe("Aramex");
    expect(res.body.shippedAt).not.toBeNull();
  });

  it("rejects a non-http(s) tracking URL", async () => {
    const bookId = await seedBook();
    const created = await placeOrder(bookId);
    const orderId = created.body.id;

    const res = await request(app)
      .put(`/admin/orders/${orderId}`)
      .send({ trackingUrl: "javascript:alert(1)" });
    expect(res.status).toBe(400);
  });

  it("does not overwrite an existing shippedAt on a later tracking update", async () => {
    const bookId = await seedBook();
    const created = await placeOrder(bookId);
    const orderId = created.body.id;

    const first = await request(app)
      .put(`/admin/orders/${orderId}`)
      .send({ trackingUrl: "https://track.example.com/first" });
    const firstShippedAt = first.body.shippedAt;
    expect(firstShippedAt).not.toBeNull();

    const second = await request(app)
      .put(`/admin/orders/${orderId}`)
      .send({ trackingUrl: "https://track.example.com/second" });
    expect(second.body.trackingUrl).toBe("https://track.example.com/second");
    expect(second.body.shippedAt).toBe(firstShippedAt);
  });

  it("clears trackingUrl and trackingCarrier when sent as empty strings", async () => {
    const bookId = await seedBook();
    const created = await placeOrder(bookId);
    const orderId = created.body.id;

    await request(app)
      .put(`/admin/orders/${orderId}`)
      .send({ trackingUrl: "https://track.example.com/x", trackingCarrier: "Bosta" });

    const cleared = await request(app)
      .put(`/admin/orders/${orderId}`)
      .send({ trackingUrl: "", trackingCarrier: "" });
    expect(cleared.status).toBe(200);
    expect(cleared.body.trackingUrl).toBeNull();
    expect(cleared.body.trackingCarrier).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/orders/tracking.test.ts`
Expected: FAIL — `res.body.trackingUrl` is `undefined` (field not yet handled by the route).

- [ ] **Step 3: Implement in the PUT /admin/orders/:id handler**

In `apps/api/src/routes/orders/index.ts`, inside `router.put("/admin/orders/:id", ...)` (the handler that currently builds `updates: Partial<Order>` from `body.status` and `body.adminNote`), add after the existing `if (body.adminNote !== undefined) { ... }` block and before the `const [before] = await db.select()...` line:

```ts
    if (body.trackingCarrier !== undefined) {
      const carrier = body.trackingCarrier ? String(body.trackingCarrier).trim().slice(0, 100) : "";
      updates.trackingCarrier = carrier || null;
    }
    if (body.trackingUrl !== undefined) {
      const raw = body.trackingUrl ? String(body.trackingUrl).trim() : "";
      if (raw) {
        const sanitized = sanitizeAbsoluteUrl(raw);
        if (!sanitized) {
          return res.status(400).json({ error: "trackingUrl must be a valid http(s) URL" });
        }
        updates.trackingUrl = sanitized;
      } else {
        updates.trackingUrl = null;
      }
    }
```

Then, still before the `db.update(orders)...` call, add the shippedAt-stamping logic. Fetch the current row first (the handler already does `const [before] = await db.select().from(orders).where(eq(orders.id, id));` right before the update — reuse that same `before` lookup, but it must run BEFORE building the final `updates` so `shippedAt` can be included in the same update). Restructure so the `before` select happens first, then `updates.shippedAt` is set conditionally:

Move the existing line:
```ts
    const [before] = await db.select().from(orders).where(eq(orders.id, id));
```
to run immediately after `const updates: Partial<Order> = { updatedAt: new Date() };` (i.e., before the `status`/`adminNote`/tracking field handling), and add this check right after the tracking block above:

```ts
    if (
      updates.trackingUrl !== undefined &&
      updates.trackingUrl !== null &&
      before &&
      !before.shippedAt
    ) {
      updates.shippedAt = new Date();
    }
```

The full handler body order becomes: parse `id` → build empty `updates` → `before = await db.select()...` → apply `status` patch → apply `adminNote` patch → apply `trackingCarrier` patch → apply `trackingUrl` patch (validating) → apply `shippedAt` stamping → `db.update(orders).set(updates)...returning()` → existing status-change email logic (unchanged) → `return res.json(updated)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/orders/tracking.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full order route test suite to confirm no regression**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/orders`
Expected: all existing order tests (create-order, card-payment, checkout-profile, payment-failure, paymob-callback, paypal-capture, receipt-email, wallet-payment, tracking) still pass — the `before` select was only moved earlier in the same handler, not changed in behavior for the status-email logic that reads it afterward.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/orders/index.ts apps/api/src/routes/orders/tracking.test.ts
git commit -m "feat(api): admin can set order tracking carrier/URL, auto-stamps shippedAt"
```

---

## Task 14: Admin settings page (client)

**Files:**
- Create: `apps/client/src/pages/admin/store/settings.tsx`
- Modify: `apps/client/src/pages/admin/layout.tsx`
- Modify: `apps/client/src/App.tsx`

**Interfaces:**
- Consumes: `GET /admin/settings`, `PUT /admin/settings` (Task 12); `adminFetch` from `../../../lib/admin-api`; `PageHeader`, `Toast`, `useToast` from `../layout`.

- [ ] **Step 1: Create the settings page**

Create `apps/client/src/pages/admin/store/settings.tsx`:

```tsx
import { useEffect, useState } from "react";
import { adminFetch } from "../../../lib/admin-api";
import { Loader2, Save, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Toast, useToast } from "../layout";

const API_BASE = "/api";

interface SiteSettings {
  defaultShippingCost: number;
  defaultShippingCurrency: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ defaultShippingCost: string; defaultShippingCurrency: string }>({
    defaultShippingCost: "",
    defaultShippingCurrency: "",
  });
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API_BASE}/admin/settings`, { credentials: "include" });
      if (r.ok) {
        const data = (await r.json()) as SiteSettings;
        setSettings(data);
        setForm({
          defaultShippingCost: String(data.defaultShippingCost),
          defaultShippingCurrency: data.defaultShippingCurrency,
        });
      } else {
        show("تعذر تحميل الإعدادات", "error");
      }
    } catch {
      show("خطأ في الشبكة", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await adminFetch(`${API_BASE}/admin/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultShippingCost: Number.parseFloat(form.defaultShippingCost),
          defaultShippingCurrency: form.defaultShippingCurrency,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        show((err as { error?: string }).error || "فشل الحفظ", "error");
        return;
      }
      const updated = (await r.json()) as SiteSettings;
      setSettings(updated);
      show("تم حفظ الإعدادات");
    } catch {
      show("خطأ في الشبكة", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="إعدادات الموقع"
        description="إعدادات عامة تُستخدم كقيم افتراضية عبر الموقع"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-secondary" />
        </div>
      ) : settings ? (
        <form onSubmit={save} className="bg-background border border-border p-6 max-w-lg space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold mb-2">
            <SettingsIcon className="w-4 h-4" />
            الشحن الافتراضي
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            قيمة مرجعية للعرض فقط — لا تُستخدم في حساب الشحن الفعلي عند الدفع (ذلك يعتمد على "أسعار الشحن" لكل مدينة).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">
                التكلفة الافتراضية *
              </label>
              <Input
                value={form.defaultShippingCost}
                onChange={(e) => setForm((p) => ({ ...p, defaultShippingCost: e.target.value }))}
                required
                type="number"
                min="0"
                step="0.01"
                dir="ltr"
                className="rounded-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">
                العملة *
              </label>
              <select
                value={form.defaultShippingCurrency}
                onChange={(e) => setForm((p) => ({ ...p, defaultShippingCurrency: e.target.value }))}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-none"
              >
                <option>EGP</option>
                <option>SAR</option>
                <option>USD</option>
                <option>AED</option>
              </select>
            </div>
          </div>
          <Button type="submit" disabled={saving} className="gap-2 rounded-none font-bold">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "حفظ..." : "حفظ"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Add the nav entry**

In `apps/client/src/pages/admin/layout.tsx`:

Add `Settings` to the lucide-react import list (it currently imports `LayoutDashboard, BookOpen, GraduationCap, ...` — add `Settings` to that list).

Add a new entry to `NAV_ITEMS`, after the `/admin/shipping` entry:

```ts
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
```

- [ ] **Step 3: Register the route**

In `apps/client/src/App.tsx`, add the import alongside the other store admin imports:

```ts
import AdminSettings from "@/pages/admin/store/settings";
```

Find the `<Route path="/admin/shipping">` (or equivalent wouter route registration for `AdminShipping`) and add a matching route for `/admin/settings` rendering `AdminSettings`, following the exact same JSX pattern used for the shipping route (wrapped in `<AdminGate>` the same way every other `/admin/*` route is).

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @workspace/client exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify in the browser**

Run: `pnpm dev` (or the project's existing dev script) and navigate to `/admin/settings` while signed in as an admin. Confirm the form loads with the seeded defaults (50 / EGP, once Task 4's SQL has been applied via `pnpm db:push`), edit a value, save, reload the page, and confirm the new value persisted.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/pages/admin/store/settings.tsx apps/client/src/pages/admin/layout.tsx apps/client/src/App.tsx
git commit -m "feat(client): add admin settings page for default shipping cost/currency"
```

---

## Task 15: Order tracking — admin UI

**Files:**
- Modify: `apps/client/src/pages/admin/store/orders.tsx`

**Interfaces:**
- Consumes: `PUT /api/admin/orders/:id` (already used by `updateStatus`/`saveAdminNote`; Task 13 extended it to accept `trackingUrl`/`trackingCarrier`).

- [ ] **Step 1: Extend the Order interface**

In `apps/client/src/pages/admin/store/orders.tsx`, add to the `Order` interface (after `adminNote: string | null;`):

```ts
  trackingUrl: string | null;
  trackingCarrier: string | null;
  shippedAt: string | null;
```

- [ ] **Step 2: Add a saveTracking function**

Add this function alongside the existing `saveAdminNote` function (same file, same pattern):

```ts
  async function saveTracking(id: number, trackingCarrier: string, trackingUrl: string) {
    try {
      const r = await adminFetch(`${API_BASE}/admin/orders/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingCarrier, trackingUrl }),
      });
      if (r.ok) {
        const updated = (await r.json()) as Order;
        show("تم حفظ بيانات الشحن");
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
        if (expanded[id] && expanded[id] !== "loading") {
          void loadDetails(id);
        }
      } else {
        const err = await r.json().catch(() => ({}));
        show((err as { error?: string }).error || "فشل حفظ بيانات الشحن", "error");
      }
    } catch {
      show("خطأ في الشبكة", "error");
    }
  }
```

- [ ] **Step 3: Pass it into OrderDetailBlock**

Change the `OrderDetailBlock` call site:
```tsx
<OrderDetailBlock order={detailObj} onSaveNote={saveAdminNote} />
```
to:
```tsx
<OrderDetailBlock order={detailObj} onSaveNote={saveAdminNote} onSaveTracking={saveTracking} />
```

- [ ] **Step 4: Extend OrderDetailBlock's props and add the tracking form**

Change the `OrderDetailBlock` function signature from:
```tsx
function OrderDetailBlock({
  order,
  onSaveNote,
}: {
  order: OrderWithItems;
  onSaveNote: (id: number, note: string) => void;
}) {
```
to:
```tsx
function OrderDetailBlock({
  order,
  onSaveNote,
  onSaveTracking,
}: {
  order: OrderWithItems;
  onSaveNote: (id: number, note: string) => void;
  onSaveTracking: (id: number, carrier: string, url: string) => void;
}) {
```

Add local state for the two new fields, alongside the existing `note` state:
```tsx
  const [trackingCarrier, setTrackingCarrier] = useState(order.trackingCarrier || "");
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || "");
  useEffect(() => {
    setTrackingCarrier(order.trackingCarrier || "");
    setTrackingUrl(order.trackingUrl || "");
  }, [order.id, order.trackingCarrier, order.trackingUrl]);
```

Add a new block in the JSX, immediately before the existing "ملاحظات المسؤول" admin-note block:

```tsx
      <div className="border border-border p-3">
        <div className="text-xs font-bold text-muted-foreground mb-2">
          بيانات الشحن {order.shippedAt ? `(تم الشحن: ${new Date(order.shippedAt).toLocaleDateString("ar-SA")})` : ""}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            value={trackingCarrier}
            onChange={(e) => setTrackingCarrier(e.target.value)}
            placeholder="شركة الشحن (مثال: Aramex)"
            className="rounded-none text-sm"
            data-testid={`input-tracking-carrier-${order.id}`}
          />
          <Input
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="رابط تتبع الشحنة (https://...)"
            dir="ltr"
            className="rounded-none text-sm"
            data-testid={`input-tracking-url-${order.id}`}
          />
        </div>
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            onClick={() => onSaveTracking(order.id, trackingCarrier.trim(), trackingUrl.trim())}
            className="rounded-none font-bold"
            data-testid={`btn-save-tracking-${order.id}`}
          >
            حفظ بيانات الشحن
          </Button>
        </div>
      </div>
```

- [ ] **Step 5: Type-check**

Run: `pnpm --filter @workspace/client exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manually verify in the browser**

Open `/admin/orders`, expand an order, enter a carrier and tracking URL, save, reload, and confirm both persisted and the "تم الشحن" date appeared.

- [ ] **Step 7: Commit**

```bash
git add apps/client/src/pages/admin/store/orders.tsx
git commit -m "feat(client): admin can set order carrier + tracking URL"
```

---

## Task 16: Order tracking — customer-facing display

**Files:**
- Modify: `apps/client/src/pages/account.tsx`

**Interfaces:**
- Consumes: `trackingUrl`, `trackingCarrier` fields now returned by `GET /account/me/orders` (they are plain columns on `orders`, already included by the existing `SELECT *`-style query in that route — no API change needed for this task).

- [ ] **Step 1: Extend the OrderRow interface**

In `apps/client/src/pages/account.tsx`, add to the `OrderRow` interface (after `paymentRecoveredAt: string | null;`):

```ts
  trackingUrl: string | null;
  trackingCarrier: string | null;
```

- [ ] **Step 2: Add bilingual copy keys**

In the `ar` section of `COPY` (near `paymentRecovered`, around line 95), add:
```ts
    trackOrder: "تتبع شحنتك",
    trackVia: "تتبع الشحنة عبر",
```

In the `en` section of `COPY` (mirror location, around line 167), add:
```ts
    trackOrder: "Track your order",
    trackVia: "Track via",
```

- [ ] **Step 3: Render the tracking link**

Immediately after the existing block:
```tsx
          {order.paymentRecoveredAt && order.paymentStatus === "paid" && (
            <p
              className="mt-2 inline-flex items-start gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1"
              data-testid={`note-payment-recovered-${order.id}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{t.paymentRecovered}</span>
            </p>
          )}
```
add:
```tsx
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-secondary/10 border border-secondary/30 px-2 py-1 hover:bg-secondary/20"
              data-testid={`link-tracking-${order.id}`}
            >
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span>{order.trackingCarrier ? `${t.trackVia} ${order.trackingCarrier}` : t.trackOrder}</span>
            </a>
          )}
```

(`Truck` is already imported at the top of this file — line 23 in the pre-existing icon import list — no new import needed.)

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @workspace/client exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify in the browser**

Sign in as the customer who owns an order that Task 15 was used to set tracking on; open `/account`; confirm the "تتبع الشحنة عبر Aramex" (or "Track via Aramex" in English) link appears and opens the tracking URL in a new tab.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/pages/account.tsx
git commit -m "feat(client): show order tracking link on customer account page"
```

---

## Task 17: Final full-repo verification

**Files:** none (verification only)

- [ ] **Step 1: Full API test suite**

Run: `pnpm --filter @workspace/api-server exec vitest run`
Expected: all tests pass.

- [ ] **Step 2: Full API type-check**

Run: `pnpm --filter @workspace/api-server exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Full client type-check**

Run: `pnpm --filter @workspace/client exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: DB package type-check**

Run: `pnpm --filter @workspace/db exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Push the schema to the local dev database**

Run: `pnpm db:push`
Expected: drizzle-kit reports the new `site_settings` table and the three new `orders` columns being added, applies them, and the seed rows from Task 4's `INSERT ... ON CONFLICT DO NOTHING` statements are NOT automatically applied by `push` (push only diffs schema shape, not data) — manually verify the seed rows exist by running:
```bash
node --env-file=.env -e "
const { db, siteSettings } = require('@workspace/db');
db.select().from(siteSettings).then((r) => { console.log(r); process.exit(0); });
"
```
If empty, insert the two seed rows once via the admin settings page (Task 14) instead — saving any value through the UI creates the rows, so this is a one-time bootstrap rather than a blocker.

- [ ] **Step 6: Smoke-test the full flow end to end in the browser**

Run the dev servers, then: (a) visit `/admin/settings`, confirm it loads and can save; (b) place a cash-on-delivery test order as a customer; (c) as admin, open `/admin/orders`, set a tracking carrier + URL on that order; (d) as the customer, reload `/account` and confirm the tracking link appears and opens correctly; (e) spot-check that `/admin/books`, `/admin/shipping`, `/admin/store-courses`, `/admin/academy`, `/admin/admins`, `/admin/job-applications` (the moved pages) still load without console errors, confirming the folder-move tasks introduced no broken imports.

- [ ] **Step 7: Final commit if any stray changes remain**

```bash
git status
```
If clean, no action needed. If anything is uncommitted (e.g. a forgotten file from an earlier task), stage and commit it with an appropriately scoped message.
