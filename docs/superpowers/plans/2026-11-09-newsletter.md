# Newsletter (subscribe + notify on publish) — Plan

**Goal:** A visitor submits their email in the newsletter block → it is stored → whenever an admin publishes content, all confirmed subscribers get an email.

**Today:** `apps/client/src/components/content/newsletter-block.tsx` is UI-only (toast "launching soon", nothing saved). No subscriber table, endpoint, or send-on-publish exists.

**Existing pieces we reuse**
- Email: `apps/api/src/lib/email/email.ts` → `sendEmail()` (Resend, needs `RESEND_API_KEY`) + bilingual `shell()` template style in `authEmail.ts`.
- Content: `content_items` (types: observatory, article, study, publication, news, event; status draft/review/published/archived; `publishedAt`) in `packages/db/src/schema/contentItems.ts`. Admin create/update in `apps/api/src/routes/cms/admin.ts` → `lib/cms/repo.ts` (`createItem`, `updateItem`).
- DB: drizzle, `pnpm db:push`. Public route pattern: `routes/contact/index.ts`.

## Decisions to confirm
1. **Which types notify?** Proposed: article, study, publication, news (not observatory/event) — configurable constant.
2. **Double opt-in?** Proposed yes (confirm link by email) — avoids spam signups and matches the consent checkbox in the UI.
3. **Admin controls every send.** The content form has a "Notify subscribers by email" checkbox (default **off**, so nothing is mailed by accident). Only an explicit tick + `published` status sends. Each item is sent at most once, tracked with `notifiedAt`.
4. **Resend limits:** for large lists use batched sends (Resend batch API) and a background loop, not the request handler.

## Tasks

### 1. DB (`packages/db`)
- New `newsletterSubscribers` table: `id`, `email` (unique, lowercased), `status` enum (`pending`|`confirmed`|`unsubscribed`), `locale` (`ar`|`en`), `confirmToken`, `unsubscribeToken` (random, unique), `consentAt`, `confirmedAt`, `unsubscribedAt`, `createdAt`.
- Add `notifiedAt timestamp null` to `content_items`.
- Export from `schema/index.ts`; `pnpm db:push`.

### 2. Public API (`apps/api/src/routes/newsletter/index.ts`, mount in `routes/index.ts`)
- `POST /newsletter/subscribe` `{ email, consent, locale }` — validate (zod), rate-limit by IP, upsert: new → `pending` + send confirm email; already `confirmed` → return same success (no enumeration); `unsubscribed` → back to `pending`.
- `GET /newsletter/confirm?token=` → `confirmed`, redirect to `/newsletter/confirmed` page.
- `GET|POST /newsletter/unsubscribe?token=` → `unsubscribed` (POST also supports one-click `List-Unsubscribe-Post`).

### 3. Emails (`lib/email/newsletterEmail.ts`)
- `sendNewsletterConfirmEmail({ to, url })` — bilingual, same shell as auth emails.
- `sendContentPublishedEmail({ to, item, unsubscribeUrl })` — title, summary, cover, "read" link to the public detail URL, unsubscribe link, `List-Unsubscribe` headers (extend `sendEmail` to accept `headers`).

### 4. Notify on publish (`lib/newsletter/notify.ts`)
- Request body gets `notifySubscribers?: boolean` (zod, in `lib/cms/schemas.ts`; not stored on the item). In `routes/cms/admin.ts` after create/update: send only if `notifySubscribers === true`, `status === "published"`, `notifiedAt IS NULL`, and type in notify list → atomically set `notifiedAt` (UPDATE … WHERE notifiedAt IS NULL RETURNING) so it can never double-send, then fire-and-forget `notifySubscribers(item)`.
- Drafts: ticking the box on a draft does nothing until it is published; the editor shows "will be sent when you publish" and the flag is applied on the save that publishes.
- Already-published item never sent: `POST /admin/cms/items/:id/notify` + a "Send to subscribers" button (disabled once `notifiedAt` is set, shows "Sent on <date> to N subscribers").
- Editor shows the confirmed-subscriber count next to the checkbox and a confirm dialog before sending.
- `notifySubscribers`: page through `confirmed` subscribers, send in batches (e.g. 50), per-recipient unsubscribe link, log failures, never throw into the admin request.

### 5. Client
- `newsletter-block.tsx`: call `POST /newsletter/subscribe`, replace the "launching soon" toast with real success ("check your inbox to confirm") and error states; remove the "Round 1: UI only" comment; update `newsletter-block.test.tsx`.
- Pages `/newsletter/confirmed` and `/newsletter/unsubscribed` (bilingual).
- Admin: subscribers list (email, status, date) with CSV export + count; "Notify subscribers" checkbox (default off) + send-status line in the content editor.

### 6. Tests (vitest, match existing `*.test.ts` style)
- subscribe: valid, invalid email, no consent, duplicate, re-subscribe after unsubscribe, rate limit.
- confirm / unsubscribe token handling (bad token → 400/404).
- notify: box unticked → no send; ticked + published → sends once; ticked on draft → sends only when published; re-save does not resend; manual notify endpoint works once; draft doesn't send; unconfirmed/unsubscribed excluded; non-notify types skipped; batch failure doesn't break the admin save.

### 7. Ops / config
- `RESEND_API_KEY` set in prod; verify the `darnozom.com` sending domain (SPF/DKIM) in Resend; `PUBLIC_SITE_URL` correct for links.
- Update the 2026-10-05 spec note ("Newsletter backend … Round 1 UI only") to point here.

## Done when
Submitting an email stores a `pending` subscriber and sends a confirm email; confirming flips to `confirmed`; publishing a new article emails every confirmed subscriber exactly once, with a working unsubscribe link; tests pass and `pnpm typecheck` is clean.
