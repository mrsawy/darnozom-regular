# Site Redesign + Content CMS — Design

Date: 2026-10-05
Status: Approved in conversation, pending written-spec review
Source material: `C:\Users\UTD\Downloads\DarNozom_Final_Developer_Package` (design brief `source/Design_Brief_AR.md`, prototype `DarNozom_Website_Prototype.html`, reference images in `assets/`)

## 1. Goal

Re-skin the whole public site to the approved navy/ivory/gold identity, rebuild the home page to match the reference image, and give admins the ability to publish six content types (Observatory, Articles, Studies, Publications, News, Events), each with a list page ("view all") and a detail page.

### In scope (round 1 — "core redesign")

- New design tokens (colors, fonts, radii) applied site-wide.
- New header (top utility bar + logo/7-item nav row with dropdowns) and new 4-column footer.
- New home page, section order fixed per the brief.
- Unified content model + admin CRUD for the six types.
- Featured slider ("مختارات دار نظم") managed from admin.
- Public list + detail pages for the six types.
- Seed data from the prototype, **published**.
- Migration of existing `events` rows into the new model, with `/events` redirect.

### Out of scope (later rounds)

- `/en/` URL-based localisation, hreflang, sitemap (language stays the current localStorage toggle).
- Unified Arabic search, topic pages, reading list, AI editor assistant.
- Newsletter backend (double opt-in, sending). Round 1 renders the newsletter block UI only; submit shows a "coming soon"/success toast without storing.
- Restructuring of About / Services / Research Center / Academy / Consulting / Nozom Platform pages per brief §6–13 — they only receive the new styling.
- Public Policy + Public Administration merge redirects.
- Editorial workflow roles (reviewer, editor, etc.) — all admins can do everything, as today.

### Constraints

- Store, checkout, cart, account, Medusa integration and payment flows must keep working unchanged (visual restyle only).
- **Books are managed only in the Medusa dashboard.** Everything else is managed in the website's own admin panel.
- Arabic is default and RTL; English LTR via existing `LanguageProvider`.
- Work happens on branch `feat/redesign-cms`, never directly on `production` (auto-deploys).

## 2. Visual system

Tokens from brief §2, replacing the "Premium Islamic Green" palette in `apps/client/src/index.css`:

| Token | Hex | Use |
|---|---|---|
| navy (primary) | `#244B70` | buttons, headings, hero text panel |
| navy-deep | `#183650` | top bar, dark footer, gradients |
| ivory (background) | `#F8F6F1` | page background, light footer |
| white | `#FFFFFF` | cards, inputs |
| sky | `#EAF0F6` | highlight/selected states |
| gold | `#B59B6B` | accents, dividers, reference line text |
| gold-light | `#D2B68F` | rectangular category badges, gold buttons (dark text) |
| text | `#1C2D3E` | body + headings |
| text-muted | `#526477` | descriptions, metadata |
| border | `#D7E0E8` | card/field borders |

- shadcn HSL variables (`--primary`, `--background`, `--accent`, …) are remapped to these values so existing components restyle automatically. Old emerald tokens are removed; any direct uses are replaced.
- Fonts: Noto Sans Arabic (Arabic) and Inter (English), self-hosted under `apps/client/public/fonts` via `@font-face`. Body 18px desktop / 16px mobile, line-height 1.8 for Arabic.
- Max content width 1200px, 24px gutters, 20px mobile side padding, card radius 4px, thin borders, minimal shadows, touch targets ≥ 44px.
- Respect `prefers-reduced-motion`.

## 3. Shared layout

### Header (`components/site-nav.tsx`, rewritten)

