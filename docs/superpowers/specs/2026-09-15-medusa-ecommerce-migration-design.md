# Medusa Ecommerce Migration — Design

Status: Approved by user (2026-09-15). Ready for implementation planning.

## Context

The platform currently implements its own ecommerce system for books (and,
loosely, store courses/apps) directly in the monorepo:

- **Backend** (`apps/api`, ~9,100 LOC of store-specific code): `packages/db`
  schema (`books`, `orders`/`order_items`, `shipping_rates`,
  `checkout_profiles`), `apps/api/src/routes/orders/index.ts` (~1,870 lines:
  checkout, PayPal, Paymob card, Paymob wallets, cash on delivery, webhooks,
  admin order management), `apps/api/src/lib/payments/` (Paymob + PayPal HTTP
  clients and two background payment reconcilers).
- **Frontend** (`apps/client`, ~5,200 LOC): cart context, checkout + 3
  payment-return pages, store/book/course pages, an in-app digital-book
  reader gated on order ownership, and `admin/store/*` pages (books, orders,
  shipping, courses).
- **Identity**: Better Auth, self-hosted, single `users` table shared by
  auth, academy, consultations, and CRM, with roles `client` / `consultant`
  / `admin` / `super_admin`.
- **Deployment**: single VPS, one Postgres 16 container, systemd + nginx, no
  Redis today.

This system is being replaced with **Medusa v2** as the commerce engine and
admin dashboard for **books only**. Academy courses and store apps remain on
the existing custom logic and are explicitly out of scope for this
migration.

## Goals

- Medusa v2 owns the book catalog, cart, checkout, orders, and payments.
- The Medusa Admin dashboard is the tool staff use to manage books, orders,
  and shipping rates going forward.
- Payments: Paymob (card), Paymob (mobile wallets), PayPal (with existing
  EGP→USD conversion), Lemon Squeezy (merchant-of-record, for digital-only
  and international orders), and cash on delivery — five Medusa payment
  provider modules.
- Better Auth remains the single source of truth for platform identity;
  Medusa customers are derived from Better Auth users, not independent.
- The existing React + Vite storefront is kept; only its data layer changes
  to call Medusa's Store API instead of the existing Express store routes.
- Historical orders are preserved read-only, not migrated into Medusa.
- Deployment stays on the existing VPS: same Postgres server, a new
  `medusa` database, and a new Redis container.

## Non-goals

- Academy courses and store apps do not move to Medusa in this migration.
- Historical orders are not recreated as Medusa orders.
- No SSO between Better Auth and the Medusa Admin dashboard — admin users
  are separate Medusa accounts.
- No redesign of the storefront's visual design system or i18n.

## Architecture

Medusa becomes a third app in the existing pnpm workspace, not a separate
repository, so install/typecheck/deploy stay unified.

```
apps/
  client/                  React + Vite SPA — store pages now talk to Medusa
  api/                     Express API — loses store/payment code (Section: Scope of removal)
  medusa/                  NEW: Medusa v2 server + admin dashboard
    medusa-config.ts
    src/
      modules/
        paymob-card/       Payment provider (Paymob card)
        paymob-wallet/     Payment provider (Vodafone/Orange/Etisalat Cash)
        paypal-egp/        Payment provider (PayPal + EGP→USD conversion)
        lemonsqueezy/      Payment provider (MoR: digital + international)
        cod/               Payment provider (cash on delivery)
        digital-product/   Custom module: digital file <-> variant, entitlements
        city-shipping/     Fulfillment provider: per-city calculated rates
      links/
        digital-product-variant.ts   defineLink(DigitalProductFile <-> ProductVariant)
      subscribers/
        order-placed.ts             Grant digital entitlement on payment capture
      api/
        store/digital-products/[variantId]/access/route.ts  Signed-URL entitlement check
      admin/
        routes/                     Dashboard widgets: digital file upload, city rates
      jobs/
        reconcile-payments.ts       Scheduled job replacing the two Express reconcilers
      scripts/
        migrate-books.ts            One-off: books -> products + variants
        migrate-shipping.ts         One-off: shipping_rates -> city rates
packages/
  db/                      Drizzle — store tables become read-only, later dropped
deploy/
  medusa/docker-compose.yml     Redis container
  darnozom-medusa.service       systemd unit for the Medusa server
  nginx.medusa.conf             admin.darnozom.com (dashboard + Medusa API)
```

