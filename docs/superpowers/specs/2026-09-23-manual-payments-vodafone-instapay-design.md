# Manual Payments (Vodafone Cash + InstaPay) — Design

## Goal

Let buyers pay for books (digital and paper) by manual transfer via **Vodafone Cash** or **InstaPay**. The buyer sees the payment details on the site, pays, and sends proof over WhatsApp. An admin verifies and confirms the payment from **either** dashboard (Medusa Admin or the storefront admin), which marks the order paid and unlocks digital access.

## Decisions (agreed with the user)

| Topic | Decision |
|---|---|
| Enabling methods | Two Medusa payment providers (`vodafone-cash`, `instapay`) registered in `medusa-config.ts` like `cod`; the admin enables them per region in Medusa Admin → Settings → Regions. No env vars. |
| Proof of payment | Sent **outside** the system via WhatsApp to a configurable confirmation number. The site stores no screenshots/codes. |
| Where to confirm | **Both** dashboards. |
| Source of truth | **Medusa** — settings live in a Medusa module; a Medusa "paid" is authoritative and synced to Express. |
| Cart scope | Offered for **any** cart (digital and paper) whenever the region enables the provider. EGP only. |
| Editable fields | Vodafone Cash wallet number, InstaPay QR image, WhatsApp confirmation number (per method), InstaPay address, account holder name, instructions (AR + EN). |

## Non-goals

- Uploading screenshots or submitting reference codes on the site.
- Automatic verification of transfers.
- Automated refunds (refunds are manual, like COD).
- Fixing the unauthenticated admin Socket.IO room (tracked separately; see "Related security issue").

## Current system (relevant facts)

- Checkout (`apps/client/src/pages/checkout.tsx`) posts to Express `POST /api/store/orders`; Express stores the order (source of truth for digital access, gated on `orders.paymentStatus === "paid"`) and mirrors it into Medusa via draft-order → convert (`apps/api/src/lib/medusa-order-sync.ts`), tagging `metadata.darnozom_order_id`, `metadata.payment_method`, `metadata.source = "darnozom_storefront"`.
- `ensureMedusaOrderPayable` creates a payment collection on the mirrored order so Medusa Admin shows its native **Mark as paid** button.
- Visible checkout methods come from the region's enabled providers: `GET /store/available-payment-providers` → `checkoutMethodsFromProviderIds` (`apps/medusa/src/lib/region-payment-methods.ts`).
- Express → Medusa calls use `medusaAdmin()` with `MEDUSA_ADMIN_API_KEY`. Medusa → Express calls use a Bearer `BETTER_AUTH_BRIDGE_SECRET` (see `apps/medusa/src/subscribers/order-placed.ts`).
- `findMedusaOrderIdByDarnozomId` only scans the latest 100 Medusa orders — unreliable for confirming older orders.
- Auto-expiry (`expireStalePendingOrders`) and checkout dedupe only touch `paypal | card | wallet`, so new methods are unaffected as long as they are not added to those lists.

## Architecture

```
Buyer ──checkout──▶ Express POST /api/store/orders ──mirror──▶ Medusa order (metadata.payment_method)
  │                        │ paymentStatus = "pending"
  └─▶ /checkout/manual/:id ◀── GET /store/manual-payment-methods (Medusa)
         (number / QR / WhatsApp deep link)

Confirm (Medusa Admin):      native "Mark as paid" ─▶ payment.captured ─▶ subscriber
                                                      ─▶ Express POST /api/internal/orders/:id/mark-paid ─▶ markOrderPaid()
Confirm (storefront admin):  Express POST /api/admin/orders/:id/confirm-payment
                                ─▶ Medusa mark-as-paid (must succeed) ─▶ markOrderPaid()   (callback above is then a no-op)

Settings (both dashboards):  Medusa module `manual-payment`
   Medusa Admin page ──▶ /admin/manual-payment-methods
   Storefront admin page ──▶ Express /api/admin/manual-payments ──proxy──▶ /admin/manual-payment-methods
```

## 1. Medusa

### 1.1 Payment providers