- **Top bar** (navy-deep, thin): Search, Book store (`/services/store/books`), My account / sign-in, Cart, language switch ("English" / "العربية").
- **Main row**: logo + "دار نظم" + tagline "للبحوث والاستشارات والتدريب" on the start side; the 7 nav items in one row; "DARNOZOM" wordmark on the end side when space allows.
- Nav items and dropdowns per brief §4 table:
  1. عن دار نظم → `/about` (من نحن، رؤيتنا، رسالتنا، منهجنا، قيمنا والهيكل — anchor links)
  2. خدماتنا → `/services` (5 services linking to existing pages)
  3. المعرفة والبحوث → two columns: research center + 3 units (existing pages/anchors); "المعرفة والمشروعات": المرصد `/observatory`، المقالات `/articles`، الدراسات `/studies`، البحوث `/publications?kind=research`، الدوريات `/publications?kind=periodical`، الكتب `/services/store/books`
  4. الأكاديمية → `/academy` (3 tracks, courses, organisations — existing routes)
  5. المكتبة والإصدارات → `/publications` with sub-levels: المكتبة (all books, Dar Nozom books → store with publisher filter); إصدارات دار نظم (books, articles, studies, research, periodicals, observatory)
  6. الأخبار والفعاليات → `/news-events` (news, training, workshops, seminars, conferences, exhibitions → tab/filter query params)
  7. تواصل معنا → `/contact`
