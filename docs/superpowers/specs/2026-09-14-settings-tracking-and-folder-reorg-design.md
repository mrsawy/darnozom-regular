# Site Settings, Order Tracking, and Folder Reorg — Design

## Goal

1. Add a general-purpose, admin-editable site settings mechanism, seeded with a default shipping cost/currency.
2. Add per-order carrier + live tracking URL fields, settable by admin, visible to the customer.
3. Reorganize `apps/api/src/lib`, `packages/db/src/schema`, and `apps/client/src/pages/admin` into domain-grouped subfolders so related code lives together and future features have an obvious home.

Security hardening (secrets, CORS, rate limiting) is explicitly out of scope for this work — tracked separately.

## 1. Site settings

### Storage: key-value table

New table `site_settings`:

| column | type | notes |
|---|---|---|
| `key` | `varchar(100)` PK | e.g. `default_shipping_cost` |
| `value` | `text` | raw string; parsed per `valueType` |
| `valueType` | `varchar(20)` enum-like (`string`\|`number`\|`boolean`), default `string` | |
| `updatedAt` | `timestamp` default now | |
| `updatedBy` | `varchar(255)` nullable | admin email, for audit |

Seeded rows on first migration: `default_shipping_cost` = `"50"` (`number`), `default_shipping_currency` = `"EGP"` (`string`). These are **additive** — they do not replace or interact with the existing `shippingRates.isDefault` mechanism (see below).

### Relationship to existing shipping-rate defaults

`packages/db/src/schema/shipping.ts` (moved out of `books.ts`, see §3) already has a working, actively-enforced invariant: exactly one `shippingRates` row has `isDefault = true` at all times, enforced by transactional logic in `POST /shipping-rates`, `PUT /shipping-rates/:id`, and `DELETE /shipping-rates/:id` (promotes a new default on delete, refuses to unset the only default). This is the price actually used at checkout for unlisted cities via `lookupShippingRate()`.

**Decision:** the new `default_shipping_cost` setting is a separate, independent value — not a replacement for `shippingRates.isDefault`. It exists for display/reference and future use (e.g. showing "starting from X shipping" on the storefront before a city is chosen). It is **not** wired into `lookupShippingRate()` in this iteration, to avoid touching a tested invariant system as a side effect of an unrelated feature. If the user later wants the setting to drive checkout pricing, that's a separate, explicit change to `lookupShippingRate()`.

### API

New file `apps/api/src/lib/settings.ts`:

```ts
export type SettingValueType = "string" | "number" | "boolean";

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

New file `apps/api/src/routes/admin/settings.ts` (mounted from `routes/admin/index.ts`):

- `GET /admin/settings` (requireAdmin) → `ResolvedSettings`
- `PUT /admin/settings` (requireAdmin) → validates body, calls `updateSettings`, returns `ResolvedSettings`

### Client

New file `apps/client/src/pages/admin/store/settings.tsx` — same form/Toast/PageHeader pattern as `shipping.tsx`. Added to `NAV_ITEMS` in `layout.tsx` and imported in `App.tsx` at route `/admin/settings`.

## 2. Order tracking

### Schema

`orders` table gains three nullable columns (in `packages/db/src/schema/orders.ts`):

- `trackingUrl: text`
- `trackingCarrier: varchar(100)`
- `shippedAt: timestamp`

### API

Extend the existing `PUT /admin/orders/:id` handler in `apps/api/src/routes/orders/index.ts` (already whitelists `status` and `adminNote` into a partial `updates` object) to also accept `trackingUrl` and `trackingCarrier`:

- `trackingUrl`: if provided and non-empty, must pass the same `sanitizeAbsoluteUrl` check already used for PayPal return/cancel URLs (`http(s)://`, ≤1000 chars); empty string clears it (sets null).
- `trackingCarrier`: free text, trimmed, ≤100 chars; empty string clears it.
- When `trackingUrl` transitions from null/empty to a non-empty value and `shippedAt` is not already set, stamp `shippedAt = new Date()`.

No new endpoint — this reuses the existing generic admin order-update path, consistent with how `status`/`adminNote` already work there.

### Client — admin

`apps/client/src/pages/admin/store/orders.tsx` (moved, see §3): `OrderDetailBlock` gets two new inputs (carrier text input, tracking URL input) next to the existing admin-note textarea, saved via a new `saveTracking(id, { trackingCarrier, trackingUrl })` function that PUTs to the same `/admin/orders/:id` endpoint used by `updateStatus`/`saveAdminNote`. The `Order` interface gains `trackingUrl: string | null`, `trackingCarrier: string | null`, `shippedAt: string | null`.

### Client — customer-facing

`apps/client/src/pages/account.tsx`: `OrderRow` interface gains the same three fields. A new block renders directly after the existing `paymentRecoveredAt` block (same visual pattern: icon + colored badge), shown when `order.trackingUrl` is present:

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