**Three services on one VPS:**

| Service | Owns |
|---|---|
| `apps/api` (Express) | Auth, academy, consultations, CRM, courses, apps, legacy read-only orders |
| `apps/medusa` | Books catalog, cart, orders, payments, shipping, admin dashboard |
| Postgres 16 (existing container) | Two databases: `darnozom` (Drizzle) + `medusa` (Medusa migrations) — never shared tables/schema |
| Redis (new container) | Medusa events, workflow engine, cache |

Express and Medusa never read each other's database directly. They
integrate over HTTP: Medusa subscribers call the Express API when a
Medusa-owned event needs to affect platform state Express owns (none
identified for the current scope, since courses/apps stay out of Medusa);
Express calls Medusa's Store/Admin API when it needs store data (e.g.
minting a customer token, reading legacy-adjacent order info). The shared
identifier between the two systems is the Better Auth `users.id`, stored on
the Medusa customer's `metadata.betterAuthUserId`.

## Payment providers

Five Medusa v2 payment provider modules under `apps/medusa/src/modules/`,
each extending `AbstractPaymentProvider`, wrapping the existing HTTP client
code rather than rewriting the gateway integrations from scratch.

- **`cod`** — trivial. `initiatePayment` returns a session in
  `pending_authorization`; `authorizePayment` always succeeds (no gateway).
- **`paymob-card`** — wraps `createPaymobCheckout` /
  `getPaymobTransactionStatus` / `verifyPaymobWebhookHmac` /
  `extractPaymobDeclineReason` from the existing `paymob.ts`.
  `initiatePayment` creates the Paymob order + iframe URL, storing the
  Paymob order id in the payment session's `data`. `getWebhookActionAndData`
  verifies the HMAC and returns `captured` / `failed`.
- **`paymob-wallet`** — same shape, wrapping `createPaymobWalletPayment`;
  wallet phone number is passed as `initiatePayment` context data.
- **`paypal-egp`** — wraps `createPayPalOrder` / `capturePayPalOrder`. The
  server-side EGP→USD conversion and exchange-rate audit trail move into
  this module's `initiatePayment`, unchanged in behavior.
- **`lemonsqueezy`** — new. Hosted checkout: `initiatePayment` creates a
  Lemon Squeezy checkout and returns its URL; `getWebhookActionAndData`
  verifies their webhook signature and maps `order_created` /
  `order_refunded` to Medusa's action vocabulary.

**Provider selection by cart contents.** A Medusa API route
(`/store/available-payment-providers`) filters offered providers: carts
that are digital-only or ship outside Egypt offer Lemon Squeezy (+ PayPal);
carts with any physical item shipping within Egypt offer Paymob (card +
wallet) + COD (+ PayPal). The storefront checkout UI renders only the
filtered list.

**Reconciliation.** `reconcilePaymobOrders.ts` and
`reconcilePayPalOrders.ts` are replaced by one Medusa scheduled job
(`src/jobs/reconcile-payments.ts`) that polls each provider's
`getPaymentStatus` for stuck `pending_authorization` sessions and drives
the capture/cancel workflow — provider-agnostic instead of two bespoke
scripts.

## Digital delivery

A custom Medusa module, `digital-product`
(`apps/medusa/src/modules/digital-product`), with one data model,
`DigitalProductFile` (`id`, `file_url` — private, never returned by any
public API — `checksum`, `created_at`). Linked to `ProductVariant` via
`defineLink` (`apps/medusa/src/links/digital-product-variant.ts`): a paper
variant has no link, a digital variant links to exactly one file. This
mirrors the current `paperAvailable` / `digitalAvailable` /
`digitalFileUrl` split on `books`, remodeled as two variants of one
product.

**Entitlement** (replacing the order-ownership check in
`order-reader.tsx`):

- Subscriber `src/subscribers/order-placed.ts` listens for the
  payment-captured event (not order-placed) — digital access is granted
  only once payment is confirmed, matching today's "paid" gate, including
  for COD orders. For each digital line item it writes an `Entitlement`
  record (`customer_id`, `variant_id`, `order_id`).