`apps/medusa/src/modules/vodafone-cash/` and `apps/medusa/src/modules/instapay/` — each an `AbstractPaymentProvider` (`identifier` = `vodafone-cash` / `instapay`), registered in `medusa-config.ts` under `Modules.PAYMENT` providers with the same ids.

Behavior (manual transfer, verified by staff):
- `initiatePayment` → `{ id: randomUUID(), data: {} }`
- `authorizePayment` / `getPaymentStatus` → `status: "pending"` (awaiting verification)
- `capturePayment`, `cancelPayment`, `deletePayment`, `updatePayment`, `retrievePayment` → pass-through `data`
- `refundPayment` → throws "… refunds must be processed manually"
- `getWebhookActionAndData` → `{ action: "not_supported" }`

Region provider ids become `pp_vodafone-cash_vodafone-cash` and `pp_instapay_instapay`.

### 1.2 Method mapping

`CheckoutPaymentMethod` gains `"vodafone_cash" | "instapay"`. `checkoutMethodFromProviderId` maps ids containing `vodafone-cash`/`vodafone_cash` → `vodafone_cash`, and `instapay` → `instapay`. These checks run **before** the existing ones (none of the existing ones match these ids, but order keeps it explicit). Neither method is filtered for digital-only carts.

The storefront has a **second copy** of this mapping — `checkoutMethodFromRawId` in `apps/client/src/lib/medusa-client.ts` (checkout calls the native `store.payment.listPaymentProviders`, not the custom route) — which gets the same two rules.

### 1.3 Settings module `manual-payment`

`apps/medusa/src/modules/manual-payment/` with model `manual_payment_method`:

| field | type | notes |
|---|---|---|
| `id` | id PK | |
| `code` | text, unique | `vodafone_cash` \| `instapay` |
| `account_number` | text nullable | Vodafone Cash wallet number (also usable for InstaPay phone) |
| `account_name` | text nullable | account holder name |
| `whatsapp_number` | text nullable | where proof is sent (VC screenshot / InstaPay code) |
| `instapay_address` | text nullable | e.g. `name@instapay` |
| `qr_image_url` | text nullable | uploaded via Medusa file module (`/static/...`) |
| `instructions_ar` | text nullable | |
| `instructions_en` | text nullable | |

Service helpers: `listMethods()` (always returns both codes, creating missing rows lazily with nulls), `upsertMethod(code, patch)`.

Validation (shared zod schema in the module): phone numbers are digits with optional leading `+`, 8–15 digits; `qr_image_url` must be an absolute `http(s)` URL or a `/static/` path; text fields trimmed, ≤ 2000 chars; unknown `code` → 400.

### 1.4 API routes

- `GET /admin/manual-payment-methods` → `{ methods: ManualPaymentMethod[] }`
- `POST /admin/manual-payment-methods/:code` → validates, upserts, returns `{ method }`
- `GET /store/manual-payment-methods` → `{ methods }` with display fields only (all fields above except `id`). Public (publishable key, like other store routes).
- QR upload uses Medusa's built-in `POST /admin/uploads`.

### 1.5 Medusa Admin UI

Settings route `apps/medusa/src/admin/routes/settings/manual-payments/page.tsx` ("Manual payments"): one card per method with the fields above, QR upload + preview (InstaPay; also allowed for Vodafone Cash but optional), Save per card. Uses `@medusajs/ui` + the admin i18n setup already in `src/admin/i18n`.

Confirming payment uses Medusa's native **Mark as paid** on the order — no custom button.

### 1.6 Subscriber: sync "paid" to Express