New `COPY` keys (`ar`/`en`): `trackOrder`, `trackVia`.

## 3. Folder reorganization

Pure file moves + import-path updates. No behavior change. Done as its own commit(s) before the feature-code tasks, so the feature diff is easy to review on top of a settled structure.

### `packages/db/src/schema/`

- Create `shipping.ts`: move the `shippingRates` table + `ShippingRate`/`NewShippingRate` types out of `books.ts` into it. `books.ts` keeps only the `books` table.
- Create `settings.ts`: new `siteSettings` table (§1).
- `schema/index.ts` barrel gets `export * from "./shipping";` and `export * from "./settings";` added; `books.ts` continues to be exported (already is).

### `apps/api/src/lib/`

Move into subfolders (each file's internal content is untouched — only its path and the paths of files that import it change):

```
lib/payments/
  paymob.ts
  paypal.ts
  reconcilePaymobOrders.ts
  reconcilePayPalOrders.ts
  reconcilePayPalOrders.test.ts
lib/email/
  email.ts
  authEmail.ts
  consultationEmail.ts
  orderPaidNotifications.ts
lib/storage/
  objectStore.ts
  objectStorage.ts
  objectAcl.ts
lib/seed/
  seedAdminUsers.ts
  seedDevUsers.ts
  seedJobOpenings.ts
  seedStoreApps.ts
lib/settings.ts        (new, §1)
lib/auth.ts             (stays; import of ./authEmail becomes ./email/authEmail)
lib/logger.ts            (stays)
lib/currency.ts          (stays)
lib/frameworks.ts        (stays)
lib/googleCalendar.ts    (stays)
lib/extract.ts           (stays)
```

Every importer of a moved file gets its import path updated. The exact importer list (found by grep before writing this plan):

- `paymob`, `paypal` → `routes/orders/index.ts`
- `reconcilePaymobOrders`, `reconcilePayPalOrders` → `index.ts`, `routes/orders/index.ts`
- `email` → `routes/academy/applications.ts`, `routes/assessments/index.ts`, `routes/contact/index.ts`, `routes/email/index.ts`, `routes/job-applications/index.ts`, `routes/orchestrator/index.ts`, `routes/orders/index.ts`, `routes/reports/index.ts`, `routes/rfp/index.ts`
- `authEmail` → only `lib/auth.ts` (internal to the moved-together auth+email files)
- `consultationEmail` → `routes/consultations/index.ts`
- `orderPaidNotifications` → `routes/orders/index.ts`
- `objectStore` → `routes/admin/index.ts`, `routes/books/index.ts`, `routes/job-applications/index.ts`, `routes/orders/index.ts`, `routes/storage.ts`
- `objectStorage` → `routes/conversations/attachments.ts`, `routes/conversations/index.ts`, `routes/reports/attachments.ts`, `routes/storage.ts`
- `objectAcl` → only `lib/objectStorage.ts` (internal, moves together, path unchanged)
- `seedAdminUsers`, `seedJobOpenings`, `seedStoreApps` → `index.ts`
- `seedDevUsers` → `scripts/seedDevUsers.ts`

### `apps/client/src/pages/admin/`

```
pages/admin/store/
  orders.tsx
  shipping.tsx
  books.tsx
  store-courses.tsx
  settings.tsx      (new, §1)
pages/admin/academy/
  academy.tsx
  registrations.tsx
pages/admin/people/
  admins.tsx
  job-applications.tsx
pages/admin/events.tsx        (stays)
pages/admin/overview.tsx      (stays)
pages/admin/layout.tsx        (stays — exports PageHeader/Toast/useToast/AdminGate used by every moved page)
pages/admin/consultation-slots.tsx        (stays)
pages/admin/consultation-bookings.tsx     (stays)
pages/admin/service-registrations.tsx     (stays)
pages/admin/jobs.tsx                      (stays)
pages/admin/_image-upload.tsx             (stays)
```

Every moved page imports `layout.tsx` and `admin-api.ts` via relative paths (`../../lib/admin-api`, `./layout`) — these become `../../../lib/admin-api` and `../layout` respectively for files one level deeper. `App.tsx` import paths update to match new locations. `NAV_ITEMS` `href` values in `layout.tsx` are unchanged (routes are URL paths, not file paths, and are already decoupled from file location).

Rationale for not moving `layout.tsx`, `overview.tsx`, `events.tsx`: `layout.tsx` is imported by every other admin page (keeping it at the top level avoids a `../` in every single page); `overview.tsx` and `events.tsx` don't cleanly belong to `store`/`academy`/`people` and are low-traffic files that don't need a home yet (YAGNI — don't invent a category for one file).

## Out of scope (explicit)

- Store on/off toggle, COD toggle, contact/notification settings, carrier URL templates.
- Wiring `default_shipping_cost` into actual checkout pricing (`lookupShippingRate`).
- Any security fixes (CORS, rate limiting, secrets) — separate, already-discussed work.