- Custom Medusa API route `GET /store/digital-products/:variantId/access`
  (authenticated with the customer's Medusa JWT) checks the entitlement and,
  only if present, returns a short-lived signed URL (S3 presigned URL, or an
  equivalent time-boxed token for local-disk storage) — never the raw
  `file_url`.
- `order-reader.tsx` in the Vite SPA changes minimally: it calls this
  Medusa route (with the Medusa customer token) instead of the Express
  endpoint, and renders the returned signed URL exactly as before.
- A Medusa Admin dashboard extension (widget on the variant edit page) lets
  admins upload/replace the digital file per variant, since Medusa's stock
  product UI has no file-picker concept for this.

## Shipping (city-based rates)

A custom fulfillment provider module, `city-shipping`
(`apps/medusa/src/modules/city-shipping`), registered as a **calculated**
(dynamic) shipping option rather than a flat rate, to preserve the current
city-keyed pricing model:

- `getFulfillmentOptions` returns one logical option, "Standard Shipping."
- `canCalculate` returns `true` whenever the cart has a shipping address
  with a city.
- `calculatePrice` looks up the cart's `shipping_address.city` against the
  module's own `CityRate` data model (`city`, `price`, `currency`,
  `is_default`), falling back to the `is_default` row for unrecognized
  cities — identical fallback behavior to today's `shipping_rates` table.
- Admins manage city rates through a Medusa Admin dashboard extension
  (custom settings page), not the native shipping-option UI, since Medusa's
  built-in UI assumes flat or zone-based rates.

## Identity: Better Auth ↔ Medusa

Better Auth's `users` table remains canonical. Medusa keeps its own
`customer` table (required by its cart/order/auth workflows), but every
Medusa customer used by the storefront is derived from a Better Auth user.

**Storefront (signed-in shopper):**

1. New Express endpoint `POST /api/store/medusa-token` (behind the existing
   `requireAuth` / Better Auth session) looks up the Medusa customer by
   `metadata.betterAuthUserId === user.id` via the Medusa Admin API
   (server-to-server secret key, never exposed to the browser).
2. If none exists, Express creates one via the Admin API, copying
   name/email and stamping `metadata.betterAuthUserId`.