- Behaviour: hover opens on desktop with ~200ms close delay; name is a link, a separate chevron button toggles (`aria-expanded`, `aria-controls`); Escape closes and returns focus; one open at a time; mobile uses a sheet with accordion sub-menus. Active top item reflects current route section.
- Where a brief destination has no page yet in round 1, link to the nearest existing page (documented in a `nav-config.ts` so it's easy to change later).

### Footer (`components/site-footer.tsx`, rewritten)

Four columns per `DarNozom_Footer_Structure_Reference.png`:

1. **دار نظم** (link home) → tagline → slogan "معرفة ترشد القرار… وقيادة تبني المؤسسات" → reference line "في ضوء مقاصد الشريعة" (gold).
2. **المعرفة والتعلم**: المعرفة والبحوث، المرصد، الأكاديمية، الإصدارات.
3. **الخدمات والحلول**: خدماتنا، الاستشارات، نظم بلاتفورم، الأخبار والفعاليات.
4. **تواصل معنا**: info@darnozom.com, +20 102 204 4240 (LTR), اشترك في النشرة (scrolls to/opens newsletter), أرسل طلبك (`/service-registration`).

Divider, then © year + privacy/terms/returns links.
Variant prop `tone: "dark" | "light"` — dark (`#183650`, light text) by default; pages whose last block is the navy newsletter pass `tone="light"` (ivory bg, navy text). Home page uses light.

## 4. Data model

New Drizzle schema file `packages/db/src/schema/contentItems.ts` (exported via schema index), applied with the existing `db:push` flow.

### `content_items`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| type | enum `content_type`: `observatory, article, study, publication, news, event` | |
| slug | varchar(200), unique per type | auto-generated from English title (fallback: id-based) if blank; editable |
| status | enum `content_status`: `draft, review, published, archived` | only `published` is public |
| titleAr / titleEn | varchar(500) | titleAr required |
| summaryAr / summaryEn | text | |
| bodyAr / bodyEn | text (sanitised HTML) | |
| coverImageUrl | varchar(1000) | |
| area | enum `content_area` nullable: `sharia_policy, public_policy_admin, leadership_governance` | the 3 research units |
| authorAr / authorEn | varchar(300) | author or issuing body |
| isExternal | boolean default false | "مرجع من جهة أخرى" badge vs "إصدار دار نظم" |
| externalUrl | varchar(1000) | original source when external |
| publishedAt | timestamp nullable | set on first publish; editable; drives sorting |
| details | jsonb default `{}` | type-specific, see below; validated with zod per type |
| createdAt / updatedAt | timestamp | |

Indexes: `(type, status, publishedAt desc)`, unique `(type, slug)`.

### `details` shape per type (zod schemas in `packages/api-zod`)

- **observatory**: `kind: "daily_brief" | "weekly_review" | "research_output" | "follow_up_file"`, `region?: "egypt" | "middle_east" | "islamic_world" | "rest_of_world"`, `whatHappenedAr/En?`, `ourReadingAr/En?`, `researchQuestionsAr/En?` (HTML), `sources: {title, url}[]`.
- **article**: `relatedLinks: {title, url}[]`.
- **study**: `questionAr/En?`, `methodAr/En?`, `findingsAr/En?`, `recommendationsAr/En?`, `keywords: string[]`, `pdfUrl?`.
- **publication**: `kind: "report" | "periodical" | "research"`, `issueNumber?`, `pdfUrl?`. (Books are never stored here.)
- **news**: `relatedLinks: {title, url}[]`.
- **event**: `kind: "training" | "workshop" | "seminar" | "conference" | "exhibition"`, `startsAt` (ISO), `endsAt?`, `timezone` (default `Africa/Cairo`), `mode: "in_person" | "online" | "hybrid"`, `venueAr/En?`, `registration: "open" | "closed" | "interest"`, `registrationUrl?`, `isExternalEvent: boolean`, `organizerName?`, `organizerUrl?`. Upcoming/past is derived from `startsAt`, not stored.

### `featured_slides`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| position | integer | ordering |
| isActive | boolean default true | |
| sourceKind | enum `content \| book \| custom` | |
| contentItemId | int FK → content_items (nullable, on delete set null) | when `content` |
| medusaProductId | varchar(100) nullable | when `book` |
| badgeAr/En, titleAr/En, summaryAr/En, imageUrl, ctaLabelAr/En, href | nullable | required when `custom`; when set on linked kinds they **override** the linked item's values |
| createdAt / updatedAt | timestamp | |

Public endpoint resolves linked slides to final card data; slides whose linked item is missing/unpublished are skipped. Home renders the first 4–6 active slides (first = large card).

### Events migration

One-off script `apps/api/src/scripts/migrateEventsToContent.ts`: copies every `events` row into `content_items` (`type=event`, `status=published`). Old free-text `dateAr/dateEn` cannot be reliably parsed; the script attempts ISO/`d MMMM yyyy` parsing (Arabic + English month names) and, if it fails, sets `startsAt` from `createdAt` and moves the original text into `details.legacyDateText` and the item to `status=review` so an admin fixes it. Old `events` table and `/api/events` endpoints remain read-only until a later cleanup; the admin events screen is replaced by the new one. Script is idempotent (skips rows already migrated, tracked via `details.legacyEventId`).

## 5. API (`apps/api/src/routes/cms/`)

Public (no auth, only `status=published`):

- `GET /api/cms/items?type=&area=&kind=&region=&when=upcoming|past&q=&page=&pageSize=` → `{items, total}`; sorted by `publishedAt desc`, except events with `when=upcoming` sorted by `startsAt asc`.
- `GET /api/cms/items/:type/:slug` → item + `related` (up to 3 same-type, same-area, published).
- `GET /api/cms/home` → one round-trip for the home page: `{featured, observatory: {lead, others[3]}, articles[3], studies[2], publications[4], newsEvents[3]}`. Publications merges admin publications with featured Medusa books (via the existing Medusa admin helper, publisher = Dar Nozom or `featured` tag), newest first, books mapped to `{kind:"book", href:"/services/store/books/:id"}`. A Medusa failure degrades to admin publications only (logged, not 500).

Admin (`requireAdmin`):

- `GET/POST /api/admin/cms/items`, `GET/PATCH/DELETE /api/admin/cms/items/:id` — any status; zod validation of shared fields + per-type `details`; body HTML sanitised server-side (`sanitize-html`, allow-list of headings, lists, links, images, blockquote, tables).
- `GET/POST /api/admin/cms/featured`, `PATCH/DELETE /api/admin/cms/featured/:id`, `PUT /api/admin/cms/featured/order` (array of ids).
- `GET /api/admin/cms/book-options?q=` — Medusa product search for the featured picker.
- File upload: reuse existing `/api/admin/upload-image` for images; add a PDF variant (`/api/admin/upload-file`, `application/pdf`, ≤ 25 MB) on the same local object store.

Errors: 400 with zod issue list, 404 for unknown id/slug, 409 on duplicate slug.

## 6. Admin UI (`apps/client/src/pages/admin/content/`)

- Sidebar gets a **المحتوى** group: مختارات الرئيسية، المرصد، المقالات، الدراسات، الإصدارات، الأخبار، الفعاليات. Old الفعاليات entry removed; `/admin/events` redirects to `/admin/content/event`.
- Routes: `/admin/content/:type` (list), `/admin/content/:type/new`, `/admin/content/:type/:id` (editor), `/admin/featured`.
- **List**: table with title, status badge, area, date, actions; search box; status filter; "جديد" button.
- **Editor** (one component driven by a per-type config in `lib/content-types.ts` that declares labels, which shared fields show, and which `details` fields render):
  - Arabic / English tabs for text fields; TipTap rich-text editor (bold, italic, headings, lists, link, image, quote) for body and long HTML detail fields.
  - Cover via existing `ImageUploadField`; PDF via new `FileUploadField`.
  - Repeatable rows for sources / related links.
  - Status select + publish date; "حفظ" and "معاينة" (opens public page; drafts previewable by admins via `?preview=1`, served by the admin endpoint).
- **Featured**: card list with drag handles (`@dnd-kit/sortable`), active toggle, and an add/edit dialog with source tabs: محتوى (search content items), كتاب (search Medusa books), بطاقة مخصصة (manual fields + image upload + link).

## 7. Public pages

Shared components in `components/content/`: `CategoryBadge` (gold rectangle), `ContentCard` (image, badge, area, title, summary, author, date, CTA verb per type), `SectionHeader` (title, subtitle, "عرض الكل ←"), `ListingPage` (filters bar + grid + pagination + empty state), `DetailLayout` (breadcrumb, header meta, cover, body with `prose`, sidebar meta, related items, subscribe box), `NewsletterBlock`.

| Route | Content |
|---|---|
| `/observatory` | Title "مرصد دار نظم للشأن العام" + intro text from brief §9; tabs by kind; filters area, region, date |
| `/observatory/:slug` | sections "ما الذي حدث؟" / "قراءة دار نظم" / "موضوعات تستحق البحث", sources list |
| `/articles`, `/articles/:slug` | filters area; detail = body + related links |
| `/studies`, `/studies/:slug` | detail = question, method, findings, recommendations, keywords, "حمّل الدراسة" when `pdfUrl` |
| `/publications`, `/publications/:slug` | tabs الكل / كتب / تقارير / دوريات / أبحاث; "كتب" tab lists Medusa Dar Nozom books linking to store; detail = kind, issue, PDF |
| `/news-events`, `/news-events/:slug` | tabs الأخبار / الفعاليات; event filters kind, upcoming/past, mode; event detail shows date/time/tz, mode/venue, registration CTA ("سجّل للمشاركة" / "سجّل اهتمامك" / past "اطّلع على ملخص الفعالية"), external badge |
| `/events` | redirect → `/news-events?tab=events` |

All list pages: URL query params hold filters (back button preserves them); loading skeletons; empty state message; errors via existing `FetchError`. Unknown slug → existing NotFound. Data via TanStack Query. Each page sets `document.title`.

## 8. Home page (`pages/home.tsx`, rewritten)

Order fixed (brief §5), each section hidden when its data is empty:

1. **مختارات دار نظم** — H1 + subtitle "معرفة وبرامج وحلول تدعم القرار والمؤسسات"; large card (~60% width, start side) with image on top, navy text panel, gold badge + gold CTA, prev/next arrows over image, dots at bottom; three side cards (image beside text). Manual navigation only (arrows, dots, clicking a side card, swipe on mobile via existing `embla-carousel-react`), 250–300ms transition, `aria-live="polite"` title announcement.
2. **عن دار نظم** — slogan, reference line (gold), short intro text from brief §1, buttons "تعرّف على دار نظم" (`/about`) and "خدماتنا" (`/services`), building image on the end side; below, a light services strip with 4 line icons and thin gold dividers: البحوث والدراسات، التدريب وبناء القدرات، الاستشارات، نظم بلاتفورم.
3. **المرصد** — lead item large (image + navy overlay panel), three compact items beside it, "تابع المرصد".
4. **المقالات** — 3 cards, "عرض الكل".
5. **الدراسات** — 2 wide horizontal cards, "عرض الكل".
6. **الإصدارات** — 4 cover cards (Medusa books + admin publications), "المكتبة ومتجر الكتب".
7. **الأخبار والفعاليات** — 3 cards with خبر / event-kind badges, "عرض الكل".
8. **Newsletter block** (navy) — "كل جديد من دار نظم يصلك على بريدك", email + consent checkbox + "اشترك في النشرة" (UI only this round).
9. Footer `tone="light"`.

Mobile: featured lead first then swipeable side cards; other grids collapse to one column.
Old home sections (stats, partners, etc.) are removed from the home page; their components stay in the codebase untouched where other pages use them.

## 9. Seed data

Script `apps/api/src/scripts/seedHomeContent.ts` (idempotent by `(type, slug)`), run once on deploy via the existing deploy hook pattern:

- Image crops: a one-time local script (`scripts/crop-reference-images.mjs`, `sharp` as a root devDependency) cuts regions from `DarNozom_Homepage_Reference.png` using `assets/reference-regions.json` into `apps/client/public/seed/*.webp`, which are committed. The seed script only references those paths; it does not need `sharp` at runtime.
- Creates **published** items mirroring the reference: observatory lead "مستجدات السياسات والإدارة والشأن العام" + الموجز اليومي / الإنتاج الفكري والبحثي / ملفات المتابعة; articles "القيمة العامة وجودة القرار", "القيادة وبناء المؤسسات", "التأصيل الشرعي وفهم الواقع"; studies "الحوكمة وجودة الخدمات العامة", "السياسة الشرعية وبناء المؤسسات"; publications (report "السياسات العامة", periodical "الإدارة العامة"); news "جديد دار نظم"; events seminar "السياسات العامة وتطوير المؤسسات", workshop "القيادة والإدارة والحوكمة"; featured slides: project "نحو تأسيس علم السياسة الشرعية المعاصرة" (custom), program "القيادة والإدارة والحوكمة" (custom → academy), publications "كتب السياسة الشرعية والإدارة" (custom → publications), solutions "حلول نظم بلاتفورم" (custom → services).
- English fields filled with translations of the same text. Events get no invented dates beyond what the reference shows; seeded events use `registration: "interest"`.
- Known limitation: the only source image is 792px wide, so seeded crops are low resolution until admins upload originals.

## 10. Testing

- **API (vitest, existing setup)**: zod validation per type (valid/invalid `details`), public endpoints never return non-published items, slug uniqueness 409, featured resolution skips unpublished links, home endpoint degrades when Medusa throws, events migration date parsing + idempotency.
- **Client (vitest + Testing Library)**: `ContentCard` renders per-type CTA verb and external badge; home hides empty sections; featured carousel arrow/dot/keyboard navigation; listing page reads/writes filters from the URL; editor shows the right `details` fields per type; footer tone variant.
- **Manual verification**: run client + API locally, compare home against the reference image at desktop and 375px widths in both languages; create/edit/publish/unpublish one item of each type in admin and confirm it appears/disappears on home and list pages; store, cart and checkout still work.
- `pnpm typecheck` and `pnpm test` pass before merge.

## 11. Rollout

1. Branch `feat/redesign-cms`; schema pushed to local DB.
2. Merge to `production` only after user review of a local run.
3. Deploy runs `db:push`, then `migrateEventsToContent`, then `seedHomeContent` (both idempotent).
4. Before the first deploy of this branch, take a manual `pg_dump` of the production DB on the server. `deploy.sh` only *restores* `backup.sql` on first run; it does not create backups.

## 12. New dependencies

- API: `sanitize-html` (+ types).
- Client: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`; `@dnd-kit/core`, `@dnd-kit/sortable`.
- Root dev: `sharp` (one-time image cropping script only).
- Fonts: Noto Sans Arabic + Inter `.woff2` files committed under `apps/client/public/fonts`.