`apps/medusa/src/subscribers/manual-payment-captured.ts` on `payment.captured`:
1. `payment.captured` carries only `{ id: <payment id> }` (verified in `@medusajs/core-flows@2.21.0` `capture-payment.js`; Medusa's "Mark as paid" runs `capturePaymentWorkflow`, so it emits this event). Load the order via `query.graph({ entity: "payment", fields: ["id", "payment_collection.order.id", "payment_collection.order.metadata"], filters: { id } })`.
2. Continue only if `metadata.source === "darnozom_storefront"` and `metadata.payment_method ∈ {vodafone_cash, instapay}` and `metadata.darnozom_order_id` is set.
3. `POST {DARNOZOM_API_URL}/api/internal/orders/:darnozomOrderId/mark-paid` with `Authorization: Bearer ${BETTER_AUTH_BRIDGE_SECRET}` and body `{ medusaOrderId }`.
4. On non-2xx / network error: log error and throw so Medusa's event bus retry applies. The Express side is idempotent.

The URL/secret resolution is extracted from `order-placed.ts` into `apps/medusa/src/lib/express-internal.ts` and reused by both subscribers.

## 2. Express API + DB

### 2.1 Schema (`packages/db/src/schema/orders.ts`)

- `paymentMethodEnum` gains `"vodafone_cash"`, `"instapay"`.
- `orders.medusaOrderId: varchar(64)` nullable — set after `syncMedusaOrder` succeeds (`syncMedusaOrder` already returns it).

Applied with the existing `pnpm db:push` workflow.

### 2.2 `POST /api/store/orders`

- Accepts `vodafone_cash` and `instapay` (update the method validation + error message and the `PaymentMethod` type, and `email.ts`'s type).
- Allowed for digital and paper carts; `currency` must be EGP (same rule as other online methods).
- Order is inserted with `paymentStatus: "pending"`.
- After mirroring, store `medusaOrderId` on the order (best-effort).
- Sends the buyer an "order placed — complete your payment" email containing the order number, total, and a link to `/checkout/manual/:orderId`; sends the admin sales notification (`stage: "in_progress"`). Both non-fatal.
- Response: `201 { ok, id, paymentMethod, paymentStatus }` (same shape as COD).
- Not added to the dedupe list or `expireStalePendingOrders`.

### 2.3 `markOrderPaid(orderId, { source })` — `apps/api/src/lib/payments/markOrderPaid.ts`

- Conditional update: `SET paymentStatus='paid', paidAt=now(), paymentFailureReason=null WHERE id=? AND paymentStatus <> 'paid'` returning the row.
- If a row was updated: send the existing paid notifications (`orderPaidNotifications`, which include digital access) and log `{ orderId, source }`. If no row was updated: no-op (already paid). This makes the Medusa callback and the storefront confirm safe to run in either order.
- Only valid for `paymentMethod ∈ {vodafone_cash, instapay}`; otherwise returns a "not a manual payment order" result (400 at the route layer).

### 2.4 Routes

- `POST /api/internal/orders/:id/mark-paid` — Bearer `BETTER_AUTH_BRIDGE_SECRET` (constant-time compare, same as `admin-notify.ts`); calls `markOrderPaid(id, { source: "medusa" })`; returns `{ ok, alreadyPaid }`.
- `POST /api/admin/orders/:id/confirm-payment` (requireAdmin):
  1. Load order; must be `vodafone_cash`/`instapay` and not paid.
  2. Resolve Medusa order id: `orders.medusaOrderId`, falling back to `findMedusaOrderIdByDarnozomId`.
  3. Mark paid in Medusa (`ensureMedusaOrderPayable(..., { markPaid: true, providerId: "pp_system_default" })`). If this throws or no Medusa order is found → `502 { error }` and **no local change** (Medusa is the source of truth).
  4. `markOrderPaid(id, { source: "storefront_admin" })`; return the updated order.
- `GET /api/admin/manual-payments` / `PUT /api/admin/manual-payments/:code` (requireAdmin) — proxy to the Medusa admin routes via `medusaAdmin()`.
- `POST /api/admin/manual-payments/qr` (requireAdmin, multipart, single image ≤ 2 MB, png/jpeg/webp) — forwards the file to Medusa `POST /admin/uploads` and returns `{ url }`.
- `GET /api/store/orders/:id/manual-payment?email=` (optionalAuth) — the buyer page's order summary. Access via the existing `canAccessOrder` (signed-in owner, or guest email stashed in sessionStorage at checkout); returns `{ id, totalAmount, currency, paymentMethod, paymentStatus }` only for `vodafone_cash`/`instapay` orders, else 404.

New order-related routes live in `apps/api/src/routes/orders/manual-payments.ts` and the settings proxy in `apps/api/src/routes/admin/manual-payment-settings.ts` (both mounted in `routes/index.ts`) rather than growing the 2100-line `orders/index.ts`.

## 3. Storefront client

### 3.1 Checkout (`apps/client/src/pages/checkout.tsx`)

- `StorePaymentMethod` gains the two methods; radio options (AR/EN labels: "فودافون كاش" / "Vodafone Cash", "إنستاباي" / "InstaPay") rendered only when `allowedMethods` includes them.
- Submit button label: "Place order & view payment details".
- On success, navigate to `/checkout/manual/:orderId` (stash email in sessionStorage like the Paymob flow) and clear the cart (order is placed; payment happens out-of-band).

### 3.2 Payment instructions page `apps/client/src/pages/checkout-manual.tsx` (route `/checkout/manual?orderId=…`, matching the existing `/checkout/paymob/pay?orderId=…` convention; all `/checkout/manual/:orderId` mentions above mean this URL)

- Fetches the order summary and `GET /store/manual-payment-methods` (Medusa store client).
- Shows order number, total (EGP), and for:
  - **Vodafone Cash:** wallet number (copy button), account name, instructions, "Send screenshot on WhatsApp" button.
  - **InstaPay:** QR image, InstaPay address (copy button), account name, instructions, "Send confirmation code on WhatsApp" button.
- WhatsApp link: `https://wa.me/<digits>?text=<encoded>` with text like `طلب رقم #123 — تم الدفع عبر فودافون كاش بمبلغ 250 جنيه` / English equivalent.
- If the method's settings are missing (e.g. no number configured): show "Payment details are being updated — please contact us" with the contact page link.
- If the order is already paid: show a success state with a link to the account/library.

### 3.3 Account orders

Pending `vodafone_cash`/`instapay` orders show an "Awaiting payment verification" badge and a "View payment details" link to `/checkout/manual/:orderId`.

### 3.4 Storefront admin

- `apps/client/src/pages/admin/store/manual-payments.tsx` — same fields as Medusa's page, QR upload via `/api/admin/manual-payments/qr`; added to admin nav + `App.tsx` route `/admin/store/manual-payments`.
- `apps/client/src/pages/admin/store/orders.tsx` — method labels for the two methods; a **Confirm payment** button (with confirm dialog) on pending manual orders calling `/api/admin/orders/:id/confirm-payment`; shows the returned error toast on 502.

## Error handling summary

| Situation | Behavior |
|---|---|
| Medusa mirror fails at checkout | Order still placed (existing best-effort); `medusaOrderId` null; storefront confirm falls back to lookup, then 502 if still not found. |
| Storefront confirm while Medusa down | 502, nothing changes locally. |
| Medusa "Mark as paid" while Express down | Subscriber throws → event bus retry; admin can also press Confirm in storefront admin later (idempotent). |
| Both confirmations happen | Second one is a no-op; emails sent once. |
| Settings incomplete | Checkout hides the method until its details are set (`withoutUnconfiguredManualMethods`); the buyer page keeps the contact fallback for orders placed before the details were cleared. |

## Testing

Vitest unit tests next to the code, following existing patterns:
- `vodafone-cash/service.test.ts`, `instapay/service.test.ts` — statuses, refund throws, webhook not supported.
- `region-payment-methods.test.ts` — new id mappings; not filtered for digital-only.
- `manual-payment` service + validation schema tests; admin/store route tests.
- `manual-payment-captured.test.ts` — filters by source/method, calls Express with the secret, throws on failure.
- `markOrderPaid.test.ts` — updates once, second call no-op, rejects non-manual methods.
- Express route tests: order creation accepts new methods (EGP only), confirm-payment calls Medusa first and does not change locally on Medusa failure, internal endpoint rejects bad secret.
- Client: checkout shows the options when enabled; manual page renders VC vs InstaPay and builds the WhatsApp link.

## Related security issue (out of scope)

`apps/api/src/lib/admin-socket.ts` joins every Socket.IO connection to the `admins` room without authentication (and CORS `origin: true` with credentials), leaking new-order names/emails/totals — including the new manual orders. To be fixed in a separate change.