3. Express mints a Medusa customer JWT via a custom Medusa auth provider
   that trusts a signed assertion from Express (Medusa's stock
   `emailpass` provider doesn't fit — there is no Medusa-side password).
4. The browser stores this token alongside the existing Better Auth
   session and attaches it to Medusa Store API calls via
   `@medusajs/js-sdk`.

**Guest checkout:** unauthenticated shoppers use Medusa's native guest cart
flow. If they sign in with Better Auth before completing checkout, the SPA
fetches the token from the flow above and Medusa's customer/cart-transfer
mechanism merges the guest cart onto the now-known customer.

**Admin dashboard:** Medusa Admin (`/app`) users are separate Medusa
accounts, created via Medusa's own invite flow — not tied to Better Auth
roles. Staff who previously used `admin/store/*` in the platform's own
admin get a direct Medusa dashboard invite instead.

## Storefront changes (`apps/client`)

Routes, layout, and Arabic/English i18n are unchanged. Only the data layer
changes:

- New `apps/client/src/lib/medusa-client.ts` wraps `@medusajs/js-sdk`,
  configured with the storefront's publishable API key and (when present)
  the customer JWT from the identity flow above.
- `store-types.ts` is replaced by Medusa's `StoreProduct` / `StoreOrder` /
  `StoreCart` types from `@medusajs/types`.
- `cart-context.tsx` is rewritten around Medusa's cart APIs
  (`sdk.store.cart.create/update/addLineItem/...`); totals and currency
  come from Medusa's calculated cart response.
- `checkout.tsx`, `checkout-paymob-pay.tsx`, `checkout-paymob-wallet.tsx`,
  and `checkout-paypal-return.tsx` keep their current UI/flow shape but
  call `sdk.store.payment.initiatePaymentSession` against the new provider
  ids. A new `checkout-lemonsqueezy-return.tsx` page is added for that
  provider's hosted-checkout redirect.
- `order-reader.tsx` switches to the Medusa entitlement route (see Digital
  delivery).
- `account.tsx`'s order history merges Medusa's `sdk.store.order.list`
  (new orders) with a read-only Express call for pre-cutover archived
  orders (see Data migration).

## Admin panel changes (`apps/client` `/admin`)

- Deleted: `pages/admin/store/books.tsx`, `orders.tsx`, `shipping.tsx`.
- `pages/admin/store/store-courses.tsx` is kept (courses remain custom).
- `pages/admin/layout.tsx` gains a "Store (Medusa)" nav item linking to
  `https://admin.darnozom.com`.
- `lib/admin-api.ts` loses its store-related calls.

## Scope of removal in `apps/api`

Deleted once the corresponding Medusa functionality is live and verified:

- `apps/api/src/routes/orders/index.ts` write paths: `POST /store/orders`,
  Paymob/PayPal/wallet capture and callback routes, `PUT /admin/orders/:id`,
  reconcile-trigger routes.
- `apps/api/src/lib/payments/paymob.ts`, `paypal.ts`,
  `reconcilePaymobOrders.ts`, `reconcilePayPalOrders.ts`.
- `apps/api/src/routes/books/index.ts` write paths (book catalog
  management moves to Medusa Admin).
- `apps/api/src/routes/shipping-rates/index.ts`.

Kept, narrowed to read-only, for the archived-orders view:

- `GET /account/me/orders`, `GET /account/me/orders/:id`.
- `GET /admin/orders`, `GET /admin/orders/:id` (if staff still need
  reference access to pre-cutover orders from the legacy admin, otherwise
  also removable once the Medusa dashboard is the sole staff-facing tool).

`store_courses` and `store_apps` routes are untouched — out of scope.

## Data migration & cutover sequence

**Migrates into Medusa** (one-time, idempotent scripts in
`apps/medusa/src/scripts/`):

- `migrate-books.ts` — each `books` row becomes a Medusa `Product` with up
  to two `ProductVariant`s (paper/digital, from `paperAvailable` /
  `digitalAvailable`), priced from `paperPrice` / `digitalPrice` in
  `currency`, with a `DigitalProductFile` link for the digital variant
  sourced from `digitalFileUrl`. `status`, `isFeatured`, `isNewRelease` map
  to Medusa product status plus metadata flags the storefront's existing
  badges read. Logs an `old book id -> new Medusa product id` mapping file.
- `migrate-shipping.ts` — each `shipping_rates` row becomes a `CityRate` in
  the `city-shipping` module, preserving `isDefault`.

**Stays in place, read-only:**

- `orders`, `order_items`, `checkout_profiles` remain in the `darnozom`
  Postgres database untouched.
- `books`, `shipping_rates` are not dropped immediately — retained as a
  frozen historical reference for 90 days post-cutover, then dropped via a
  hand-written, `IF EXISTS`-guarded migration in `deploy/db/`, per the
  project's existing convention for destructive schema changes.

**Cutover sequence** (staged, reversible until the last step):

1. Stand up `apps/medusa` + Redis on the VPS behind `admin.darnozom.com`,
   empty, not yet linked from the storefront.
2. Run `migrate-books.ts` / `migrate-shipping.ts`; staff verify the catalog
   in the Medusa Admin dashboard.
3. Configure and smoke-test all five payment providers against Medusa in
   isolation (test-mode credentials), no storefront traffic yet.
4. Ship the storefront data-layer swap (cart/checkout/store pages) in a
   low-traffic deploy window; old Express store routes stay live but
   unlinked from any UI, as a rollback path.
5. Monitor real orders through Medusa for 1–2 weeks.
6. Delete the old Express store routes/payment libs and the
   `admin/store/*` pages; keep the read-only legacy-order endpoints.
7. After the 90-day retention window, drop `books` / `shipping_rates` via
   a guarded migration.

## Deployment

- Same VPS, same Postgres 16 container: a new `medusa` database alongside
  the existing `darnozom` database (separate logical databases, same
  server — one backup routine, one port).
- New Redis container (`deploy/medusa/docker-compose.yml`), required for
  Medusa v2's event bus and workflow engine.
- Medusa server runs as its own systemd unit
  (`deploy/darnozom-medusa.service`), analogous to the existing
  `darnozom-api.service`.
- nginx: new `admin.darnozom.com` vhost
  (`deploy/nginx.medusa.conf`) proxying to the Medusa server (serves both
  the Admin dashboard build and the Medusa API); the main storefront's
  nginx config gains no new routes since the SPA calls Medusa directly
  from the browser via its publishable key.

## Open items for the implementation plan

- Exact retention window enforcement (90 days) — whether automated or a
  manual follow-up task.
- Digital file storage backend (S3-compatible vs. local disk) for
  presigned/signed URL generation — existing `apps/api/src/lib/storage`
  should be checked for a reusable client before introducing a new one.
- Whether `GET /admin/orders` (legacy) is kept at all or removed
  immediately, pending a decision from whoever manages the store day to
  day.
