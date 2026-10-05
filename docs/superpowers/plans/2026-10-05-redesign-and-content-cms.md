# Site Redesign + Content CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the DarNozom site to the approved navy/ivory/gold identity, rebuild the home page to match the reference design, and let admins publish Observatory, Articles, Studies, Publications, News and Events — each with a "view all" list page and a detail page.

**Architecture:** One `content_items` Postgres table (Drizzle) with a `type` column and a zod-validated `details` JSONB for type-specific fields, plus a `featured_slides` table for the home slider. A thin Express router layer (`/api/cms/*` public, `/api/admin/cms/*` admin) sits on a single repository module. The React client gets one config-driven list page, one detail page, one admin editor, and a rewritten home/header/footer. Books stay in Medusa and are merged into the Publications row on the client.

**Tech Stack:** pnpm monorepo · Express 5 + Drizzle ORM 0.45 + Postgres · zod 3 · vitest + supertest · React 19 + Vite + wouter + TanStack Query + Tailwind 4 + shadcn/ui · TipTap 3 · dnd-kit · sanitize-html · @fontsource-variable · sharp (one-off script).

**Spec:** `docs/superpowers/specs/2026-10-05-redesign-and-content-cms-design.md`

## Global Constraints

- Work only on branch `feat/redesign-cms`. Never commit to `production` (it auto-deploys).
- Store, cart, checkout, account, Medusa and payment flows: visual restyle only. No behaviour changes.
- Books are managed only in the Medusa dashboard. `content_items` never stores books.
- Arabic is the default (RTL). English uses the existing `LanguageProvider` toggle; no `/en/` routes this round.
- Colors (verbatim from brief): navy `#244B70`, navy-deep `#183650`, ivory `#F8F6F1`, white `#FFFFFF`, sky `#EAF0F6`, gold `#B59B6B`, gold-light `#D2B68F`, text `#1C2D3E`, text-muted `#526477`, border `#D7E0E8`.
- Fonts: Noto Sans Arabic + Inter, self-hosted. Body 18px desktop / 16px mobile; Arabic line-height 1.8. Max content width 1200px; card radius 4px; tap targets ≥ 44px.
- Only `status = "published"` items are ever returned by public endpoints.
- No invented dates, prices or author names in seed data. Seeded events have no `startsAt` and use `registration: "interest"`.
- Home section order (fixed): Featured → About + services strip → Observatory → Articles → Studies → Publications → News & Events → Newsletter → footer (light tone). Any section without data is hidden.
- Slugs are **globally unique** across all content types (simplifies `/news-events/:slug`, which serves both news and events).
- Every API mutation route uses `requireAdmin` from `apps/api/src/middlewares/adminAuth.ts`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Spec deviations decided while planning (apply to the spec in Task 0)

1. Slugs are unique globally, not per type.
2. Admin update is `PUT /api/admin/cms/items/:id`, a full replace of the editable fields (the editor always sends the whole form).
3. Book data for the featured slider and Publications row is fetched **client-side** through the existing Medusa store helpers (`searchStoreBooks`, `listProductsByIds`). The API stores only `medusaProductId`, and there's no `/api/admin/cms/book-options` endpoint.
4. The events migration and the seed run at **API startup** as idempotent functions (same pattern as `seedJobOpenings`), not as deploy-script steps. The seed runs once, guarded by a `site_settings` row `cms_seed_v1`.
5. `details.startsAt` on events is optional (seeded and unparseable legacy events have none). With no date, an event counts as "upcoming" and the CTA reads "سجّل اهتمامك".
6. Fonts come from `@fontsource-variable/noto-sans-arabic` and `@fontsource-variable/inter` (bundled = self-hosted).
7. Zod schemas live in `apps/api/src/lib/cms/schemas.ts`. The client has plain TS types in `apps/client/src/lib/cms-types.ts` (the client doesn't depend on `@workspace/api-zod`).
8. The newsletter form shows a toast saying the service is launching soon. It never claims the email was subscribed.

## Review Focus

1. **Arabic-only titles:** a slug can't be derived from Arabic, so the item must still save with a generated `type-xxxxxxxx` slug and must not 500. Owner: Task 3 (`slug.test.ts` + admin route test "creates with Arabic-only title").
2. **Script injection in rich text:** `<script>`, `onerror=` and `javascript:` links pasted into body or any HTML detail field must be stripped before storage. Owner: Task 2 (`sanitize.test.ts`) + Task 3 (route test asserting the stored body).
3. **Unpublishing an item that is linked from the featured slider:** the slide must disappear from `/api/cms/home`, not render an empty card. Owner: Task 5 (featured test).
4. **English view of an item with no English text:** fields fall back to Arabic instead of showing blanks. Owner: Task 11 (`cms-labels.test.ts` `pickLang`).
5. **Medusa down or no Dar Nozom books:** the Publications row and the Publications "books" tab still render the admin publications, with no error screen. Owner: Task 11 (`mergePublications` test) + Task 14 (home test with the books hook rejecting).

---

## File Structure

**API (`apps/api/src`)**
- `lib/cms/schemas.ts`: zod schemas, enums, `parseContentItem`, `featuredSlideInput`
- `lib/cms/slug.ts`: `slugify`, `withSuffix`
- `lib/cms/sanitize.ts`: `sanitizeRichHtml`, `sanitizeItem`
- `lib/cms/paths.ts`: `contentPath(type, slug)`
- `lib/cms/repo.ts`: all DB access for content + featured (create/update/delete/list/home/resolveFeatured)
- `routes/cms/public.ts`, `routes/cms/admin.ts`, `routes/cms/featured.ts`: thin HTTP layers
- `routes/admin/index.ts`: add `/admin/upload-file` (PDF); switch the stats event counts to `content_items`
- `lib/seed/migrateEventsToContent.ts`: legacy events → content_items
- `lib/seed/cmsSeedData.ts` + `lib/seed/seedCmsContent.ts`: prototype seed
- `index.ts`: call the migration, then the seed, at startup

**DB (`packages/db/src/schema`)**
- `contentItems.ts`: `content_items`, `featured_slides`, and their enums

**Client (`apps/client/src`)**
- `index.css`, `main.tsx`: tokens + fonts
- `lib/nav-config.ts`, `components/nav/account-controls.tsx`, `components/site-nav.tsx`, `components/site-footer.tsx`
- `lib/cms-types.ts`, `lib/cms-api.ts`, `lib/cms-labels.ts`, `lib/cms-sections.ts`, `lib/darnozom-books.ts`
- `components/content/*`: badge, card, section header, rich html, newsletter, detail blocks, page shell
- `pages/content/content-list-page.tsx`, `pages/content/content-detail-page.tsx`
- `components/home/*` + `pages/home.tsx`
- `lib/content-types.ts` (admin field config), `components/admin/rich-text-editor.tsx`, `components/admin/file-upload-field.tsx`
- `pages/admin/content/content-list.tsx`, `pages/admin/content/content-editor.tsx`, `pages/admin/content/featured.tsx`
- `App.tsx`, `pages/admin/layout.tsx`

**Root**
- `scripts/crop-reference-images.mjs`, `apps/client/public/seed/*.webp`, `apps/client/public/darnozom-n-logo-navy.png`

---

### Task 0: Sync the spec with the planning deviations

**Files:**
- Modify: `docs/superpowers/specs/2026-10-05-redesign-and-content-cms-design.md`

- [ ] **Step 1: Edit the spec.** Apply the 8 "Spec deviations" listed above:
  - In §4, change `unique per type` to `globally unique` and the index to `unique(slug)`.
  - In §4 events, make `startsAt` optional.
  - In §5, replace `PATCH` with `PUT` for items, delete the `book-options` line, and change the home endpoint so it returns admin publications only (books are merged client-side).
  - In §9 and §11, say the migration and seed run at API startup, guarded by `site_settings.cms_seed_v1`.
  - In §12, replace the font bullet with the two `@fontsource-variable` packages.
- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-10-05-redesign-and-content-cms-design.md
git commit -m "docs(spec): align CMS spec with implementation plan decisions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Database schema for content and featured slides

**Files:**
- Create: `packages/db/src/schema/contentItems.ts`
- Modify: `packages/db/src/schema/index.ts` (add export)

**Interfaces:**
- Produces: `contentItems`, `featuredSlides` tables; enums `contentTypeEnum`, `contentStatusEnum`, `contentAreaEnum`, `featuredSourceEnum`; types `ContentItem`, `NewContentItem`, `FeaturedSlide`, `NewFeaturedSlide`. All are exported from `@workspace/db`.

- [ ] **Step 1: Write the schema file**

```ts
// packages/db/src/schema/contentItems.ts
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const contentTypeEnum = pgEnum("content_type", [
  "observatory",
  "article",
  "study",
  "publication",
  "news",
  "event",
]);
export const contentStatusEnum = pgEnum("content_status", ["draft", "review", "published", "archived"]);
export const contentAreaEnum = pgEnum("content_area", [
  "sharia_policy",
  "public_policy_admin",
  "leadership_governance",
]);
export const featuredSourceEnum = pgEnum("featured_source", ["content", "book", "custom"]);

export const contentItems = pgTable(
  "content_items",
  {
    id: serial("id").primaryKey(),
    type: contentTypeEnum("type").notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    status: contentStatusEnum("status").notNull().default("draft"),
    titleAr: varchar("title_ar", { length: 500 }).notNull(),
    titleEn: varchar("title_en", { length: 500 }).notNull().default(""),
    summaryAr: text("summary_ar").notNull().default(""),
    summaryEn: text("summary_en").notNull().default(""),
    bodyAr: text("body_ar").notNull().default(""),
    bodyEn: text("body_en").notNull().default(""),
    coverImageUrl: varchar("cover_image_url", { length: 1000 }).notNull().default(""),
    area: contentAreaEnum("area"),
    authorAr: varchar("author_ar", { length: 300 }).notNull().default(""),
    authorEn: varchar("author_en", { length: 300 }).notNull().default(""),
    isExternal: boolean("is_external").notNull().default(false),
    externalUrl: varchar("external_url", { length: 1000 }).notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("content_items_slug_uq").on(t.slug),
    index("content_items_listing_idx").on(t.type, t.status, t.publishedAt),
  ],
);

export const featuredSlides = pgTable("featured_slides", {
  id: serial("id").primaryKey(),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  sourceKind: featuredSourceEnum("source_kind").notNull(),
  contentItemId: integer("content_item_id").references(() => contentItems.id, { onDelete: "set null" }),
  medusaProductId: varchar("medusa_product_id", { length: 100 }),
  badgeAr: varchar("badge_ar", { length: 100 }).notNull().default(""),
  badgeEn: varchar("badge_en", { length: 100 }).notNull().default(""),
  titleAr: varchar("title_ar", { length: 500 }).notNull().default(""),
  titleEn: varchar("title_en", { length: 500 }).notNull().default(""),
  summaryAr: text("summary_ar").notNull().default(""),
  summaryEn: text("summary_en").notNull().default(""),
  imageUrl: varchar("image_url", { length: 1000 }).notNull().default(""),
  ctaLabelAr: varchar("cta_label_ar", { length: 100 }).notNull().default(""),
  ctaLabelEn: varchar("cta_label_en", { length: 100 }).notNull().default(""),
  href: varchar("href", { length: 1000 }).notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ContentItem = typeof contentItems.$inferSelect;
export type NewContentItem = typeof contentItems.$inferInsert;
export type FeaturedSlide = typeof featuredSlides.$inferSelect;
export type NewFeaturedSlide = typeof featuredSlides.$inferInsert;
```

- [ ] **Step 2: Export it.** Append to `packages/db/src/schema/index.ts`:

```ts
export * from "./contentItems.js";
```

- [ ] **Step 3: Start the local DB and push the schema**

Run: `pnpm dev:db && pnpm db:push`
Expected: drizzle-kit lists `CREATE TYPE content_type …`, `CREATE TABLE content_items`, `CREATE TABLE featured_slides` and finishes without a destructive-change prompt.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck:packages`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/contentItems.ts packages/db/src/schema/index.ts
git commit -m "feat(db): content_items and featured_slides tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: CMS validation, slug and sanitising helpers

**Files:**
- Create: `apps/api/src/lib/cms/schemas.ts`, `apps/api/src/lib/cms/slug.ts`, `apps/api/src/lib/cms/sanitize.ts`, `apps/api/src/lib/cms/paths.ts`
- Test: `apps/api/src/lib/cms/schemas.test.ts`, `apps/api/src/lib/cms/slug.test.ts`, `apps/api/src/lib/cms/sanitize.test.ts`
- Modify: `apps/api/package.json` (add `zod`, `sanitize-html`, `@types/sanitize-html`)

**Interfaces:**
- Produces:
  - `CONTENT_TYPES`, `CONTENT_STATUSES`, `CONTENT_AREAS` (readonly tuples); types `ContentType`, `ContentStatus`, `ContentArea`
  - `DETAILS_SCHEMAS: Record<ContentType, ZodType>`; `HTML_DETAIL_KEYS: readonly string[]`
  - `contentItemInput` (zod) and `type ContentItemInput`
  - `parseContentItem(body: unknown): { ok: true; value: ContentItemInput } | { ok: false; issues: z.ZodIssue[] }`
  - `featuredSlideInput` (zod) and `type FeaturedSlideInput`
  - `slugify(input: string): string`, `withSuffix(base: string, n: number): string`
  - `sanitizeRichHtml(html: string): string`, `sanitizeItem(v: ContentItemInput): ContentItemInput`
  - `contentPath(type: ContentType, slug: string): string`

- [ ] **Step 1: Add dependencies**

Run: `pnpm --filter @workspace/api-server add zod@catalog: sanitize-html && pnpm --filter @workspace/api-server add -D @types/sanitize-html`
Expected: `apps/api/package.json` lists all three.

- [ ] **Step 2: Write the failing tests**

```ts
// apps/api/src/lib/cms/slug.test.ts
import { describe, expect, it } from "vitest";
import { slugify, withSuffix } from "./slug";

describe("slugify", () => {
  it("lowercases and dashes English titles", () => {
    expect(slugify("Public Value & Decision Quality")).toBe("public-value-decision-quality");
  });
  it("strips accents", () => {
    expect(slugify("Café Réunion")).toBe("cafe-reunion");
  });
  it("returns empty string for Arabic-only input", () => {
    expect(slugify("القيمة العامة")).toBe("");
  });
  it("caps length at 80 without a trailing dash", () => {
    const s = slugify("a ".repeat(100));
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("withSuffix", () => {
  it("leaves the first slug unchanged and numbers the rest", () => {
    expect(withSuffix("x", 1)).toBe("x");
    expect(withSuffix("x", 3)).toBe("x-3");
  });
});
```

```ts
// apps/api/src/lib/cms/sanitize.test.ts
import { describe, expect, it } from "vitest";
import { sanitizeItem, sanitizeRichHtml } from "./sanitize";
import { parseContentItem } from "./schemas";

describe("sanitizeRichHtml", () => {
  it("removes scripts, event handlers and javascript: links", () => {
    const out = sanitizeRichHtml(
      '<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="/a.png" onerror="y()">',
    );
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(out).toContain("<p>Hi</p>");
    expect(out).toContain('<img src="/a.png" />');
  });
  it("keeps headings, lists, quotes and safe links with rel", () => {
    const out = sanitizeRichHtml('<h2>T</h2><ul><li>a</li></ul><blockquote>q</blockquote><a href="https://x.org">x</a>');
    expect(out).toContain("<h2>T</h2>");
    expect(out).toContain("<ul><li>a</li></ul>");
    expect(out).toContain('<a href="https://x.org" rel="noopener noreferrer">x</a>');
  });
});

describe("sanitizeItem", () => {
  it("cleans body and HTML detail fields", () => {
    const parsed = parseContentItem({
      type: "observatory",
      titleAr: "ع",
      bodyAr: "<p>ok</p><script>bad()</script>",
      details: { kind: "daily_brief", ourReadingAr: '<p onmouseover="z()">r</p>' },
    });
    if (!parsed.ok) throw new Error("expected valid");
    const clean = sanitizeItem(parsed.value);
    expect(clean.bodyAr).toBe("<p>ok</p>");
    expect(clean.details.ourReadingAr).toBe("<p>r</p>");
  });
});
```

```ts
// apps/api/src/lib/cms/schemas.test.ts
import { describe, expect, it } from "vitest";
import { featuredSlideInput, parseContentItem } from "./schemas";

describe("parseContentItem", () => {
  it("accepts a minimal article and fills defaults", () => {
    const r = parseContentItem({ type: "article", titleAr: "مقال" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe("draft");
      expect(r.value.slug).toBe("");
      expect(r.value.details).toEqual({ relatedLinks: [] });
    }
  });
  it("rejects a missing Arabic title", () => {
    const r = parseContentItem({ type: "article", titleAr: "  " });
    expect(r.ok).toBe(false);
  });
  it("rejects an unknown observatory kind with a details path", () => {
    const r = parseContentItem({ type: "observatory", titleAr: "x", details: { kind: "monthly" } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].path).toEqual(["details", "kind"]);
  });
  it("requires publication kind", () => {
    expect(parseContentItem({ type: "publication", titleAr: "x", details: {} }).ok).toBe(false);
    expect(parseContentItem({ type: "publication", titleAr: "x", details: { kind: "report" } }).ok).toBe(true);
  });
  it("accepts an event without startsAt and rejects endsAt before startsAt", () => {
    expect(parseContentItem({ type: "event", titleAr: "x", details: { kind: "seminar" } }).ok).toBe(true);
    const bad = parseContentItem({
      type: "event",
      titleAr: "x",
      details: { kind: "seminar", startsAt: "2026-11-02T10:00:00+02:00", endsAt: "2026-11-01T10:00:00+02:00" },
    });
    expect(bad.ok).toBe(false);
  });
  it("rejects slugs with spaces or uppercase after trimming", () => {
    expect(parseContentItem({ type: "news", titleAr: "x", slug: "bad slug" }).ok).toBe(false);
    const ok = parseContentItem({ type: "news", titleAr: "x", slug: "Good-Slug" });
    expect(ok.ok && ok.value.slug).toBe("good-slug");
  });
  it("rejects non-http, non-path image URLs", () => {
    expect(parseContentItem({ type: "news", titleAr: "x", coverImageUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(parseContentItem({ type: "news", titleAr: "x", coverImageUrl: "/seed/news.webp" }).ok).toBe(true);
  });
});

describe("featuredSlideInput", () => {
  it("requires title, href and image for custom cards", () => {
    expect(featuredSlideInput.safeParse({ sourceKind: "custom", titleAr: "t" }).success).toBe(false);
    expect(
      featuredSlideInput.safeParse({ sourceKind: "custom", titleAr: "t", href: "/academy", imageUrl: "/seed/hero.webp" })
        .success,
    ).toBe(true);
  });
  it("requires a linked id for content and book slides", () => {
    expect(featuredSlideInput.safeParse({ sourceKind: "content" }).success).toBe(false);
    expect(featuredSlideInput.safeParse({ sourceKind: "book", medusaProductId: "prod_1" }).success).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/cms`
Expected: FAIL — `Cannot find module './slug'` (and the same for schemas/sanitize).

- [ ] **Step 4: Implement the helpers**

```ts
// apps/api/src/lib/cms/slug.ts
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function withSuffix(base: string, n: number): string {
  return n <= 1 ? base : `${base}-${n}`;
}
```

```ts
// apps/api/src/lib/cms/schemas.ts
import { z } from "zod";

export const CONTENT_TYPES = ["observatory", "article", "study", "publication", "news", "event"] as const;
export const CONTENT_STATUSES = ["draft", "review", "published", "archived"] as const;
export const CONTENT_AREAS = ["sharia_policy", "public_policy_admin", "leadership_governance"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type ContentArea = (typeof CONTENT_AREAS)[number];

const optText = (max: number) => z.string().trim().max(max).optional().default("");
const html = z.string().max(200_000).optional().default("");
const urlOrPath = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), "Must be an http(s) URL or a site path")
  .optional()
  .default("");
const link = z.object({ title: z.string().trim().min(1).max(300), url: z.string().trim().url().max(1000) });
const links = z.array(link).max(50).optional().default([]);
const isoDate = z.string().datetime({ offset: true });

export const DETAILS_SCHEMAS = {
  observatory: z.object({
    kind: z.enum(["daily_brief", "weekly_review", "research_output", "follow_up_file"]),
    region: z.enum(["egypt", "middle_east", "islamic_world", "rest_of_world"]).optional(),
    whatHappenedAr: html,
    whatHappenedEn: html,
    ourReadingAr: html,
    ourReadingEn: html,
    researchQuestionsAr: html,
    researchQuestionsEn: html,
    sources: links,
  }),
  article: z.object({ relatedLinks: links }),
  study: z.object({
    questionAr: html,
    questionEn: html,
    methodAr: html,
    methodEn: html,
    findingsAr: html,
    findingsEn: html,
    recommendationsAr: html,
    recommendationsEn: html,
    keywords: z.array(z.string().trim().min(1).max(80)).max(30).optional().default([]),
    pdfUrl: urlOrPath,
  }),
  publication: z.object({
    kind: z.enum(["report", "periodical", "research"]),
    issueNumber: optText(50),
    pdfUrl: urlOrPath,
  }),
  news: z.object({ relatedLinks: links }),
  event: z
    .object({
      kind: z.enum(["training", "workshop", "seminar", "conference", "exhibition"]),
      startsAt: isoDate.optional(),
      endsAt: isoDate.optional(),
      timezone: z.string().trim().max(64).optional().default("Africa/Cairo"),
      mode: z.enum(["in_person", "online", "hybrid"]).optional().default("in_person"),
      venueAr: optText(500),
      venueEn: optText(500),
      registration: z.enum(["open", "closed", "interest"]).optional().default("interest"),
      registrationUrl: urlOrPath,
      isExternalEvent: z.boolean().optional().default(false),
      organizerName: optText(300),
      organizerUrl: urlOrPath,
      legacyEventId: z.number().int().optional(),
      legacyDateText: optText(400),
    })
    .refine((d) => !d.startsAt || !d.endsAt || Date.parse(d.endsAt) >= Date.parse(d.startsAt), {
      message: "endsAt must be after startsAt",
      path: ["endsAt"],
    }),
} as const;

export const HTML_DETAIL_KEYS = [
  "whatHappenedAr",
  "whatHappenedEn",
  "ourReadingAr",
  "ourReadingEn",
  "researchQuestionsAr",
  "researchQuestionsEn",
  "questionAr",
  "questionEn",
  "methodAr",
  "methodEn",
  "findingsAr",
  "findingsEn",
  "recommendationsAr",
  "recommendationsEn",
] as const;

export const contentItemInput = z.object({
  type: z.enum(CONTENT_TYPES),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Slug may contain only a-z, 0-9 and single dashes")
    .optional()
    .default(""),
  status: z.enum(CONTENT_STATUSES).optional().default("draft"),
  titleAr: z.string().trim().min(1, "Arabic title is required").max(500),
  titleEn: optText(500),
  summaryAr: optText(2000),
  summaryEn: optText(2000),
  bodyAr: html,
  bodyEn: html,
  coverImageUrl: urlOrPath,
  area: z.enum(CONTENT_AREAS).nullable().optional().default(null),
  authorAr: optText(300),
  authorEn: optText(300),
  isExternal: z.boolean().optional().default(false),
  externalUrl: urlOrPath,
  publishedAt: z.coerce.date().nullable().optional().default(null),
  details: z.record(z.unknown()).optional().default({}),
});
export type ContentItemInput = z.infer<typeof contentItemInput>;

export type ParseResult = { ok: true; value: ContentItemInput } | { ok: false; issues: z.ZodIssue[] };

export function parseContentItem(body: unknown): ParseResult {
  const base = contentItemInput.safeParse(body);
  if (!base.success) return { ok: false, issues: base.error.issues };
  const details = DETAILS_SCHEMAS[base.data.type].safeParse(base.data.details);
  if (!details.success) {
    return {
      ok: false,
      issues: details.error.issues.map((i) => ({ ...i, path: ["details", ...i.path] })),
    };
  }
  return { ok: true, value: { ...base.data, details: details.data as Record<string, unknown> } };
}

export const featuredSlideInput = z
  .object({
    sourceKind: z.enum(["content", "book", "custom"]),
    contentItemId: z.number().int().positive().nullable().optional().default(null),
    medusaProductId: z.string().trim().max(100).nullable().optional().default(null),
    isActive: z.boolean().optional().default(true),
    badgeAr: optText(100),
    badgeEn: optText(100),
    titleAr: optText(500),
    titleEn: optText(500),
    summaryAr: optText(1000),
    summaryEn: optText(1000),
    imageUrl: urlOrPath,
    ctaLabelAr: optText(100),
    ctaLabelEn: optText(100),
    href: urlOrPath,
  })
  .superRefine((v, ctx) => {
    if (v.sourceKind === "content" && !v.contentItemId) {
      ctx.addIssue({ code: "custom", path: ["contentItemId"], message: "Pick a content item" });
    }
    if (v.sourceKind === "book" && !v.medusaProductId) {
      ctx.addIssue({ code: "custom", path: ["medusaProductId"], message: "Pick a book" });
    }
    if (v.sourceKind === "custom") {
      for (const k of ["titleAr", "href", "imageUrl"] as const) {
        if (!v[k]) ctx.addIssue({ code: "custom", path: [k], message: `${k} is required for a custom card` });
      }
    }
  });
export type FeaturedSlideInput = z.infer<typeof featuredSlideInput>;
```

```ts
// apps/api/src/lib/cms/sanitize.ts
import sanitizeHtml from "sanitize-html";
import { HTML_DETAIL_KEYS, type ContentItemInput } from "./schemas";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4", "ul", "ol", "li",
    "blockquote", "a", "img", "hr", "table", "thead", "tbody", "tr", "th", "td",
    "figure", "figcaption", "code", "pre",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

export function sanitizeRichHtml(html: string): string {
  return html ? sanitizeHtml(html, OPTIONS).trim() : "";
}

export function sanitizeItem(v: ContentItemInput): ContentItemInput {
  const details: Record<string, unknown> = { ...v.details };
  for (const key of HTML_DETAIL_KEYS) {
    if (typeof details[key] === "string") details[key] = sanitizeRichHtml(details[key] as string);
  }
  return { ...v, bodyAr: sanitizeRichHtml(v.bodyAr), bodyEn: sanitizeRichHtml(v.bodyEn), details };
}
```

```ts
// apps/api/src/lib/cms/paths.ts
import type { ContentType } from "./schemas";

const BASE: Record<ContentType, string> = {
  observatory: "/observatory",
  article: "/articles",
  study: "/studies",
  publication: "/publications",
  news: "/news-events",
  event: "/news-events",
};

export function contentPath(type: ContentType, slug: string): string {
  return `${BASE[type]}/${slug}`;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/cms`
Expected: PASS, all 3 files. If the `<img … />` assertion fails only because of self-closing formatting, change the assertion to `toMatch(/<img src="\/a.png" ?\/?>/)`. Don't loosen the "no script/onerror" assertion.

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/src/lib/cms
git commit -m "feat(api): CMS zod schemas, slug and HTML sanitising helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Content repository + admin CRUD API

**Files:**
- Create: `apps/api/src/lib/cms/repo.ts`, `apps/api/src/routes/cms/admin.ts`
- Modify: `apps/api/src/routes/index.ts` (mount before `router.use(requireAuth)`)
- Test: `apps/api/src/routes/cms/admin.test.ts` (real DB; rows prefixed `test-cms-`)

**Interfaces:**
- Consumes: Task 1 tables; Task 2 `parseContentItem`, `sanitizeItem`, `slugify`, `withSuffix`, `contentPath`.
- Produces (in `repo.ts`):
  - `class SlugConflictError extends Error`, `class TypeChangeError extends Error`
  - `createItem(input: ContentItemInput): Promise<ContentItem>`
  - `updateItem(id: number, input: ContentItemInput): Promise<ContentItem | null>`
  - `deleteItem(id: number): Promise<boolean>`
  - `getItemById(id: number): Promise<ContentItem | null>`
  - `getItemBySlug(slug: string): Promise<ContentItem | null>` (any status)
  - `adminList(p: { type: ContentType; status?: ContentStatus; q?: string; page?: number; pageSize?: number }): Promise<{ items: ContentItem[]; total: number; page: number; pageSize: number }>`
  - (Task 4 adds `listPublished`, `getPublishedBySlug`, `getRelated`, `getHome`; Task 5 adds the featured functions)

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/routes/cms/admin.test.ts
import { afterAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, contentItems } from "@workspace/db";
import { like } from "drizzle-orm";

vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) =>
    req.header("x-test-admin") === "1" ? next() : res.status(403).end(),
}));

const { default: router } = await import("./admin");
const app = express();
app.use(express.json());
app.use(router);
const admin = (r: request.Test) => r.set("x-test-admin", "1");

afterAll(async () => {
  await db.delete(contentItems).where(like(contentItems.slug, "test-cms-%"));
});

describe("admin CMS items", () => {
  it("requires admin", async () => {
    expect((await request(app).get("/admin/cms/items?type=article")).status).toBe(403);
  });

  it("creates, reads, updates and deletes an article", async () => {
    const created = await admin(request(app).post("/admin/cms/items")).send({
      type: "article",
      slug: "test-cms-crud",
      titleAr: "مقال تجريبي",
      bodyAr: "<p>نص</p><script>x()</script>",
      status: "draft",
    });
    expect(created.status).toBe(201);
    expect(created.body.bodyAr).toBe("<p>نص</p>");
    expect(created.body.publishedAt).toBeNull();

    const id = created.body.id;
    const got = await admin(request(app).get(`/admin/cms/items/${id}`));
    expect(got.body.titleAr).toBe("مقال تجريبي");

    const updated = await admin(request(app).put(`/admin/cms/items/${id}`)).send({
      ...got.body,
      status: "published",
      publishedAt: null,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("published");
    expect(updated.body.publishedAt).not.toBeNull();

    expect((await admin(request(app).delete(`/admin/cms/items/${id}`))).status).toBe(204);
    expect((await admin(request(app).get(`/admin/cms/items/${id}`))).status).toBe(404);
  });

  it("creates with an Arabic-only title and generates a slug", async () => {
    const r = await admin(request(app).post("/admin/cms/items")).send({ type: "news", titleAr: "خبر فقط بالعربية" });
    expect(r.status).toBe(201);
    expect(r.body.slug).toMatch(/^news-[a-f0-9]{8}$/);
    await db.delete(contentItems).where(like(contentItems.slug, r.body.slug));
  });

  it("de-duplicates generated slugs and rejects an explicit duplicate with 409", async () => {
    const a = await admin(request(app).post("/admin/cms/items")).send({ type: "study", titleAr: "د", titleEn: "Test CMS Dup" });
    const b = await admin(request(app).post("/admin/cms/items")).send({ type: "news", titleAr: "د", titleEn: "Test CMS Dup" });
    expect(a.body.slug).toBe("test-cms-dup");
    expect(b.body.slug).toBe("test-cms-dup-2");
    const c = await admin(request(app).post("/admin/cms/items")).send({ type: "article", titleAr: "د", slug: "test-cms-dup" });
    expect(c.status).toBe(409);
  });

  it("returns 400 with issues for invalid details", async () => {
    const r = await admin(request(app).post("/admin/cms/items")).send({
      type: "publication",
      titleAr: "x",
      slug: "test-cms-bad",
      details: { kind: "magazine" },
    });
    expect(r.status).toBe(400);
    expect(r.body.issues[0].path).toEqual(["details", "kind"]);
  });

  it("refuses to change an item's type", async () => {
    const r = await admin(request(app).post("/admin/cms/items")).send({ type: "news", titleAr: "x", slug: "test-cms-type" });
    const u = await admin(request(app).put(`/admin/cms/items/${r.body.id}`)).send({ ...r.body, type: "article" });
    expect(u.status).toBe(400);
  });

  it("lists by type with status filter and search", async () => {
    await admin(request(app).post("/admin/cms/items")).send({ type: "observatory", titleAr: "رصد", titleEn: "Test CMS Needle", slug: "test-cms-list", details: { kind: "daily_brief" } });
    const r = await admin(request(app).get("/admin/cms/items?type=observatory&status=draft&q=Needle"));
    expect(r.status).toBe(200);
    expect(r.body.items.map((i: any) => i.slug)).toContain("test-cms-list");
    expect(r.body.total).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @workspace/api-server test -- src/routes/cms/admin.test.ts`
Expected: FAIL — `Cannot find module './admin'`.

- [ ] **Step 3: Implement the repository (write part)**

```ts
// apps/api/src/lib/cms/repo.ts
import { randomUUID } from "crypto";
import { and, count, desc, eq, ilike, like, ne, or, type SQL } from "drizzle-orm";
import { db, contentItems, type ContentItem } from "@workspace/db";
import { sanitizeItem } from "./sanitize";
import { slugify, withSuffix } from "./slug";
import type { ContentItemInput, ContentStatus, ContentType } from "./schemas";

export class SlugConflictError extends Error {
  constructor(slug: string) {
    super(`Slug "${slug}" is already used`);
  }
}
export class TypeChangeError extends Error {
  constructor() {
    super("An item's type cannot be changed");
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

async function slugTaken(slug: string, excludeId?: number): Promise<boolean> {
  const where = excludeId
    ? and(eq(contentItems.slug, slug), ne(contentItems.id, excludeId))
    : eq(contentItems.slug, slug);
  const [row] = await db.select({ id: contentItems.id }).from(contentItems).where(where).limit(1);
  return !!row;
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  const rows = await db
    .select({ slug: contentItems.slug, id: contentItems.id })
    .from(contentItems)
    .where(like(contentItems.slug, `${base}%`));
  const taken = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.slug));
  for (let n = 1; ; n++) {
    const candidate = withSuffix(base, n);
    if (!taken.has(candidate)) return candidate;
  }
}

async function resolveSlug(input: ContentItemInput, excludeId?: number): Promise<string> {
  if (input.slug) {
    if (await slugTaken(input.slug, excludeId)) throw new SlugConflictError(input.slug);
    return input.slug;
  }
  const base = slugify(input.titleEn) || `${input.type}-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
  return uniqueSlug(base, excludeId);
}

export async function getItemById(id: number): Promise<ContentItem | null> {
  const [row] = await db.select().from(contentItems).where(eq(contentItems.id, id));
  return row ?? null;
}

export async function getItemBySlug(slug: string): Promise<ContentItem | null> {
  const [row] = await db.select().from(contentItems).where(eq(contentItems.slug, slug));
  return row ?? null;
}

export async function createItem(input: ContentItemInput): Promise<ContentItem> {
  const clean = sanitizeItem(input);
  const slug = await resolveSlug(clean);
  const publishedAt = clean.publishedAt ?? (clean.status === "published" ? new Date() : null);
  try {
    const [row] = await db.insert(contentItems).values({ ...clean, slug, publishedAt }).returning();
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugConflictError(slug);
    throw err;
  }
}

export async function updateItem(id: number, input: ContentItemInput): Promise<ContentItem | null> {
  const existing = await getItemById(id);
  if (!existing) return null;
  if (existing.type !== input.type) throw new TypeChangeError();
  const clean = sanitizeItem(input);
  const slug = !clean.slug || clean.slug === existing.slug ? existing.slug : await resolveSlug(clean, id);
  const publishedAt =
    clean.publishedAt ?? existing.publishedAt ?? (clean.status === "published" ? new Date() : null);
  try {
    const [row] = await db
      .update(contentItems)
      .set({ ...clean, slug, publishedAt, updatedAt: new Date() })
      .where(eq(contentItems.id, id))
      .returning();
    return row ?? null;
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugConflictError(slug);
    throw err;
  }
}

export async function deleteItem(id: number): Promise<boolean> {
  const rows = await db.delete(contentItems).where(eq(contentItems.id, id)).returning({ id: contentItems.id });
  return rows.length > 0;
}

export function searchCondition(q: string): SQL {
  const pattern = `%${q}%`;
  return or(
    ilike(contentItems.titleAr, pattern),
    ilike(contentItems.titleEn, pattern),
    ilike(contentItems.summaryAr, pattern),
    ilike(contentItems.summaryEn, pattern),
  )!;
}

export async function adminList(p: {
  type: ContentType;
  status?: ContentStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const pageSize = Math.min(Math.max(p.pageSize ?? 25, 1), 100);
  const page = Math.max(p.page ?? 1, 1);
  const conds: SQL[] = [eq(contentItems.type, p.type)];
  if (p.status) conds.push(eq(contentItems.status, p.status));
  if (p.q) conds.push(searchCondition(p.q));
  const where = and(...conds);
  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(contentItems)
      .where(where)
      .orderBy(desc(contentItems.updatedAt), desc(contentItems.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(contentItems).where(where),
  ]);
  return { items, total, page, pageSize };
}
```

- [ ] **Step 4: Implement the admin router**

```ts
// apps/api/src/routes/cms/admin.ts
import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/adminAuth";
import { CONTENT_STATUSES, CONTENT_TYPES, parseContentItem } from "../../lib/cms/schemas";
import {
  adminList,
  createItem,
  deleteItem,
  getItemById,
  SlugConflictError,
  TypeChangeError,
  updateItem,
} from "../../lib/cms/repo";

const router = Router();

const listQuery = z.object({
  type: z.enum(CONTENT_TYPES),
  status: z.enum(CONTENT_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

function parseId(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/admin/cms/items", requireAdmin, async (req, res) => {
  const q = listQuery.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: "Invalid query", issues: q.error.issues });
  try {
    return res.json(await adminList(q.data));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list content" });
  }
});

router.get("/admin/cms/items/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const item = await getItemById(id);
  return item ? res.json(item) : res.status(404).json({ error: "Not found" });
});

router.post("/admin/cms/items", requireAdmin, async (req, res) => {
  const parsed = parseContentItem(req.body);
  if (!parsed.ok) return res.status(400).json({ error: "Invalid content", issues: parsed.issues });
  try {
    return res.status(201).json(await createItem(parsed.value));
  } catch (err) {
    if (err instanceof SlugConflictError) return res.status(409).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: "Failed to create content" });
  }
});

router.put("/admin/cms/items/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const parsed = parseContentItem(req.body);
  if (!parsed.ok) return res.status(400).json({ error: "Invalid content", issues: parsed.issues });
  try {
    const item = await updateItem(id, parsed.value);
    return item ? res.json(item) : res.status(404).json({ error: "Not found" });
  } catch (err) {
    if (err instanceof SlugConflictError) return res.status(409).json({ error: err.message });
    if (err instanceof TypeChangeError) return res.status(400).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: "Failed to update content" });
  }
});

router.delete("/admin/cms/items/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  return (await deleteItem(id)) ? res.status(204).end() : res.status(404).json({ error: "Not found" });
});

export default router;
```

Note: the PUT test sends back the whole GET body, which includes `id`, `createdAt` and `updatedAt`. zod `z.object` strips unknown keys, so those are dropped safely. `publishedAt: null` is valid.

- [ ] **Step 5: Mount the router.** In `apps/api/src/routes/index.ts`, add `import cmsAdminRouter from "./cms/admin";` next to the other imports, and `router.use(cmsAdminRouter);` directly after `router.use(adminRouter);`. It must stay above `router.use(requireAuth);`, because `requireAdmin` does its own session check.

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @workspace/api-server test -- src/routes/cms/admin.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/cms/repo.ts apps/api/src/routes/cms apps/api/src/routes/index.ts
git commit -m "feat(api): admin CRUD endpoints for CMS content items

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Public content API (list, detail, related, home, preview)

**Files:**
- Modify: `apps/api/src/lib/cms/repo.ts` (add read functions)
- Create: `apps/api/src/routes/cms/public.ts`
- Modify: `apps/api/src/routes/cms/admin.ts` (add the preview route)
- Modify: `apps/api/src/routes/index.ts` (mount public router)
- Test: `apps/api/src/routes/cms/public.test.ts`

**Interfaces:**
- Consumes: Task 3 repo (`searchCondition`, `getItemBySlug`).
- Produces:
  - `type ListParams = { types: ContentType[]; area?: ContentArea; kind?: string; region?: string; when?: "upcoming" | "past"; q?: string; page?: number; pageSize?: number }`
  - `listPublished(p: ListParams): Promise<{ items: ContentItem[]; total: number; page: number; pageSize: number }>`
  - `getPublishedBySlug(slug: string): Promise<ContentItem | null>`
  - `getRelated(item: ContentItem, limit?: number): Promise<ContentItem[]>`
  - `getHome(): Promise<HomePayload>` where `HomePayload = { featured: FeaturedCard[]; observatory: { lead: ContentItem | null; others: ContentItem[] }; articles: ContentItem[]; studies: ContentItem[]; publications: ContentItem[]; newsEvents: ContentItem[] }`. Until Task 5, `featured` is `[]` through a temporary `resolveFeatured` stub defined in Task 5. To keep this task self-contained, define `getHome` here **without** the `featured` key, and Task 5 adds it.
  - HTTP: `GET /api/cms/items`, `GET /api/cms/items/by-slug/:slug` → `{ item, related }`, `GET /api/cms/home`, `GET /api/admin/cms/preview/:slug` → `{ item, related }`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/routes/cms/public.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { db, contentItems } from "@workspace/db";
import { like } from "drizzle-orm";
import { createItem } from "../../lib/cms/repo";
import { parseContentItem } from "../../lib/cms/schemas";

const { default: router } = await import("./public");
const app = express();
app.use(router);

async function seed(body: Record<string, unknown>) {
  const p = parseContentItem(body);
  if (!p.ok) throw new Error(JSON.stringify(p.issues));
  return createItem(p.value);
}

beforeAll(async () => {
  await db.delete(contentItems).where(like(contentItems.slug, "test-cms-pub-%"));
  await seed({ type: "article", slug: "test-cms-pub-a1", titleAr: "أ", status: "published", area: "sharia_policy", publishedAt: "2026-01-02T00:00:00Z" });
  await seed({ type: "article", slug: "test-cms-pub-a2", titleAr: "ب", status: "published", area: "sharia_policy", publishedAt: "2026-01-03T00:00:00Z" });
  await seed({ type: "article", slug: "test-cms-pub-draft", titleAr: "مسودة", status: "draft" });
  await seed({ type: "event", slug: "test-cms-pub-future", titleAr: "قادمة", status: "published", details: { kind: "seminar", startsAt: "2099-01-01T10:00:00+02:00" } });
  await seed({ type: "event", slug: "test-cms-pub-past", titleAr: "سابقة", status: "published", details: { kind: "workshop", startsAt: "2001-01-01T10:00:00+02:00" } });
  await seed({ type: "event", slug: "test-cms-pub-tba", titleAr: "بلا موعد", status: "published", details: { kind: "workshop" } });
});

afterAll(async () => {
  await db.delete(contentItems).where(like(contentItems.slug, "test-cms-pub-%"));
});

const slugs = (body: any) => body.items.map((i: any) => i.slug);

describe("public CMS API", () => {
  it("lists only published items, newest first", async () => {
    const r = await request(app).get("/cms/items?type=article&area=sharia_policy&pageSize=48");
    expect(r.status).toBe(200);
    const s = slugs(r.body);
    expect(s).not.toContain("test-cms-pub-draft");
    expect(s.indexOf("test-cms-pub-a2")).toBeLessThan(s.indexOf("test-cms-pub-a1"));
  });

  it("filters events by upcoming (incl. no date) and past", async () => {
    const up = slugs((await request(app).get("/cms/items?type=event&when=upcoming&pageSize=48")).body);
    expect(up).toContain("test-cms-pub-future");
    expect(up).toContain("test-cms-pub-tba");
    expect(up).not.toContain("test-cms-pub-past");
    const past = slugs((await request(app).get("/cms/items?type=event&when=past&pageSize=48")).body);
    expect(past).toContain("test-cms-pub-past");
  });

  it("filters by kind", async () => {
    const r = slugs((await request(app).get("/cms/items?type=event&kind=seminar&pageSize=48")).body);
    expect(r).toContain("test-cms-pub-future");
    expect(r).not.toContain("test-cms-pub-past");
  });

  it("rejects an unknown type with 400", async () => {
    expect((await request(app).get("/cms/items?type=book")).status).toBe(400);
  });

  it("returns a published item with related items, and 404 for drafts", async () => {
    const r = await request(app).get("/cms/items/by-slug/test-cms-pub-a1");
    expect(r.status).toBe(200);
    expect(r.body.item.slug).toBe("test-cms-pub-a1");
    expect(r.body.related.map((i: any) => i.slug)).toContain("test-cms-pub-a2");
    expect((await request(app).get("/cms/items/by-slug/test-cms-pub-draft")).status).toBe(404);
  });

  it("serves the home payload without drafts", async () => {
    const r = await request(app).get("/cms/home");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.articles)).toBe(true);
    expect(r.body.articles.length).toBeLessThanOrEqual(3);
    expect(JSON.stringify(r.body)).not.toContain("test-cms-pub-draft");
    expect(r.body.observatory).toHaveProperty("lead");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @workspace/api-server test -- src/routes/cms/public.test.ts`
Expected: FAIL — `Cannot find module './public'`.

- [ ] **Step 3: Add the read functions to `repo.ts`**

Change the drizzle import line to `import { and, count, desc, eq, ilike, inArray, like, ne, or, sql, type SQL } from "drizzle-orm";`, extend the schemas import to also import `type ContentArea`, then append:

```ts
export type ListParams = {
  types: ContentType[];
  area?: ContentArea;
  kind?: string;
  region?: string;
  when?: "upcoming" | "past";
  q?: string;
  page?: number;
  pageSize?: number;
};

const startsAt = sql`(${contentItems.details}->>'startsAt')::timestamptz`;

export async function listPublished(p: ListParams) {
  const pageSize = Math.min(Math.max(p.pageSize ?? 12, 1), 48);
  const page = Math.max(p.page ?? 1, 1);
  const conds: SQL[] = [eq(contentItems.status, "published"), inArray(contentItems.type, p.types)];
  if (p.area) conds.push(eq(contentItems.area, p.area));
  if (p.kind) conds.push(sql`${contentItems.details}->>'kind' = ${p.kind}`);
  if (p.region) conds.push(sql`${contentItems.details}->>'region' = ${p.region}`);
  if (p.when === "upcoming") conds.push(sql`(${startsAt} is null or ${startsAt} >= now())`);
  if (p.when === "past") conds.push(sql`${startsAt} < now()`);
  if (p.q) conds.push(searchCondition(p.q));
  const where = and(...conds);
  const order =
    p.when === "upcoming"
      ? [sql`${startsAt} asc nulls last`, desc(contentItems.id)]
      : p.when === "past"
        ? [sql`${startsAt} desc`, desc(contentItems.id)]
        : [sql`${contentItems.publishedAt} desc nulls last`, desc(contentItems.id)];
  const [items, [{ total }]] = await Promise.all([
    db.select().from(contentItems).where(where).orderBy(...order).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count() }).from(contentItems).where(where),
  ]);
  return { items, total, page, pageSize };
}

export async function getPublishedBySlug(slug: string): Promise<ContentItem | null> {
  const [row] = await db
    .select()
    .from(contentItems)
    .where(and(eq(contentItems.slug, slug), eq(contentItems.status, "published")));
  return row ?? null;
}

export async function getRelated(item: ContentItem, limit = 3): Promise<ContentItem[]> {
  const conds: SQL[] = [
    eq(contentItems.status, "published"),
    eq(contentItems.type, item.type),
    ne(contentItems.id, item.id),
  ];
  if (item.area) conds.push(eq(contentItems.area, item.area));
  return db
    .select()
    .from(contentItems)
    .where(and(...conds))
    .orderBy(sql`${contentItems.publishedAt} desc nulls last`)
    .limit(limit);
}

export async function getHome() {
  const take = (types: ContentType[], n: number) => listPublished({ types, pageSize: n }).then((r) => r.items);
  const [observatory, articles, studies, publications, newsEvents] = await Promise.all([
    take(["observatory"], 4),
    take(["article"], 3),
    take(["study"], 2),
    take(["publication"], 4),
    take(["news", "event"], 3),
  ]);
  return {
    observatory: { lead: observatory[0] ?? null, others: observatory.slice(1) },
    articles,
    studies,
    publications,
    newsEvents,
  };
}
```

- [ ] **Step 4: Write the public router**

```ts
// apps/api/src/routes/cms/public.ts
import { Router } from "express";
import { z } from "zod";
import { CONTENT_AREAS, CONTENT_TYPES } from "../../lib/cms/schemas";
import { getHome, getPublishedBySlug, getRelated, listPublished } from "../../lib/cms/repo";

const router = Router();

const listQuery = z.object({
  type: z
    .string()
    .transform((s) => s.split(",").filter(Boolean))
    .pipe(z.array(z.enum(CONTENT_TYPES)).min(1)),
  area: z.enum(CONTENT_AREAS).optional(),
  kind: z.string().max(40).optional(),
  region: z.string().max(40).optional(),
  when: z.enum(["upcoming", "past"]).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(48).optional(),
});

router.get("/cms/items", async (req, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query", issues: parsed.error.issues });
  const { type, ...rest } = parsed.data;
  try {
    return res.json(await listPublished({ types: type, ...rest }));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list content" });
  }
});

router.get("/cms/items/by-slug/:slug", async (req, res) => {
  try {
    const item = await getPublishedBySlug(String(req.params.slug));
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json({ item, related: await getRelated(item) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load content" });
  }
});

router.get("/cms/home", async (_req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60");
    return res.json(await getHome());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load home content" });
  }
});

export default router;
```

- [ ] **Step 5: Add the admin preview route.** In `apps/api/src/routes/cms/admin.ts`, extend the repo import with `getItemBySlug, getRelated`, and add this before `export default router;`:

```ts
router.get("/admin/cms/preview/:slug", requireAdmin, async (req, res) => {
  const item = await getItemBySlug(String(req.params.slug));
  if (!item) return res.status(404).json({ error: "Not found" });
  return res.json({ item, related: await getRelated(item) });
});
```

Then add an assertion to `admin.test.ts` inside "creates, reads, updates and deletes" **before** the delete call:

```ts
const preview = await admin(request(app).get(`/admin/cms/preview/test-cms-crud`));
expect(preview.status).toBe(200);
expect(preview.body.item.id).toBe(id);
```

- [ ] **Step 6: Mount the public router.** In `routes/index.ts`, add `import cmsPublicRouter from "./cms/public";` and `router.use(cmsPublicRouter);` right after `router.use(eventsRouter);`.

- [ ] **Step 7: Run the tests**

Run: `pnpm --filter @workspace/api-server test -- src/routes/cms`
Expected: PASS (public 6, admin 7).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/lib/cms/repo.ts apps/api/src/routes/cms apps/api/src/routes/index.ts
git commit -m "feat(api): public CMS list/detail/home endpoints and admin preview

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Featured slides API

**Files:**
- Modify: `apps/api/src/lib/cms/repo.ts` (featured functions; add `featured` to `getHome`)
- Create: `apps/api/src/routes/cms/featured.ts`
- Modify: `apps/api/src/routes/index.ts`
- Test: `apps/api/src/routes/cms/featured.test.ts`

**Interfaces:**
- Consumes: `featuredSlideInput`, `contentPath`, `getHome`.
- Produces:
  - `type FeaturedCard = { id: number; sourceKind: "content" | "book" | "custom"; medusaProductId: string | null; contentType: ContentType | null; contentKind: string | null; badgeAr: string; badgeEn: string; titleAr: string; titleEn: string; summaryAr: string; summaryEn: string; imageUrl: string; ctaLabelAr: string; ctaLabelEn: string; href: string }`
  - `resolveFeatured(limit?: number): Promise<FeaturedCard[]>`
  - `listSlidesAdmin(): Promise<(FeaturedSlide & { linkedTitleAr: string | null; linkedStatus: ContentStatus | null })[]>`
  - `createSlide(v: FeaturedSlideInput): Promise<FeaturedSlide>`, `updateSlide(id, v): Promise<FeaturedSlide | null>`, `deleteSlide(id): Promise<boolean>`, `reorderSlides(ids: number[]): Promise<void>`
  - `getHome()` now also returns `featured: FeaturedCard[]`
  - HTTP: `GET/POST /api/admin/cms/featured`, `PUT /api/admin/cms/featured/order`, `PUT/DELETE /api/admin/cms/featured/:id`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/routes/cms/featured.test.ts
import { afterAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, contentItems, featuredSlides } from "@workspace/db";
import { inArray, like } from "drizzle-orm";
import { createItem, resolveFeatured, updateItem } from "../../lib/cms/repo";
import { parseContentItem } from "../../lib/cms/schemas";

vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) =>
    req.header("x-test-admin") === "1" ? next() : res.status(403).end(),
}));
const { default: router } = await import("./featured");
const app = express();
app.use(express.json());
app.use(router);
const admin = (r: request.Test) => r.set("x-test-admin", "1");
const created: number[] = [];

afterAll(async () => {
  if (created.length) await db.delete(featuredSlides).where(inArray(featuredSlides.id, created));
  await db.delete(contentItems).where(like(contentItems.slug, "test-cms-feat-%"));
});

describe("featured slides", () => {
  it("creates a custom slide and resolves it", async () => {
    const r = await admin(request(app).post("/admin/cms/featured")).send({
      sourceKind: "custom",
      titleAr: "test-cms-feat-custom",
      href: "/academy",
      imageUrl: "/seed/academy.webp",
    });
    expect(r.status).toBe(201);
    created.push(r.body.id);
    const cards = await resolveFeatured(50);
    expect(cards.find((c) => c.id === r.body.id)?.href).toBe("/academy");
  });

  it("fills linked content fields and drops the slide when the item is unpublished", async () => {
    const p = parseContentItem({ type: "study", slug: "test-cms-feat-study", titleAr: "دراسة مرتبطة", status: "published", coverImageUrl: "/seed/studySharia.webp" });
    if (!p.ok) throw new Error("bad seed");
    const item = await createItem(p.value);
    const r = await admin(request(app).post("/admin/cms/featured")).send({ sourceKind: "content", contentItemId: item.id, badgeAr: "دراسة" });
    created.push(r.body.id);

    let card = (await resolveFeatured(50)).find((c) => c.id === r.body.id);
    expect(card?.titleAr).toBe("دراسة مرتبطة");
    expect(card?.href).toBe("/studies/test-cms-feat-study");
    expect(card?.imageUrl).toBe("/seed/studySharia.webp");

    const draft = parseContentItem({ ...p.value, status: "draft" });
    if (!draft.ok) throw new Error("bad");
    await updateItem(item.id, draft.value);
    card = (await resolveFeatured(50)).find((c) => c.id === r.body.id);
    expect(card).toBeUndefined();
  });

  it("rejects invalid slides with 400", async () => {
    const r = await admin(request(app).post("/admin/cms/featured")).send({ sourceKind: "custom", titleAr: "x" });
    expect(r.status).toBe(400);
  });

  it("reorders slides", async () => {
    const [a, b] = created;
    expect((await admin(request(app).put("/admin/cms/featured/order")).send({ ids: [b, a] })).status).toBe(204);
    const list = (await admin(request(app).get("/admin/cms/featured"))).body as any[];
    const posA = list.find((s) => s.id === a).position;
    const posB = list.find((s) => s.id === b).position;
    expect(posB).toBeLessThan(posA);
  });

  it("toggles active and deletes", async () => {
    const id = created[0];
    const current = (await admin(request(app).get("/admin/cms/featured"))).body.find((s: any) => s.id === id);
    const u = await admin(request(app).put(`/admin/cms/featured/${id}`)).send({ ...current, isActive: false });
    expect(u.status).toBe(200);
    expect((await resolveFeatured(50)).some((c) => c.id === id)).toBe(false);
    expect((await admin(request(app).delete(`/admin/cms/featured/${id}`))).status).toBe(204);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @workspace/api-server test -- src/routes/cms/featured.test.ts`
Expected: FAIL — `Cannot find module './featured'` / `resolveFeatured is not exported`.

- [ ] **Step 3: Add the featured functions to `repo.ts`**

Extend the imports: `import { db, contentItems, featuredSlides, type ContentItem, type FeaturedSlide } from "@workspace/db";`, add `asc` to the drizzle import, `import { contentPath } from "./paths";`, and `import type { FeaturedSlideInput } from "./schemas";` (merge into the existing schemas import). Then append:

```ts
export type FeaturedCard = {
  id: number;
  sourceKind: "content" | "book" | "custom";
  medusaProductId: string | null;
  contentType: ContentType | null;
  contentKind: string | null;
  badgeAr: string;
  badgeEn: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  imageUrl: string;
  ctaLabelAr: string;
  ctaLabelEn: string;
  href: string;
};

const pick = (override: string, fallback: string) => (override.trim() ? override : fallback);

export async function resolveFeatured(limit = 6): Promise<FeaturedCard[]> {
  const slides = await db
    .select()
    .from(featuredSlides)
    .where(eq(featuredSlides.isActive, true))
    .orderBy(asc(featuredSlides.position), asc(featuredSlides.id));
  const ids = slides.map((s) => s.contentItemId).filter((x): x is number => x != null);
  const linked = ids.length
    ? await db
        .select()
        .from(contentItems)
        .where(and(inArray(contentItems.id, ids), eq(contentItems.status, "published")))
    : [];
  const byId = new Map(linked.map((i) => [i.id, i]));
  const cards: FeaturedCard[] = [];
  for (const s of slides) {
    if (cards.length >= limit) break;
    const base = {
      id: s.id,
      sourceKind: s.sourceKind,
      medusaProductId: s.medusaProductId,
      contentType: null as ContentType | null,
      contentKind: null as string | null,
      badgeAr: s.badgeAr,
      badgeEn: s.badgeEn,
      titleAr: s.titleAr,
      titleEn: s.titleEn,
      summaryAr: s.summaryAr,
      summaryEn: s.summaryEn,
      imageUrl: s.imageUrl,
      ctaLabelAr: s.ctaLabelAr,
      ctaLabelEn: s.ctaLabelEn,
      href: s.href,
    };
    if (s.sourceKind === "content") {
      const item = s.contentItemId != null ? byId.get(s.contentItemId) : undefined;
      if (!item) continue;
      cards.push({
        ...base,
        contentType: item.type,
        contentKind: typeof item.details.kind === "string" ? item.details.kind : null,
        titleAr: pick(s.titleAr, item.titleAr),
        titleEn: pick(s.titleEn, item.titleEn),
        summaryAr: pick(s.summaryAr, item.summaryAr),
        summaryEn: pick(s.summaryEn, item.summaryEn),
        imageUrl: pick(s.imageUrl, item.coverImageUrl),
        href: pick(s.href, contentPath(item.type, item.slug)),
      });
    } else if (s.sourceKind === "book") {
      if (!s.medusaProductId) continue;
      cards.push({ ...base, href: pick(s.href, `/services/store/books/${s.medusaProductId}`) });
    } else {
      if (!s.titleAr || !s.href) continue;
      cards.push(base);
    }
  }
  return cards;
}

export async function listSlidesAdmin() {
  const slides = await db.select().from(featuredSlides).orderBy(asc(featuredSlides.position), asc(featuredSlides.id));
  const ids = slides.map((s) => s.contentItemId).filter((x): x is number => x != null);
  const linked = ids.length
    ? await db
        .select({ id: contentItems.id, titleAr: contentItems.titleAr, status: contentItems.status })
        .from(contentItems)
        .where(inArray(contentItems.id, ids))
    : [];
  const byId = new Map(linked.map((i) => [i.id, i]));
  return slides.map((s) => ({
    ...s,
    linkedTitleAr: s.contentItemId != null ? (byId.get(s.contentItemId)?.titleAr ?? null) : null,
    linkedStatus: s.contentItemId != null ? (byId.get(s.contentItemId)?.status ?? null) : null,
  }));
}

export async function createSlide(v: FeaturedSlideInput): Promise<FeaturedSlide> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${featuredSlides.position}), -1)` })
    .from(featuredSlides);
  const [row] = await db
    .insert(featuredSlides)
    .values({ ...v, position: Number(max) + 1 })
    .returning();
  return row;
}

export async function updateSlide(id: number, v: FeaturedSlideInput): Promise<FeaturedSlide | null> {
  const [row] = await db
    .update(featuredSlides)
    .set({ ...v, updatedAt: new Date() })
    .where(eq(featuredSlides.id, id))
    .returning();
  return row ?? null;
}

export async function deleteSlide(id: number): Promise<boolean> {
  const rows = await db.delete(featuredSlides).where(eq(featuredSlides.id, id)).returning({ id: featuredSlides.id });
  return rows.length > 0;
}

export async function reorderSlides(ids: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx.update(featuredSlides).set({ position, updatedAt: new Date() }).where(eq(featuredSlides.id, id));
    }
  });
}
```

Then, in `getHome`, add `resolveFeatured()` as the first element of the `Promise.all` and `featured` as the first key of the returned object:

```ts
  const [featured, observatory, articles, studies, publications, newsEvents] = await Promise.all([
    resolveFeatured(),
    take(["observatory"], 4),
    // …unchanged
  ]);
  return { featured, observatory: { lead: observatory[0] ?? null, others: observatory.slice(1) }, articles, studies, publications, newsEvents };
```

- [ ] **Step 4: Write the featured router**

```ts
// apps/api/src/routes/cms/featured.ts
import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/adminAuth";
import { featuredSlideInput } from "../../lib/cms/schemas";
import { createSlide, deleteSlide, listSlidesAdmin, reorderSlides, updateSlide } from "../../lib/cms/repo";

const router = Router();
const orderBody = z.object({ ids: z.array(z.number().int().positive()).max(100) });

function parseId(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/admin/cms/featured", requireAdmin, async (_req, res) => {
  try {
    return res.json(await listSlidesAdmin());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list slides" });
  }
});

router.post("/admin/cms/featured", requireAdmin, async (req, res) => {
  const parsed = featuredSlideInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid slide", issues: parsed.error.issues });
  try {
    return res.status(201).json(await createSlide(parsed.data));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create slide" });
  }
});

// Must be registered before "/:id" so "order" is not parsed as an id.
router.put("/admin/cms/featured/order", requireAdmin, async (req, res) => {
  const parsed = orderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid order", issues: parsed.error.issues });
  try {
    await reorderSlides(parsed.data.ids);
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to reorder slides" });
  }
});

router.put("/admin/cms/featured/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const parsed = featuredSlideInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid slide", issues: parsed.error.issues });
  const row = await updateSlide(id, parsed.data);
  return row ? res.json(row) : res.status(404).json({ error: "Not found" });
});

router.delete("/admin/cms/featured/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  return (await deleteSlide(id)) ? res.status(204).end() : res.status(404).json({ error: "Not found" });
});

export default router;
```

- [ ] **Step 5: Mount it.** In `routes/index.ts`, add `import cmsFeaturedRouter from "./cms/featured";` and `router.use(cmsFeaturedRouter);` after `router.use(cmsAdminRouter);`.

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter @workspace/api-server test -- src/routes/cms`
Expected: PASS (featured 5, public 6, admin 7).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/cms/repo.ts apps/api/src/routes/cms apps/api/src/routes/index.ts
git commit -m "feat(api): featured slides admin API and home resolution

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: PDF upload endpoint and admin stats on the new events

**Files:**
- Modify: `apps/api/src/routes/admin/index.ts`
- Test: `apps/api/src/routes/admin/upload-file.test.ts`

**Interfaces:**
- Produces: `POST /api/admin/upload-file?folder=<name>`, multipart field `file`, PDF only, ≤ 25 MB → `{ url: "/api/storage/objects/<folder>/<uuid>" }`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/routes/admin/upload-file.test.ts
import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn(async () => undefined) }));
vi.mock("@workspace/object-store", () => ({ savePrivateObject: saveMock }));
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) => (req.header("x-test-admin") === "1" ? next() : res.status(403).end()),
  checkAdminStatus: vi.fn(),
  getBootstrapAdminEmails: () => [],
}));

const { default: router } = await import("./index");
const app = express();
app.use(router);

describe("POST /admin/upload-file", () => {
  it("requires admin", async () => {
    expect((await request(app).post("/admin/upload-file")).status).toBe(403);
  });

  it("stores a PDF and returns its URL", async () => {
    const r = await request(app)
      .post("/admin/upload-file?folder=cms")
      .set("x-test-admin", "1")
      .attach("file", Buffer.from("%PDF-1.7 test"), { filename: "s.pdf", contentType: "application/pdf" });
    expect(r.status).toBe(200);
    expect(r.body.url).toMatch(/^\/api\/storage\/objects\/cms\/[0-9a-f-]{36}$/);
    expect(saveMock).toHaveBeenCalledWith(expect.stringMatching(/^cms\//), expect.any(Buffer), "application/pdf", expect.any(Object));
  });

  it("rejects non-PDF files", async () => {
    const r = await request(app)
      .post("/admin/upload-file")
      .set("x-test-admin", "1")
      .attach("file", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @workspace/api-server test -- src/routes/admin/upload-file.test.ts`
Expected: FAIL — the 2nd test gets 404.

- [ ] **Step 3: Implement.** In `routes/admin/index.ts`, after the `/admin/upload-image` handler, add:

```ts
const MAX_PDF_SIZE = 25 * 1024 * 1024;
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE },
  fileFilter(_req, file, cb) {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  },
});

router.post(
  "/admin/upload-file",
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    uploadPdf.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File too large (max 25 MB)" });
        return res.status(400).json({ error: err.message });
      }
      if (err) return res.status(400).json({ error: (err as Error).message });
      return next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });
      const folderRaw = (req.query.folder as string | undefined) || "files";
      const folder = folderRaw.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "files";
      const objectId = randomUUID();
      await savePrivateObject(`${folder}/${objectId}`, req.file.buffer, req.file.mimetype, {
        cacheControl: "public, max-age=31536000",
      });
      return res.json({ url: `/api/storage/objects/${folder}/${objectId}` });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to upload file" });
    }
  },
);
```

- [ ] **Step 4: Point admin stats at `content_items`.** In the same file's `/admin/stats` handler, find the two queries that produce `upcomingEventsCount` and `totalEventsCount` (they select from `events`). Replace them with:

```ts
db
  .select({ c: count() })
  .from(contentItems)
  .where(
    and(
      eq(contentItems.type, "event"),
      eq(contentItems.status, "published"),
      sql`((${contentItems.details}->>'startsAt') is null or (${contentItems.details}->>'startsAt')::timestamptz >= now())`,
    ),
  ),
db.select({ c: count() }).from(contentItems).where(eq(contentItems.type, "event")),
```

Add `contentItems` to the `@workspace/db` import and `and` to the drizzle import. If `events` is no longer referenced anywhere in that file, remove it from the import.

- [ ] **Step 5: Run the tests and typecheck**

Run: `pnpm --filter @workspace/api-server test -- src/routes/admin && pnpm --filter @workspace/api-server typecheck`
Expected: PASS; typecheck exit 0. Verify the storage route serves the stored `contentType`: run `grep -n "contentType\|Content-Type" apps/api/src/routes/storage.ts`. It should set the header from object metadata. If it doesn't, note it in the commit message; it's not in this task's scope.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/admin
git commit -m "feat(api): admin PDF upload; event stats read content_items

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Legacy events migration

**Files:**
- Create: `apps/api/src/lib/seed/migrateEventsToContent.ts`
- Test: `apps/api/src/lib/seed/migrateEventsToContent.test.ts`
- Modify: `apps/api/src/index.ts`

**Interfaces:**
- Consumes: `createItem`, `parseContentItem`, `events` table.
- Produces: `parseLegacyEventDate(ar: string, en: string, time?: string | null): Date | null`, `mapLegacyKind(categoryEn: string | null, categoryAr: string | null): EventKind`, `migrateEventsToContent(): Promise<{ migrated: number; needsReview: number }>`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/lib/seed/migrateEventsToContent.test.ts
import { afterAll, describe, expect, it } from "vitest";
import { db, events, contentItems } from "@workspace/db";
import { eq } from "drizzle-orm";
import { mapLegacyKind, migrateEventsToContent, parseLegacyEventDate } from "./migrateEventsToContent";

describe("parseLegacyEventDate", () => {
  it("parses English day-month-year", () => {
    expect(parseLegacyEventDate("", "15 March 2026")?.toISOString().slice(0, 10)).toBe("2026-03-15");
  });
  it("parses Arabic month names with Arabic-Indic digits", () => {
    expect(parseLegacyEventDate("١٥ مارس ٢٠٢٦", "")?.toISOString().slice(0, 10)).toBe("2026-03-15");
  });
  it("parses ISO", () => {
    expect(parseLegacyEventDate("", "2026-05-01")?.toISOString().slice(0, 10)).toBe("2026-05-01");
  });
  it("returns null for vague text", () => {
    expect(parseLegacyEventDate("قريبًا", "Coming soon")).toBeNull();
  });
});

describe("mapLegacyKind", () => {
  it("maps known categories and defaults to seminar", () => {
    expect(mapLegacyKind("Workshop", null)).toBe("workshop");
    expect(mapLegacyKind(null, "مؤتمر")).toBe("conference");
    expect(mapLegacyKind("Gathering", "لقاء")).toBe("seminar");
  });
});

describe("migrateEventsToContent", () => {
  const TITLE = "test-cms-legacy-event";
  afterAll(async () => {
    await db.delete(events).where(eq(events.titleAr, TITLE));
    await db.delete(contentItems).where(eq(contentItems.titleAr, TITLE));
  });

  it("copies rows once and flags unparseable dates for review", async () => {
    await db.insert(events).values({ titleAr: TITLE, titleEn: TITLE, dateAr: "قريبًا", dateEn: "Soon", status: "upcoming" });
    await migrateEventsToContent();
    await migrateEventsToContent();
    const rows = await db.select().from(contentItems).where(eq(contentItems.titleAr, TITLE));
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("event");
    expect(rows[0].status).toBe("review");
    expect(rows[0].details.legacyDateText).toBe("قريبًا / Soon");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @workspace/api-server test -- src/lib/seed/migrateEventsToContent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// apps/api/src/lib/seed/migrateEventsToContent.ts
import { db, events, contentItems } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";
import { createItem } from "../cms/repo";
import { parseContentItem } from "../cms/schemas";

type EventKind = "training" | "workshop" | "seminar" | "conference" | "exhibition";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

const AR_MONTHS: Record<string, number> = {
  يناير: 0, فبراير: 1, مارس: 2, أبريل: 3, ابريل: 3, إبريل: 3, مايو: 4, يونيو: 5, يونيه: 5,
  يوليو: 6, يوليه: 6, أغسطس: 7, اغسطس: 7, سبتمبر: 8, أكتوبر: 9, اكتوبر: 9, نوفمبر: 10, ديسمبر: 11,
};

export function parseLegacyEventDate(ar: string, en: string, time?: string | null): Date | null {
  const hm = time ? toLatinDigits(time).match(/(\d{1,2}):(\d{2})/) : null;
  const withTime = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m, d, hm ? Number(hm[1]) : 0, hm ? Number(hm[2]) : 0));

  const iso = en.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return withTime(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const enMatch = en.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (enMatch) {
    const probe = new Date(`${enMatch[2]} 1, 2000`);
    if (!Number.isNaN(probe.getTime())) return withTime(Number(enMatch[3]), probe.getMonth(), Number(enMatch[1]));
  }

  const arMatch = toLatinDigits(ar).match(/(\d{1,2})\s+([\u0600-\u06FF]+)\s+(\d{4})/);
  if (arMatch && arMatch[2] in AR_MONTHS) {
    return withTime(Number(arMatch[3]), AR_MONTHS[arMatch[2]], Number(arMatch[1]));
  }
  return null;
}

export function mapLegacyKind(categoryEn: string | null, categoryAr: string | null): EventKind {
  const s = `${categoryEn ?? ""} ${categoryAr ?? ""}`.toLowerCase();
  if (/workshop|ورش/.test(s)) return "workshop";
  if (/conference|مؤتمر/.test(s)) return "conference";
  if (/exhibit|معرض/.test(s)) return "exhibition";
  if (/training|course|تدريب|دورة/.test(s)) return "training";
  return "seminar";
}

export async function migrateEventsToContent(): Promise<{ migrated: number; needsReview: number }> {
  let migrated = 0;
  let needsReview = 0;
  try {
    const legacy = await db.select().from(events);
    if (!legacy.length) return { migrated, needsReview };
    const done = await db
      .select({ id: sql<number>`(${contentItems.details}->>'legacyEventId')::int` })
      .from(contentItems)
      .where(sql`${contentItems.details} ? 'legacyEventId'`);
    const doneIds = new Set(done.map((r) => Number(r.id)));

    for (const e of legacy) {
      if (doneIds.has(e.id)) continue;
      const date = parseLegacyEventDate(e.dateAr, e.dateEn, e.timeEn ?? e.timeAr);
      const online = /online|عن ?بعد|أونلاين|اونلاين/i.test(`${e.locationEn ?? ""} ${e.locationAr ?? ""}`);
      const parsed = parseContentItem({
        type: "event",
        slug: `event-legacy-${e.id}`,
        status: date ? "published" : "review",
        titleAr: e.titleAr,
        titleEn: e.titleEn,
        summaryAr: (e.descriptionAr ?? "").slice(0, 2000),
        summaryEn: (e.descriptionEn ?? "").slice(0, 2000),
        bodyAr: e.descriptionAr ? `<p>${escapeHtml(e.descriptionAr)}</p>` : "",
        bodyEn: e.descriptionEn ? `<p>${escapeHtml(e.descriptionEn)}</p>` : "",
        coverImageUrl: e.imageUrl ?? "",
        publishedAt: e.createdAt,
        details: {
          kind: mapLegacyKind(e.categoryEn, e.categoryAr),
          ...(date ? { startsAt: date.toISOString() } : {}),
          mode: online ? "online" : "in_person",
          venueAr: e.locationAr ?? "",
          venueEn: e.locationEn ?? "",
          registration: e.status === "past" ? "closed" : "interest",
          legacyEventId: e.id,
          ...(date ? {} : { legacyDateText: `${e.dateAr} / ${e.dateEn}` }),
        },
      });
      if (!parsed.ok) {
        logger.warn({ eventId: e.id, issues: parsed.issues }, "Skipping legacy event that fails validation");
        continue;
      }
      await createItem(parsed.value);
      migrated++;
      if (!date) needsReview++;
    }
    if (migrated) logger.info({ migrated, needsReview }, "Migrated legacy events to content_items");
  } catch (err) {
    logger.error({ err }, "Legacy events migration failed");
  }
  return { migrated, needsReview };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n+/g, "<br>");
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @workspace/api-server test -- src/lib/seed/migrateEventsToContent.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Call it at startup.** In `apps/api/src/index.ts`, import `migrateEventsToContent` from `./lib/seed/migrateEventsToContent`. Next to the existing `void seedJobOpenings();` lines, add:

```ts
  void (async () => {
    await migrateEventsToContent();
  })();
```

(Task 8 extends this IIFE with the seed.)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/seed apps/api/src/index.ts
git commit -m "feat(api): migrate legacy events into content_items at startup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Reference images, navy logo and the published seed

**Files:**
- Create: `scripts/crop-reference-images.mjs`, `apps/client/public/seed/*.webp` (generated), `apps/client/public/darnozom-n-logo-navy.png` (generated)
- Create: `apps/api/src/lib/seed/cmsSeedData.ts`, `apps/api/src/lib/seed/seedCmsContent.ts`
- Test: `apps/api/src/lib/seed/seedCmsContent.test.ts`
- Modify: root `package.json` (devDependency `sharp`), `apps/api/src/index.ts`

**Interfaces:**
- Produces: image paths `/seed/{hero,academy,books,digital,about,observatory,daily,research,files,articlePolicy,articleLeadership,articleSharia,studyGovernance,studySharia,pubSharia,pubPolicy,pubAdmin,pubLeadership,news,seminar,workshop}.webp`; `/darnozom-n-logo-navy.png`; `SEED_ITEMS: unknown[]`, `SEED_SLIDES: FeaturedSlideInput[]`; `seedCmsContent(): Promise<void>`.

- [ ] **Step 1: Write the crop script**

```js
// scripts/crop-reference-images.mjs
// One-off: node scripts/crop-reference-images.mjs "C:/Users/UTD/Downloads/DarNozom_Final_Developer_Package"
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const pkgDir = process.argv[2];
if (!pkgDir) {
  console.error("usage: node scripts/crop-reference-images.mjs <path-to-DarNozom_Final_Developer_Package>");
  process.exit(1);
}
const { regions } = JSON.parse(await readFile(path.join(pkgDir, "assets/reference-regions.json"), "utf8"));
const src = path.join(pkgDir, "assets/DarNozom_Homepage_Reference.png");
const outDir = path.resolve("apps/client/public/seed");
await mkdir(outDir, { recursive: true });

for (const [name, [left, top, width, height]] of Object.entries(regions)) {
  if (name === "logo" || name === "envelope" || name.startsWith("icon")) continue; // replaced by lucide icons / recoloured logo
  await sharp(src).extract({ left, top, width, height }).webp({ quality: 92 }).toFile(path.join(outDir, `${name}.webp`));
  console.log(`wrote seed/${name}.webp (${width}x${height})`);
}

// Navy logo: keep the existing logo's shape (alpha) and fill it with #244B70.
const logo = path.resolve("apps/client/public/darnozom-n-logo.png");
const { width, height } = await sharp(logo).metadata();
const alpha = await sharp(logo).ensureAlpha().extractChannel(3).raw().toBuffer();
await sharp({ create: { width, height, channels: 3, background: "#244B70" } })
  .joinChannel(alpha, { raw: { width, height, channels: 1 } })
  .png()
  .toFile(path.resolve("apps/client/public/darnozom-n-logo-navy.png"));
console.log("wrote darnozom-n-logo-navy.png");
```

- [ ] **Step 2: Run it**

Run: `pnpm add -Dw sharp && node scripts/crop-reference-images.mjs "C:/Users/UTD/Downloads/DarNozom_Final_Developer_Package"`
Expected: 21 `wrote seed/…` lines + the logo line. Open `apps/client/public/darnozom-n-logo-navy.png` and `seed/hero.webp` and check visually that they're correct (the logo is a navy "N" mark, not a solid rectangle). If the logo comes out as a rectangle, the source has no transparency. In that case use `sharp(logo).negate({ alpha: false })`, or ask the user for a transparent logo file.

- [ ] **Step 3: Write the failing seed test**

```ts
// apps/api/src/lib/seed/seedCmsContent.test.ts
import { describe, expect, it } from "vitest";
import { featuredSlideInput, parseContentItem } from "../cms/schemas";
import { SEED_ITEMS, SEED_SLIDES } from "./cmsSeedData";

describe("CMS seed data", () => {
  it("every item passes validation and is published", () => {
    for (const item of SEED_ITEMS) {
      const r = parseContentItem(item);
      expect(r.ok, JSON.stringify(item).slice(0, 80)).toBe(true);
      if (r.ok) expect(r.value.status).toBe("published");
    }
  });
  it("has unique slugs and covers every home section", () => {
    const slugs = SEED_ITEMS.map((i: any) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const types = new Set(SEED_ITEMS.map((i: any) => i.type));
    for (const t of ["observatory", "article", "study", "publication", "news", "event"]) expect(types.has(t)).toBe(true);
  });
  it("seeded events have no invented dates", () => {
    for (const i of SEED_ITEMS as any[]) if (i.type === "event") expect(i.details.startsAt).toBeUndefined();
  });
  it("slides are valid custom cards", () => {
    expect(SEED_SLIDES).toHaveLength(4);
    for (const s of SEED_SLIDES) expect(featuredSlideInput.safeParse(s).success).toBe(true);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm --filter @workspace/api-server test -- src/lib/seed/seedCmsContent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Write the seed data**

```ts
// apps/api/src/lib/seed/cmsSeedData.ts
// Content mirrors the approved home reference (DarNozom_Homepage_Reference.png).
// Seeded as published at the client's request; admins replace it from the panel.
import type { FeaturedSlideInput } from "../cms/schemas";

const p = (s: string) => `<p>${s}</p>`;
const org = { authorAr: "دار نظم", authorEn: "DarNozom" };

export const SEED_ITEMS: Record<string, unknown>[] = [
  {
    type: "observatory", slug: "policy-public-affairs-developments", status: "published", area: "public_policy_admin", ...org,
    publishedAt: "2026-10-04T08:00:00Z", coverImageUrl: "/seed/observatory.webp",
    titleAr: "مستجدات السياسات والإدارة والشأن العام", titleEn: "Developments in Policy, Administration and Public Affairs",
    summaryAr: "قراءات تحليلية لأبرز التطورات في السياسات العامة والإدارة والحوكمة، مع التركيز على دلالاتها المستقبلية.",
    summaryEn: "Analytical readings of key developments in public policy, administration and governance, focusing on their future implications.",
    details: {
      kind: "weekly_review", region: "middle_east", sources: [],
      whatHappenedAr: p("رصد لأبرز القرارات والتوجهات في السياسات العامة والإدارة خلال الفترة الأخيرة."),
      whatHappenedEn: p("A review of the most significant recent decisions and trends in public policy and administration."),
      ourReadingAr: p("تكشف هذه التطورات عن حاجة متزايدة إلى ربط القرار العام بأدلة بحثية ونظم حوكمة واضحة."),
      ourReadingEn: p("These developments show a growing need to link public decisions to research evidence and clear governance systems."),
      researchQuestionsAr: p("كيف يمكن قياس أثر هذه السياسات على جودة الخدمات العامة؟"),
      researchQuestionsEn: p("How can the impact of these policies on public service quality be measured?"),
    },
  },
  {
    type: "observatory", slug: "daily-brief", status: "published", ...org, publishedAt: "2026-10-03T08:00:00Z",
    coverImageUrl: "/seed/daily.webp", titleAr: "الموجز اليومي", titleEn: "Daily Brief",
    summaryAr: "أبرز المستجدات والتحليلات في قضايا السياسات والمؤسسات.",
    summaryEn: "The key developments and analyses on policy and institutional issues.",
    details: { kind: "daily_brief", sources: [] },
  },
  {
    type: "observatory", slug: "research-output-review", status: "published", ...org, publishedAt: "2026-10-02T08:00:00Z",
    coverImageUrl: "/seed/research.webp", titleAr: "الإنتاج الفكري والبحثي", titleEn: "Intellectual and Research Output",
    summaryAr: "مراجعات وقراءات في الإصدارات الجديدة والدراسات الحديثة.",
    summaryEn: "Reviews and readings of new publications and recent studies.",
    details: { kind: "research_output", sources: [] },
  },
  {
    type: "observatory", slug: "follow-up-files", status: "published", ...org, publishedAt: "2026-10-01T08:00:00Z",
    coverImageUrl: "/seed/files.webp", titleAr: "ملفات المتابعة", titleEn: "Follow-up Files",
    summaryAr: "ملفات معمقة حول قضايا محورية في الشأن العام.",
    summaryEn: "In-depth files on pivotal public-affairs issues.",
    details: { kind: "follow_up_file", sources: [] },
  },
  {
    type: "article", slug: "public-value-decision-quality", status: "published", area: "public_policy_admin", ...org,
    publishedAt: "2026-10-03T09:00:00Z", coverImageUrl: "/seed/articlePolicy.webp",
    titleAr: "القيمة العامة وجودة القرار", titleEn: "Public Value and Decision Quality",
    summaryAr: "نحو قرارات أكثر فاعلية في خدمة الصالح العام.", summaryEn: "Towards more effective decisions that serve the public good.",
    bodyAr: p("تتناول هذه المقالة مفهوم القيمة العامة بوصفه معيارًا لتقويم القرارات العامة، وكيف يمكن للمؤسسات أن تبني قراراتها على أدلة واضحة تخدم الصالح العام."),
    bodyEn: p("This article examines public value as a yardstick for public decisions, and how institutions can ground their decisions in clear evidence that serves the public good."),
    details: { relatedLinks: [] },
  },
  {
    type: "article", slug: "leadership-institution-building", status: "published", area: "leadership_governance", ...org,
    publishedAt: "2026-10-02T09:00:00Z", coverImageUrl: "/seed/articleLeadership.webp",
    titleAr: "القيادة وبناء المؤسسات", titleEn: "Leadership and Institution Building",
    summaryAr: "أطر وممارسات لتعزيز كفاءة المؤسسات واستدامة أدائها.", summaryEn: "Frameworks and practices that strengthen institutional efficiency and sustain performance.",
    bodyAr: p("تعرض المقالة أطرًا عملية لدور القيادة في تأسيس المؤسسات وتطوير نظم إدارتها وحوكمتها."),
    bodyEn: p("The article presents practical frameworks for leadership's role in founding institutions and developing their management and governance systems."),
    details: { relatedLinks: [] },
  },
  {
    type: "article", slug: "sharia-grounding-understanding-reality", status: "published", area: "sharia_policy", ...org,
    publishedAt: "2026-10-01T09:00:00Z", coverImageUrl: "/seed/articleSharia.webp",
    titleAr: "التأصيل الشرعي وفهم الواقع", titleEn: "Sharia Grounding and Understanding Reality",
    summaryAr: "مقاربات معاصرة لربط المقاصد الشرعية بالسياسات العامة.", summaryEn: "Contemporary approaches linking the objectives of Sharia to public policy.",
    bodyAr: p("تناقش المقالة كيف يسهم فهم الواقع في تنزيل المقاصد الشرعية على السياسات العامة بصورة منهجية."),
    bodyEn: p("The article discusses how understanding reality helps apply the objectives of Sharia to public policy methodically."),
    details: { relatedLinks: [] },
  },
  {
    type: "study", slug: "governance-public-service-quality", status: "published", area: "leadership_governance", ...org,
    publishedAt: "2026-10-03T10:00:00Z", coverImageUrl: "/seed/studyGovernance.webp",
    titleAr: "الحوكمة وجودة الخدمات العامة", titleEn: "Governance and Public Service Quality",
    summaryAr: "دراسة في المبادئ والممارسات الداعمة لتحسين الأداء المؤسسي.", summaryEn: "A study of the principles and practices that improve institutional performance.",
    details: {
      questionAr: p("ما أثر مبادئ الحوكمة على جودة الخدمات العامة؟"), questionEn: p("How do governance principles affect public service quality?"),
      methodAr: p("مراجعة أدبيات وتحليل مقارن لممارسات مؤسسية."), methodEn: p("A literature review and comparative analysis of institutional practices."),
      keywords: ["الحوكمة", "الخدمات العامة"], pdfUrl: "",
    },
  },
  {
    type: "study", slug: "sharia-policy-institution-building", status: "published", area: "sharia_policy", ...org,
    publishedAt: "2026-10-02T10:00:00Z", coverImageUrl: "/seed/studySharia.webp",
    titleAr: "السياسة الشرعية وبناء المؤسسات", titleEn: "Sharia Policy and Institution Building",
    summaryAr: "دراسة تحليلية في الأطر والمفاهيم والتطبيقات المعاصرة.", summaryEn: "An analytical study of frameworks, concepts and contemporary applications.",
    details: {
      questionAr: p("كيف تسهم السياسة الشرعية في بناء مؤسسات فاعلة؟"), questionEn: p("How does Sharia policy contribute to building effective institutions?"),
      keywords: ["السياسة الشرعية", "المؤسسات"], pdfUrl: "",
    },
  },
  {
    type: "publication", slug: "public-policy-report", status: "published", area: "public_policy_admin", ...org,
    publishedAt: "2026-10-03T11:00:00Z", coverImageUrl: "/seed/pubPolicy.webp",
    titleAr: "السياسات العامة", titleEn: "Public Policy",
    summaryAr: "تقرير يرصد اتجاهات السياسات العامة وأدوات تطويرها.", summaryEn: "A report tracking public policy trends and the tools to develop them.",
    details: { kind: "report", issueNumber: "", pdfUrl: "" },
  },
  {
    type: "publication", slug: "public-administration-periodical", status: "published", area: "public_policy_admin", ...org,
    publishedAt: "2026-10-02T11:00:00Z", coverImageUrl: "/seed/pubAdmin.webp",
    titleAr: "الإدارة العامة", titleEn: "Public Administration",
    summaryAr: "دورية تعنى بقضايا الإدارة العامة وتطوير الأداء.", summaryEn: "A periodical on public administration and performance development.",
    details: { kind: "periodical", issueNumber: "1", pdfUrl: "" },
  },
  {
    type: "publication", slug: "leadership-governance-research", status: "published", area: "leadership_governance", ...org,
    publishedAt: "2026-10-01T11:00:00Z", coverImageUrl: "/seed/pubLeadership.webp",
    titleAr: "القيادة والحوكمة", titleEn: "Leadership and Governance",
    summaryAr: "بحث علمي في نماذج القيادة وأطر الحوكمة المؤسسية.", summaryEn: "Scientific research on leadership models and institutional governance frameworks.",
    details: { kind: "research", issueNumber: "", pdfUrl: "" },
  },
  {
    type: "news", slug: "darnozom-news", status: "published", ...org, publishedAt: "2026-10-04T12:00:00Z",
    coverImageUrl: "/seed/news.webp", titleAr: "جديد دار نظم", titleEn: "What's New at DarNozom",
    summaryAr: "إعلانات ومستجدات حول برامج وإصدارات المؤسسة.", summaryEn: "Announcements and updates on DarNozom's programs and publications.",
    bodyAr: p("تابع أحدث إعلانات دار نظم حول البرامج والإصدارات والأنشطة العلمية والمهنية."),
    bodyEn: p("Follow DarNozom's latest announcements on programs, publications and scholarly and professional activities."),
    details: { relatedLinks: [] },
  },
  {
    type: "event", slug: "public-policy-institutions-seminar", status: "published", area: "public_policy_admin", ...org,
    publishedAt: "2026-10-03T12:00:00Z", coverImageUrl: "/seed/seminar.webp",
    titleAr: "السياسات العامة وتطوير المؤسسات", titleEn: "Public Policy and Institutional Development",
    summaryAr: "ندوة فكرية حول التحديات والفرص في بناء مؤسسات أكثر فاعلية.", summaryEn: "A seminar on the challenges and opportunities of building more effective institutions.",
    details: { kind: "seminar", mode: "in_person", registration: "interest" },
  },
  {
    type: "event", slug: "leadership-governance-workshop", status: "published", area: "leadership_governance", ...org,
    publishedAt: "2026-10-02T12:00:00Z", coverImageUrl: "/seed/workshop.webp",
    titleAr: "القيادة والإدارة والحوكمة", titleEn: "Leadership, Management and Governance",
    summaryAr: "ورشة عمل تطبيقية لتعزيز الممارسات المؤسسية.", summaryEn: "A hands-on workshop to strengthen institutional practices.",
    details: { kind: "workshop", mode: "in_person", registration: "interest" },
  },
];

const slide = (s: Omit<FeaturedSlideInput, "sourceKind" | "contentItemId" | "medusaProductId" | "isActive">): FeaturedSlideInput => ({
  sourceKind: "custom",
  contentItemId: null,
  medusaProductId: null,
  isActive: true,
  ...s,
});

export const SEED_SLIDES: FeaturedSlideInput[] = [
  slide({
    badgeAr: "مشروع بحثي", badgeEn: "Research Project",
    titleAr: "نحو تأسيس علم السياسة الشرعية المعاصرة", titleEn: "Towards a Contemporary Science of Sharia Policy",
    summaryAr: "مشروع بحثي يؤصل المفاهيم ويطور الأطر النظرية والمنهجية لربط السياسة الشرعية بمتطلبات الواقع المؤسسي المعاصر.",
    summaryEn: "A research project that grounds concepts and develops theoretical and methodological frameworks linking Sharia policy to contemporary institutional needs.",
    imageUrl: "/seed/hero.webp", ctaLabelAr: "اكتشف المشروع", ctaLabelEn: "Explore the project", href: "/services/research",
  }),
  slide({
    badgeAr: "برنامج", badgeEn: "Program",
    titleAr: "القيادة والإدارة والحوكمة", titleEn: "Leadership, Management and Governance",
    summaryAr: "برامج تدريبية متخصصة لبناء القدرات القيادية والمؤسسية.", summaryEn: "Specialized training programs that build leadership and institutional capacity.",
    imageUrl: "/seed/academy.webp", ctaLabelAr: "اكتشف البرنامج", ctaLabelEn: "Explore the program", href: "/academy",
  }),
  slide({
    badgeAr: "إصدار", badgeEn: "Publication",
    titleAr: "كتب السياسة الشرعية والإدارة", titleEn: "Books on Sharia Policy and Management",
    summaryAr: "إصدارات علمية ومرجعية في قضايا الشأن العام.", summaryEn: "Scholarly and reference publications on public affairs.",
    imageUrl: "/seed/books.webp", ctaLabelAr: "تصفح الإصدارات", ctaLabelEn: "Browse publications", href: "/publications",
  }),
  slide({
    badgeAr: "حل رقمي", badgeEn: "Digital Solution",
    titleAr: "حلول نظم بلاتفورم", titleEn: "Nozom Platform Solutions",
    summaryAr: "حلول رقمية ومعرفية لدعم العمل المؤسسي ونشر المعرفة.", summaryEn: "Digital and knowledge solutions that support institutional work and spread knowledge.",
    imageUrl: "/seed/digital.webp", ctaLabelAr: "استكشف الحلول", ctaLabelEn: "Explore solutions", href: "/services/digital-transformation",
  }),
];
```

- [ ] **Step 6: Write the seeder**

```ts
// apps/api/src/lib/seed/seedCmsContent.ts
import { count, eq } from "drizzle-orm";
import { db, featuredSlides, siteSettings } from "@workspace/db";
import { logger } from "../logger";
import { createItem, createSlide, getItemBySlug } from "../cms/repo";
import { parseContentItem } from "../cms/schemas";
import { SEED_ITEMS, SEED_SLIDES } from "./cmsSeedData";

const MARKER = "cms_seed_v1";

/** Runs once per database (guarded by a site_settings row) so deleted seed items never come back. */
export async function seedCmsContent(): Promise<void> {
  try {
    const [done] = await db.select().from(siteSettings).where(eq(siteSettings.key, MARKER));
    if (done) return;

    for (const raw of SEED_ITEMS) {
      const parsed = parseContentItem(raw);
      if (!parsed.ok) throw new Error(`Invalid seed item ${String(raw.slug)}: ${JSON.stringify(parsed.issues)}`);
      if (!(await getItemBySlug(parsed.value.slug))) await createItem(parsed.value);
    }

    const [{ n }] = await db.select({ n: count() }).from(featuredSlides);
    if (Number(n) === 0) for (const s of SEED_SLIDES) await createSlide(s);

    await db
      .insert(siteSettings)
      .values({ key: MARKER, value: new Date().toISOString(), valueType: "string" })
      .onConflictDoNothing();
    logger.info("Seeded CMS home content");
  } catch (err) {
    logger.error({ err }, "CMS seed failed");
  }
}
```

- [ ] **Step 7: Run the seed-data test**

Run: `pnpm --filter @workspace/api-server test -- src/lib/seed`
Expected: PASS.

- [ ] **Step 8: Wire it into startup.** In `apps/api/src/index.ts`, import `seedCmsContent` and extend the IIFE from Task 7:

```ts
  void (async () => {
    await migrateEventsToContent();
    await seedCmsContent();
  })();
```

- [ ] **Step 9: Smoke-test against the local DB**

Run: `pnpm dev:api` (in a separate terminal), then `curl -s localhost:8080/api/cms/home | head -c 600`. Check the port in `.env` `PORT`.
Expected: JSON containing `"featured":[{…"titleAr":"نحو تأسيس علم السياسة الشرعية المعاصرة"…` and `"articles":[…3 items…]`. Restart the API once more and confirm the log line "Seeded CMS home content" does **not** repeat.

- [ ] **Step 10: Commit**

```bash
git add scripts/crop-reference-images.mjs package.json pnpm-lock.yaml apps/client/public/seed apps/client/public/darnozom-n-logo-navy.png apps/api/src/lib/seed apps/api/src/index.ts
git commit -m "feat(cms): reference image crops, navy logo and published home seed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Design tokens, fonts and legacy colour sweep

**Files:**
- Modify: `apps/client/src/index.css`, `apps/client/src/main.tsx`, `apps/client/package.json`
- Modify (sweep): every file under `apps/client/src` that contains a legacy colour (list in Step 5)
- Test: `apps/client/src/theme.test.ts`

**Interfaces:**
- Produces: Tailwind colour utilities `navy`, `navy-deep`, `ivory`, `mist`, `gold`, `gold-light`, `ink`, `ink-muted`, `line` (e.g. `bg-navy`, `text-ink-muted`, `border-line`, `bg-gold-light`). Later tasks use **only** these names for brand colours. shadcn tokens (`primary`, `secondary`, `muted`, `accent`, `border`) now resolve to the brand palette.

- [ ] **Step 1: Write the failing test**

```ts
// apps/client/src/theme.test.ts
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname);
const LEGACY =
  /#(0F3D2E|F4ECD7|134A38|082219|0A2A1F|F8F4E8|F6E7BD|DDD4BD|CFA63D|1D5E48|14302A)\b|darnozom-n-logo-green|--emerald-|--gold-warm|--gold-soft|--ink-deep|--sand-line/i;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("brand theme", () => {
  it("has no legacy green palette left in source", () => {
    const offenders = walk(ROOT)
      .filter((f) => LEGACY.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it("defines the approved brand colours", () => {
    const css = readFileSync(path.join(ROOT, "index.css"), "utf8");
    for (const hsl of ["209 51% 29%", "208 54% 20%", "43 33% 96%", "210 40% 94%", "39 33% 56%", "35 43% 69%", "210 38% 18%", "211 18% 39%", "208 27% 88%"]) {
      expect(css).toContain(hsl);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @workspace/client exec vitest run src/theme.test.ts`
Expected: FAIL. Offenders include `index.css`, `pages/about.tsx`, `components/site-nav.tsx` and others.

- [ ] **Step 3: Install fonts and import them**

Run: `pnpm --filter @workspace/client add @fontsource-variable/noto-sans-arabic @fontsource-variable/inter`

At the top of `apps/client/src/main.tsx`, before `import "./index.css"`, add:

```ts
import "@fontsource-variable/noto-sans-arabic";
import "@fontsource-variable/inter";
```

- [ ] **Step 4: Replace the palette in `index.css`**

4a. In the `@theme inline { … }` block, add these lines just before `--font-sans: var(--app-font-sans);`:

```css
  --color-navy: hsl(var(--navy));
  --color-navy-deep: hsl(var(--navy-deep));
  --color-ivory: hsl(var(--ivory));
  --color-mist: hsl(var(--mist));
  --color-gold: hsl(var(--gold));
  --color-gold-light: hsl(var(--gold-light));
  --color-ink: hsl(var(--ink));
  --color-ink-muted: hsl(var(--ink-muted));
  --color-line: hsl(var(--line));
```

4b. Replace everything from the line `/* LIGHT MODE — Premium Islamic Green (palette from Task #242) */` down to and including the closing `}` of the `@layer base { … }` block with:

```css
/* LIGHT MODE — DarNozom navy / ivory / gold (design brief §2) */
:root {
  --button-outline: rgba(0,0,0, .10);
  --badge-outline: rgba(0,0,0, .05);
  --opaque-button-border-intensity: -8;
  --elevate-1: rgba(24, 54, 80, .04);
  --elevate-2: rgba(24, 54, 80, .09);

  --navy: 209 51% 29%;        /* #244B70 primary */
  --navy-deep: 208 54% 20%;   /* #183650 supporting dark */
  --ivory: 43 33% 96%;        /* #F8F6F1 page background */
  --pure-white: 0 0% 100%;    /* #FFFFFF cards, inputs */
  --mist: 210 40% 94%;        /* #EAF0F6 highlight / selected */
  --gold: 39 33% 56%;         /* #B59B6B accents, dividers */
  --gold-light: 35 43% 69%;   /* #D2B68F badges, gold buttons */
  --ink: 210 38% 18%;         /* #1C2D3E text */
  --ink-muted: 211 18% 39%;   /* #526477 secondary text */
  --line: 208 27% 88%;        /* #D7E0E8 borders */

  --background: var(--ivory);
  --foreground: var(--ink);
  --border: var(--line);

  --card: var(--pure-white);
  --card-foreground: var(--ink);
  --card-border: var(--line);

  --sidebar: var(--ivory);
  --sidebar-foreground: var(--ink);
  --sidebar-border: var(--line);
  --sidebar-primary: var(--navy);
  --sidebar-primary-foreground: var(--pure-white);
  --sidebar-accent: var(--mist);
  --sidebar-accent-foreground: var(--navy);
  --sidebar-ring: var(--gold);

  --popover: var(--pure-white);
  --popover-foreground: var(--ink);
  --popover-border: var(--line);

  --primary: var(--navy);
  --primary-foreground: var(--pure-white);
  --secondary: var(--gold-light);
  --secondary-foreground: var(--ink);
  --muted: var(--mist);
  --muted-foreground: var(--ink-muted);
  --accent: var(--gold);
  --accent-foreground: var(--ink);
  --destructive: 0 70% 42%;
  --destructive-foreground: 0 0% 98%;
  --input: var(--pure-white);
  --ring: var(--gold);

  --chart-1: var(--navy);
  --chart-2: var(--gold);
  --chart-3: var(--navy-deep);
  --chart-4: var(--gold-light);
  --chart-5: var(--ink-muted);

  --app-font-sans: 'Noto Sans Arabic Variable', 'Inter Variable', system-ui, sans-serif;
  --app-font-serif: 'Noto Sans Arabic Variable', 'Inter Variable', serif;
  --app-font-mono: Menlo, monospace;
  --radius: 0.25rem;

  --shadow-2xs: 0 1px 0 0 hsl(208 54% 20% / 0.04);
  --shadow-xs: 0 1px 2px 0 hsl(208 54% 20% / 0.05);
  --shadow-sm: 0 1px 2px 0 hsl(208 54% 20% / 0.06);
  --shadow: 0 1px 3px 0 hsl(208 54% 20% / 0.08);
  --shadow-md: 0 4px 8px -2px hsl(208 54% 20% / 0.10);
  --shadow-lg: 0 8px 16px -4px hsl(208 54% 20% / 0.12);
  --shadow-xl: 0 12px 24px -6px hsl(208 54% 20% / 0.14);
  --shadow-2xl: 0 16px 32px -8px hsl(208 54% 20% / 0.16);
  --tracking-normal: 0em;
  --spacing: 0.25rem;

  --sidebar-primary-border: hsl(from hsl(var(--sidebar-primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --sidebar-accent-border: hsl(from hsl(var(--sidebar-accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --primary-border: hsl(from hsl(var(--primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --secondary-border: hsl(from hsl(var(--secondary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --muted-border: hsl(from hsl(var(--muted)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --accent-border: hsl(from hsl(var(--accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --destructive-border: hsl(from hsl(var(--destructive)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
}

/* Dark surfaces (e.g. sections with className="dark") use navy-deep. */
.dark {
  --button-outline: rgba(255,255,255, .10);
  --badge-outline: rgba(255,255,255, .05);
  --opaque-button-border-intensity: 9;
  --elevate-1: rgba(255,255,255, .04);
  --elevate-2: rgba(255,255,255, .09);

  --background: var(--navy-deep);
  --foreground: var(--ivory);
  --border: 208 35% 30%;
  --card: var(--navy);
  --card-foreground: var(--ivory);
  --card-border: 208 35% 30%;
  --sidebar: var(--navy-deep);
  --sidebar-foreground: var(--ivory);
  --sidebar-border: 208 35% 30%;
  --sidebar-primary: var(--gold-light);
  --sidebar-primary-foreground: var(--ink);
  --sidebar-accent: var(--navy);
  --sidebar-accent-foreground: var(--ivory);
  --sidebar-ring: var(--gold);
  --popover: var(--navy);
  --popover-foreground: var(--ivory);
  --popover-border: 208 35% 30%;
  --primary: var(--navy);
  --primary-foreground: var(--pure-white);
  --secondary: var(--gold-light);
  --secondary-foreground: var(--ink);
  --muted: var(--navy);
  --muted-foreground: 210 30% 82%;
  --accent: var(--gold-light);
  --accent-foreground: var(--ink);
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --input: var(--navy);
  --ring: var(--gold);
  --chart-1: var(--gold-light);
  --chart-2: var(--mist);
  --chart-3: var(--gold);
  --chart-4: var(--ivory);
  --chart-5: 210 30% 70%;
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply font-sans antialiased text-foreground;
    background: hsl(var(--background));
    font-size: 16px;
    line-height: 1.8;
  }

  @media (min-width: 1024px) {
    body {
      font-size: 18px;
    }
  }

  html[lang="en"] body {
    font-family: 'Inter Variable', system-ui, sans-serif;
    line-height: 1.65;
  }

  .dark body {
    background: hsl(var(--navy-deep));
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

4c. In the `.islamic-pattern` rule, change `stroke='%231D5E48'` to `stroke='%23244B70'`.

- [ ] **Step 5: Sweep legacy colours in source**

Run from `apps/client/src`:

```bash
grep -rlE "#(0F3D2E|F4ECD7|134A38|082219|0A2A1F|F8F4E8|F6E7BD|DDD4BD|CFA63D|1D5E48|14302A)|darnozom-n-logo-green|--emerald-|--gold-warm|--gold-soft|--ink-deep|--sand-line" --include=*.tsx --include=*.ts . \
| xargs sed -i -E \
  -e 's/#0F3D2E/#183650/gI' -e 's/#F4ECD7/#EAF0F6/gI' -e 's/#134A38/#244B70/gI' \
  -e 's/#082219/#122A3F/gI' -e 's/#0A2A1F/#122A3F/gI' -e 's/#F8F4E8/#F8F6F1/gI' \
  -e 's/#F6E7BD/#EAF0F6/gI' -e 's/#DDD4BD/#D7E0E8/gI' -e 's/#CFA63D/#B59B6B/gI' \
  -e 's/#1D5E48/#244B70/gI' -e 's/#14302A/#1C2D3E/gI' \
  -e 's/darnozom-n-logo-green\.png/darnozom-n-logo-navy.png/g' \
  -e 's/--emerald-deep/--navy-deep/g' -e 's/--emerald-dark/--navy/g' -e 's/--emerald-forest/--navy/g' \
  -e 's/--gold-warm/--gold/g' -e 's/--gold-soft/--mist/g' -e 's/--ink-deep/--ink/g' -e 's/--sand-line/--line/g'
```

Leave alone: the Google brand colours (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) in the sign-in button, and semantic status colours (`emerald-500`, `amber-*`), which mean success/warning, not brand.

- [ ] **Step 6: Run the test, typecheck and the full client suite**

Run: `pnpm --filter @workspace/client exec vitest run src/theme.test.ts && pnpm --filter @workspace/client typecheck && pnpm --filter @workspace/client test`
Expected: all PASS. If an existing test asserts an old hex value, update the expected value to the mapped one from Step 5.

- [ ] **Step 7: Visual check**

Run: `pnpm dev:client`. Open `/about`, `/services/store/books` and `/account`. Expected: navy/ivory/gold everywhere, no green, Arabic set in Noto Sans Arabic (DevTools → Computed → font-family).

- [ ] **Step 8: Commit**

```bash
git add apps/client
git commit -m "feat(client): navy/ivory/gold brand tokens, self-hosted fonts, legacy colour sweep

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: New header and navigation

**Files:**
- Create: `apps/client/src/lib/site-constants.ts`, `apps/client/src/lib/nav-config.ts`, `apps/client/src/components/nav/account-controls.tsx`
- Rewrite: `apps/client/src/components/site-nav.tsx`
- Test: `apps/client/src/lib/nav-config.test.ts`, `apps/client/src/components/site-nav.test.tsx`

**Interfaces:**
- Produces:
  - `site-constants.ts`: `DARNOZOM_PUBLISHER = "دار نظم"`, `CONTACT = { email: "info@darnozom.com", phone: "+20 102 204 4240", phoneHref: "tel:+201022044240", whatsappHref: "https://wa.me/201022044240" }`, `BRAND = { nameAr: "دار نظم", nameEn: "DarNozom", taglineAr: "للبحوث والاستشارات والتدريب", taglineEn: "Research, Consulting and Training", sloganAr: "معرفة ترشد القرار… وقيادة تبني المؤسسات", sloganEn: "Knowledge that guides decisions… Leadership that builds institutions", refLineAr: "في ضوء مقاصد الشريعة", refLineEn: "In light of the objectives of Sharia" }`
  - `nav-config.ts`: types `NavLink`, `NavColumn`, `NavEntry`; `MAIN_NAV: NavEntry[]` (7 entries); `activeNavKey(path: string): string | null`
  - `account-controls.tsx`: named exports `AuthSlot`, `MobileAuthSlot`, `CartButton` (moved verbatim from the old `site-nav.tsx`)
  - `site-nav.tsx`: `export default function SiteNav(props: { mode?: "home" | "page"; theme?: string })`. Props are accepted for backward compatibility and ignored.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/client/src/lib/nav-config.test.ts
import { describe, expect, it } from "vitest";
import { MAIN_NAV, activeNavKey } from "./nav-config";

describe("nav config", () => {
  it("has the seven approved entries in order", () => {
    expect(MAIN_NAV.map((e) => e.labelAr)).toEqual([
      "عن دار نظم", "خدماتنا", "المعرفة والبحوث", "الأكاديمية", "المكتبة والإصدارات", "الأخبار والفعاليات", "تواصل معنا",
    ]);
    expect(MAIN_NAV.map((e) => e.labelEn)).toEqual([
      "About DarNozom", "Services", "Knowledge and Research", "Academy", "Library and Publications", "News and Events", "Contact Us",
    ]);
  });
  it("uses only site-relative links", () => {
    for (const e of MAIN_NAV) {
      expect(e.href.startsWith("/")).toBe(true);
      for (const c of e.columns) for (const l of c.links) expect(l.href.startsWith("/")).toBe(true);
    }
  });
  it("marks the right entry active", () => {
    expect(activeNavKey("/observatory/x")).toBe("knowledge");
    expect(activeNavKey("/services/research")).toBe("knowledge");
    expect(activeNavKey("/services/store/books/1")).toBe("library");
    expect(activeNavKey("/services/consulting")).toBe("services");
    expect(activeNavKey("/academy/courses")).toBe("academy");
    expect(activeNavKey("/news-events")).toBe("news");
    expect(activeNavKey("/")).toBeNull();
  });
});
```

```tsx
// apps/client/src/components/site-nav.test.tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true, toggleLanguage: vi.fn() }) }));
vi.mock("@/components/nav/account-controls", () => ({ AuthSlot: () => null, MobileAuthSlot: () => null, CartButton: () => null }));
vi.mock("@/components/search-section", () => ({ default: () => <div>search</div> }));

import SiteNav from "./site-nav";

function renderAt(path: string) {
  const { hook, searchHook } = memoryLocation({ path });
  return render(
    <Router hook={hook} searchHook={searchHook}>
      <SiteNav mode="page" />
    </Router>,
  );
}

describe("SiteNav", () => {
  it("renders the seven top-level links", () => {
    renderAt("/");
    const nav = screen.getByRole("navigation", { name: "القائمة الرئيسية" });
    for (const label of ["عن دار نظم", "خدماتنا", "المعرفة والبحوث", "الأكاديمية", "المكتبة والإصدارات", "الأخبار والفعاليات", "تواصل معنا"]) {
      expect(within(nav).getByRole("link", { name: label })).toBeTruthy();
    }
  });

  it("opens a dropdown from its chevron and closes it with Escape, returning focus", () => {
    renderAt("/");
    const toggle = screen.getByRole("button", { name: "فتح قائمة المعرفة والبحوث" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(panel.textContent).toContain("المرصد");
    expect(panel.textContent).toContain("مركز البحوث والدراسات");
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
  });

  it("marks the active section", () => {
    renderAt("/observatory");
    const link = screen.getAllByRole("link", { name: "المعرفة والبحوث" })[0];
    expect(link.getAttribute("aria-current")).toBe("page");
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @workspace/client exec vitest run src/lib/nav-config.test.ts src/components/site-nav.test.tsx`
Expected: FAIL — `nav-config` not found; site-nav has no "القائمة الرئيسية" navigation.

- [ ] **Step 3: Write `site-constants.ts` and `nav-config.ts`**

```ts
// apps/client/src/lib/site-constants.ts
export const DARNOZOM_PUBLISHER = "دار نظم";

export const CONTACT = {
  email: "info@darnozom.com",
  phone: "+20 102 204 4240",
  phoneHref: "tel:+201022044240",
  whatsappHref: "https://wa.me/201022044240",
} as const;

export const BRAND = {
  nameAr: "دار نظم",
  nameEn: "DarNozom",
  taglineAr: "للبحوث والاستشارات والتدريب",
  taglineEn: "Research, Consulting and Training",
  sloganAr: "معرفة ترشد القرار… وقيادة تبني المؤسسات",
  sloganEn: "Knowledge that guides decisions… Leadership that builds institutions",
  refLineAr: "في ضوء مقاصد الشريعة",
  refLineEn: "In light of the objectives of Sharia",
} as const;
```

```ts
// apps/client/src/lib/nav-config.ts
// Menu structure from design brief §3–4. Where the brief names a page that does
// not exist yet (round 1), the link points at the nearest existing page; change
// it here when the page ships.
import { DARNOZOM_PUBLISHER } from "./site-constants";

export type NavLink = { labelAr: string; labelEn: string; href: string };
export type NavColumn = {
  titleAr?: string;
  titleEn?: string;
  href?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  links: NavLink[];
};
export type NavEntry = { key: string; labelAr: string; labelEn: string; href: string; match: string[]; columns: NavColumn[] };

const DN_BOOKS = `/services/store/books?publisher=${encodeURIComponent(DARNOZOM_PUBLISHER)}`;
const l = (labelAr: string, labelEn: string, href: string): NavLink => ({ labelAr, labelEn, href });

export const MAIN_NAV: NavEntry[] = [
  {
    key: "about", labelAr: "عن دار نظم", labelEn: "About DarNozom", href: "/about",
    match: ["/about", "/careers", "/case-studies"],
    columns: [{ links: [
      l("من نحن", "Who we are", "/about#overview"),
      l("رؤيتنا", "Our vision", "/about#vision"),
      l("رسالتنا", "Our mission", "/about#vision"),
      l("منهجنا", "Our approach", "/about#values"),
      l("قيمنا والهيكل", "Values and structure", "/about#team"),
    ] }],
  },
  {
    key: "services", labelAr: "خدماتنا", labelEn: "Services", href: "/services",
    match: ["/services", "/sectors", "/service-registration"],
    columns: [{ links: [
      l("البحوث والدراسات", "Research and Studies", "/services/research"),
      l("النشر والمعرفة", "Publishing and Knowledge", "/publications"),
      l("التدريب وبناء القدرات", "Training and Capacity Building", "/academy"),
      l("الاستشارات", "Consulting", "/services/consulting"),
      l("البرمجيات والتحول الرقمي", "Software and Digital Transformation", "/services/digital-transformation"),
    ] }],
  },
  {
    key: "knowledge", labelAr: "المعرفة والبحوث", labelEn: "Knowledge and Research", href: "/services/research",
    match: ["/services/research", "/observatory", "/articles", "/studies"],
    columns: [
      {
        titleAr: "مركز البحوث والدراسات", titleEn: "Research and Studies Center", href: "/services/research",
        subtitleAr: "الوحدات البحثية", subtitleEn: "Research units",
        links: [
          l("السياسة الشرعية والفكر الإسلامي", "Sharia Policy and Islamic Thought", "/services/research#sharia-policy"),
          l("السياسات والإدارة العامة", "Public Policy and Public Administration", "/services/research#public-policy"),
          l("القيادة والإدارة والحوكمة", "Leadership, Management and Governance", "/services/research#leadership"),
        ],
      },
      {
        titleAr: "المعرفة والمشروعات", titleEn: "Knowledge and Projects", href: "/services/research",
        links: [
          l("المرصد", "Observatory", "/observatory"),
          l("المقالات", "Articles", "/articles"),
          l("الدراسات", "Studies", "/studies"),
          l("البحوث", "Research", "/publications?tab=research"),
          l("الدوريات", "Periodicals", "/publications?tab=periodical"),
          l("الكتب", "Books", DN_BOOKS),
        ],
      },
    ],
  },
  {
    key: "academy", labelAr: "الأكاديمية", labelEn: "Academy", href: "/academy",
    match: ["/academy"],
    columns: [{ links: [
      l("السياسة الشرعية والفكر الإسلامي", "Sharia Policy and Islamic Thought", "/academy/islamic-systems"),
      l("السياسات والإدارة العامة", "Public Policy and Public Administration", "/academy"),
      l("القيادة والإدارة والحوكمة", "Leadership, Management and Governance", "/academy/professional-management"),
      l("البرامج والدورات", "Programs and Courses", "/academy/courses"),
      l("تدريب المؤسسات", "Corporate Training", "/academy/for-organizations"),
    ] }],
  },
  {
    key: "library", labelAr: "المكتبة والإصدارات", labelEn: "Library and Publications", href: "/publications",
    match: ["/publications", "/services/store"],
    columns: [
      {
        titleAr: "المكتبة", titleEn: "Library", href: "/services/store/books",
        links: [l("جميع الكتب", "All books", "/services/store/books"), l("كتب دار نظم", "DarNozom books", DN_BOOKS)],
      },
      {
        titleAr: "إصدارات دار نظم", titleEn: "DarNozom Publications", href: "/publications",
        links: [
          l("كتب", "Books", DN_BOOKS),
          l("مقالات", "Articles", "/articles"),
          l("دراسات", "Studies", "/studies"),
          l("أبحاث علمية", "Scientific research", "/publications?tab=research"),
          l("دوريات", "Periodicals", "/publications?tab=periodical"),
          l("المرصد", "Observatory", "/observatory"),
        ],
      },
    ],
  },
  {
    key: "news", labelAr: "الأخبار والفعاليات", labelEn: "News and Events", href: "/news-events",
    match: ["/news-events"],
    columns: [{ links: [
      l("أخبار المؤسسة", "DarNozom news", "/news-events?tab=news"),
      l("تدريب", "Training", "/news-events?tab=events&kind=training"),
      l("ورش", "Workshops", "/news-events?tab=events&kind=workshop"),
      l("ندوات", "Seminars", "/news-events?tab=events&kind=seminar"),
      l("مؤتمرات", "Conferences", "/news-events?tab=events&kind=conference"),
      l("معارض", "Exhibitions", "/news-events?tab=events&kind=exhibition"),
    ] }],
  },
  {
    key: "contact", labelAr: "تواصل معنا", labelEn: "Contact Us", href: "/contact",
    match: ["/contact"],
    columns: [{ links: [
      l("طلب بحث", "Research request", "/service-registration"),
      l("استشارة", "Consulting request", "/service-registration"),
      l("تدريب", "Training request", "/service-registration"),
      l("حل رقمي", "Digital solution", "/service-registration"),
      l("تعاون", "Partnership", "/contact"),
      l("استفسار عام", "General enquiry", "/contact"),
    ] }],
  },
];

export function activeNavKey(path: string): string | null {
  let best: { key: string; len: number } | null = null;
  for (const entry of MAIN_NAV) {
    for (const m of entry.match) {
      if (path === m || path.startsWith(`${m}/`)) {
        if (!best || m.length > best.len) best = { key: entry.key, len: m.length };
      }
    }
  }
  return best?.key ?? null;
}
```

- [ ] **Step 4: Move the account controls.** Create `components/nav/account-controls.tsx` and move into it, **verbatim**, these pieces from the current `site-nav.tsx`: the imports they need; `SignedIn` and `SignedOut` (lines 13–22); `NAV_LABELS` (31–56); `CartCountBadge` and `CartButton` (58–86); and `AdminMeData`, `useIsAdmin`, `UserMenu`, `SignInLink`, `AdminNavButton`, `AuthSlot`, `MobileAuthSlot`, `MobileAuthSlotInner` (166–478). Add `export` to `AuthSlot`, `MobileAuthSlot` and `CartButton`. Keep their props exactly as they are today; read each signature after moving, because the new nav passes the same props the old nav did. Within the moved code, replace any `text-primary-foreground` / `hover:text-secondary` colour classes only if they render illegibly on the navy top bar.

- [ ] **Step 5: Rewrite `site-nav.tsx`**

```tsx
// apps/client/src/components/site-nav.tsx
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { MAIN_NAV, activeNavKey, type NavEntry } from "@/lib/nav-config";
import { BRAND } from "@/lib/site-constants";
import { AuthSlot, CartButton, MobileAuthSlot } from "@/components/nav/account-controls";
import SearchSection from "@/components/search-section";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const LOGO = `${import.meta.env.BASE_URL}darnozom-n-logo-navy.png`;
const CLOSE_DELAY_MS = 200;

type Props = { mode?: "home" | "page"; theme?: string };

export default function SiteNav(_props: Props) {
  const { language, isArabic, toggleLanguage } = useLanguage();
  const [location] = useLocation();
  const active = activeNavKey(location);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  useEffect(() => {
    setOpenKey(null);
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    if (!openKey) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenKey(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openKey]);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenKey(null), CLOSE_DELAY_MS);
  };

  return (
    <>
      <div className="bg-navy-deep text-white text-sm">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6 h-11 flex items-center justify-end gap-1 sm:gap-3">
          <button type="button" onClick={() => setSearchOpen(true)} className="inline-flex items-center gap-1.5 min-h-11 px-2 hover:text-gold-light">
            <Search className="w-4 h-4" aria-hidden /> {t("البحث", "Search")}
          </button>
          <Link href="/services/store/books" className="hidden sm:inline-flex items-center min-h-11 px-2 hover:text-gold-light">
            {t("متجر الكتب", "Book store")}
          </Link>
          <CartButton language={language} />
          <div className="hidden lg:block"><AuthSlot /></div>
          <button type="button" onClick={toggleLanguage} className="min-h-11 px-2 font-semibold hover:text-gold-light" lang={isArabic ? "en" : "ar"}>
            {isArabic ? "English" : "العربية"}
          </button>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white border-b border-line">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6 h-20 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 shrink-0" aria-label={t(BRAND.nameAr, BRAND.nameEn)}>
            <img src={LOGO} alt="" className="h-11 w-auto" />
            <span className="flex flex-col leading-tight">
              <span className="text-xl font-bold text-navy">{t(BRAND.nameAr, BRAND.nameEn)}</span>
              <span className="text-xs text-ink-muted">{t(BRAND.taglineAr, BRAND.taglineEn)}</span>
            </span>
          </Link>

          <nav ref={navRef} aria-label={t("القائمة الرئيسية", "Main navigation")} className="hidden lg:flex flex-1 items-stretch justify-center h-full">
            {MAIN_NAV.map((entry) => (
              <DesktopItem
                key={entry.key}
                entry={entry}
                isArabic={isArabic}
                isActive={active === entry.key}
                isOpen={openKey === entry.key}
                onOpen={() => {
                  cancelClose();
                  setOpenKey(entry.key);
                }}
                onToggle={() => setOpenKey((k) => (k === entry.key ? null : entry.key))}
                onClose={() => setOpenKey(null)}
                onLeave={scheduleClose}
              />
            ))}
          </nav>

          <span className="hidden xl:block ms-auto text-sm font-bold tracking-[0.35em] text-navy" dir="ltr">DARNOZOM</span>

          <button
            type="button"
            className="lg:hidden ms-auto inline-flex items-center justify-center w-11 h-11 text-navy"
            onClick={() => setMobileOpen(true)}
            aria-label={t("فتح القائمة", "Open menu")}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side={isArabic ? "right" : "left"} className="w-[88vw] max-w-sm overflow-y-auto bg-white p-0">
          <SheetTitle className="sr-only">{t("القائمة", "Menu")}</SheetTitle>
          <div className="flex items-center justify-between p-4 border-b border-line">
            <span className="font-bold text-navy">{t(BRAND.nameAr, BRAND.nameEn)}</span>
            <button type="button" onClick={() => setMobileOpen(false)} aria-label={t("إغلاق", "Close")} className="w-11 h-11 inline-flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <button type="button" onClick={() => { setMobileOpen(false); setSearchOpen(true); }} className="w-full flex items-center gap-2 px-4 min-h-12 border-b border-line text-ink">
            <Search className="w-4 h-4" /> {t("ابحث في دار نظم", "Search DarNozom")}
          </button>
          {MAIN_NAV.map((entry) => (
            <MobileItem key={entry.key} entry={entry} isArabic={isArabic} isActive={active === entry.key} />
          ))}
          <div className="p-4"><MobileAuthSlot /></div>
        </SheetContent>
      </Sheet>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogTitle>{t("ابحث في دار نظم", "Search DarNozom")}</DialogTitle>
          <SearchSection />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DesktopItem({
  entry, isArabic, isActive, isOpen, onOpen, onToggle, onClose, onLeave,
}: {
  entry: NavEntry; isArabic: boolean; isActive: boolean; isOpen: boolean;
  onOpen: () => void; onToggle: () => void; onClose: () => void; onLeave: () => void;
}) {
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const label = isArabic ? entry.labelAr : entry.labelEn;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      toggleRef.current?.focus();
    }
  };
  return (
    <div className="relative flex items-center" onMouseEnter={onOpen} onMouseLeave={onLeave} onKeyDown={onKeyDown}>
      <Link
        href={entry.href}
        aria-current={isActive ? "page" : undefined}
        className={`px-2 xl:px-3 h-full inline-flex items-center text-[15px] font-semibold border-b-2 transition-colors ${
          isActive ? "text-navy border-gold" : "text-ink border-transparent hover:text-navy"
        }`}
      >
        {label}
      </Link>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isArabic ? `فتح قائمة ${entry.labelAr}` : `Open ${entry.labelEn} menu`}
        onClick={onToggle}
        className="w-6 h-11 inline-flex items-center justify-center text-ink-muted hover:text-navy"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <div
        id={panelId}
        hidden={!isOpen}
        className="absolute top-full start-0 mt-px bg-white border border-line shadow-lg rounded-[4px] p-5 z-50 motion-safe:animate-in motion-safe:fade-in-0"
      >
        <div className={`grid gap-8 ${entry.columns.length > 1 ? "grid-cols-2 min-w-[520px]" : "min-w-[260px]"}`}>
          {entry.columns.map((col, i) => (
            <div key={i}>
              {col.titleAr && (
                <Link href={col.href ?? entry.href} className="block font-bold text-navy mb-1 hover:underline">
                  {isArabic ? col.titleAr : col.titleEn}
                </Link>
              )}
              {col.subtitleAr && <p className="text-xs text-gold mb-2">{isArabic ? col.subtitleAr : col.subtitleEn}</p>}
              <ul className="space-y-0.5">
                {col.links.map((link) => (
                  <li key={link.href + link.labelAr}>
                    <Link href={link.href} className="block py-2 text-[15px] text-ink hover:text-navy">
                      {isArabic ? link.labelAr : link.labelEn}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileItem({ entry, isArabic, isActive }: { entry: NavEntry; isArabic: boolean; isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="border-b border-line">
      <div className="flex items-center">
        <Link href={entry.href} aria-current={isActive ? "page" : undefined} className={`flex-1 px-4 min-h-12 flex items-center font-semibold ${isActive ? "text-navy" : "text-ink"}`}>
          {isArabic ? entry.labelAr : entry.labelEn}
        </Link>
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)} className="w-12 h-12 inline-flex items-center justify-center text-ink-muted" aria-label={isArabic ? `توسيع ${entry.labelAr}` : `Expand ${entry.labelEn}`}>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <div id={panelId} hidden={!open} className="pb-2 bg-ivory">
        {entry.columns.map((col, i) => (
          <div key={i} className="px-4 pt-2">
            {col.titleAr && <p className="text-sm font-bold text-navy">{isArabic ? col.titleAr : col.titleEn}</p>}
            {col.links.map((link) => (
              <Link key={link.href + link.labelAr} href={link.href} className="block ps-3 min-h-11 py-2.5 text-sm text-ink">
                {isArabic ? link.labelAr : link.labelEn}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter @workspace/client exec vitest run src/lib/nav-config.test.ts src/components/site-nav.test.tsx && pnpm --filter @workspace/client typecheck`
Expected: PASS; typecheck exit 0. If `memoryLocation` fails to import, check `node_modules/wouter/types/memory-location.d.ts` for the export name and use that.

- [ ] **Step 7: Manual check**

With `pnpm dev:client` running, check desktop at 1280px: the logo, name and 7 items fit on one row; hovering opens a menu, and moving the mouse into the panel keeps it open. Check mobile at 375px: the menu button opens the sheet and items expand. Switch to English: the order flips and the labels change.

- [ ] **Step 8: Commit**

```bash
git add apps/client/src/lib/site-constants.ts apps/client/src/lib/nav-config.ts apps/client/src/lib/nav-config.test.ts apps/client/src/components/nav apps/client/src/components/site-nav.tsx apps/client/src/components/site-nav.test.tsx
git commit -m "feat(client): new header with seven-item menu and accessible dropdowns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Client CMS data layer

**Files:**
- Create: `apps/client/src/lib/cms-types.ts`, `apps/client/src/lib/cms-api.ts`, `apps/client/src/lib/cms-labels.ts`, `apps/client/src/lib/cms-sections.ts`, `apps/client/src/lib/darnozom-books.ts`
- Test: `apps/client/src/lib/cms-labels.test.ts`, `apps/client/src/lib/cms-api.test.ts`, `apps/client/src/lib/darnozom-books.test.ts`

**Interfaces:**
- Consumes: API from Tasks 3–5; `searchStoreBooks`, `listProductsByIds` from `lib/book-catalog.ts`; `DARNOZOM_PUBLISHER`.
- Produces:
  - `cms-types.ts`: `ContentType`, `ContentStatus`, `ContentArea`, `CmsLink`, `ContentItem`, `ListResponse`, `ItemResponse = { item: ContentItem; related: ContentItem[] }`, `FeaturedCard`, `HomeResponse`, `ListParams`
  - `cms-api.ts`: `class NotFoundError`, `buildListUrl(p: ListParams): string`, `useCmsList(p, opts?: { enabled?: boolean })`, `useCmsItem(slug: string, preview: boolean)`, `useCmsHome()`
  - `cms-labels.ts`: `AREA_LABELS`, `REGION_LABELS`, `pickLang(item, field, lang)`, `typeBadge(type, details, lang)`, `ctaLabel(type, details, lang)`, `contentPath(type, slug)`, `formatDate(iso, lang)`, `eventCta(details, lang): { label: string; href: string | null }`
  - `cms-sections.ts`: `SectionKey`, `SectionTab`, `SectionConfig`, `SECTIONS`
  - `darnozom-books.ts`: `BookCard`, `PublicationCardData`, `toBookCard(p)`, `useDarNozomBooks(limit, opts?)`, `useStoreBook(id)`, `mergePublications(items, books, n)`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/client/src/lib/cms-labels.test.ts
import { describe, expect, it } from "vitest";
import { contentPath, ctaLabel, eventCta, pickLang, typeBadge } from "./cms-labels";

describe("cms labels", () => {
  it("falls back to Arabic when English is empty", () => {
    const item = { titleAr: "عنوان", titleEn: "" } as any;
    expect(pickLang(item, "title", "en")).toBe("عنوان");
    expect(pickLang({ titleAr: "ع", titleEn: "Title" } as any, "title", "en")).toBe("Title");
  });
  it("badges publications and events by kind", () => {
    expect(typeBadge("publication", { kind: "periodical" }, "ar")).toBe("دورية");
    expect(typeBadge("event", { kind: "workshop" }, "ar")).toBe("ورشة عمل");
    expect(typeBadge("news", {}, "en")).toBe("News");
  });
  it("uses the brief's CTA verbs", () => {
    expect(ctaLabel("article", {}, "ar")).toBe("اقرأ المقال");
    expect(ctaLabel("publication", { kind: "report" }, "ar")).toBe("اطّلع على التقرير");
    expect(ctaLabel("publication", { kind: "periodical" }, "ar")).toBe("تصفح الدورية");
    expect(ctaLabel("observatory", {}, "ar")).toBe("اقرأ الموجز");
  });
  it("routes news and events to /news-events", () => {
    expect(contentPath("event", "x")).toBe("/news-events/x");
    expect(contentPath("study", "y")).toBe("/studies/y");
  });
  it("picks the event CTA from registration and date", () => {
    expect(eventCta({ registration: "interest" }, "ar").label).toBe("سجّل اهتمامك");
    expect(eventCta({ registration: "open", registrationUrl: "https://r.x", startsAt: "2099-01-01T00:00:00Z" }, "ar")).toEqual({ label: "سجّل للمشاركة", href: "https://r.x" });
    expect(eventCta({ registration: "open", startsAt: "2001-01-01T00:00:00Z" }, "ar").label).toBe("اطّلع على ملخص الفعالية");
  });
});
```

```ts
// apps/client/src/lib/cms-api.test.ts
import { describe, expect, it } from "vitest";
import { buildListUrl } from "./cms-api";

describe("buildListUrl", () => {
  it("joins types and drops empty params", () => {
    expect(buildListUrl({ types: ["news", "event"], area: "", q: "", page: 1, pageSize: 12 })).toBe(
      "/api/cms/items?type=news%2Cevent&page=1&pageSize=12",
    );
  });
  it("encodes search text", () => {
    expect(buildListUrl({ types: ["article"], q: "الحوكمة" })).toContain("q=%D8%A7");
  });
});
```

```ts
// apps/client/src/lib/darnozom-books.test.ts
import { describe, expect, it } from "vitest";
import { mergePublications } from "./darnozom-books";

const pub = (slug: string, date: string, kind = "report") =>
  ({ id: slug, type: "publication", slug, titleAr: slug, titleEn: "", summaryAr: "", summaryEn: "", coverImageUrl: "", publishedAt: date, details: { kind } }) as any;
const book = (id: string, date: string) => ({ id, title: id, imageUrl: "", href: `/services/store/books/${id}`, createdAt: date });

describe("mergePublications", () => {
  it("interleaves books and admin publications newest first and caps the count", () => {
    const out = mergePublications(
      [pub("r1", "2026-01-05"), pub("p1", "2026-01-01", "periodical")],
      [book("b1", "2026-01-03"), book("b2", "2026-01-06")],
      3,
    );
    expect(out.map((o) => o.key)).toEqual(["book:b2", "pub:r1", "book:b1"]);
    expect(out[0].kind).toBe("book");
    expect(out[1].href).toBe("/publications/r1");
  });
  it("works with no books (Medusa down)", () => {
    expect(mergePublications([pub("r1", "2026-01-05")], [], 4)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @workspace/client exec vitest run src/lib/cms-labels.test.ts src/lib/cms-api.test.ts src/lib/darnozom-books.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

```ts
// apps/client/src/lib/cms-types.ts
export type ContentType = "observatory" | "article" | "study" | "publication" | "news" | "event";
export type ContentStatus = "draft" | "review" | "published" | "archived";
export type ContentArea = "sharia_policy" | "public_policy_admin" | "leadership_governance";
export type Lang = "ar" | "en";
export type CmsLink = { title: string; url: string };

export interface ContentItem {
  id: number;
  type: ContentType;
  slug: string;
  status: ContentStatus;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  bodyAr: string;
  bodyEn: string;
  coverImageUrl: string;
  area: ContentArea | null;
  authorAr: string;
  authorEn: string;
  isExternal: boolean;
  externalUrl: string;
  publishedAt: string | null;
  details: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse { items: ContentItem[]; total: number; page: number; pageSize: number }
export interface ItemResponse { item: ContentItem; related: ContentItem[] }

export interface FeaturedCard {
  id: number;
  sourceKind: "content" | "book" | "custom";
  medusaProductId: string | null;
  contentType: ContentType | null;
  contentKind: string | null;
  badgeAr: string; badgeEn: string;
  titleAr: string; titleEn: string;
  summaryAr: string; summaryEn: string;
  imageUrl: string;
  ctaLabelAr: string; ctaLabelEn: string;
  href: string;
}

export interface HomeResponse {
  featured: FeaturedCard[];
  observatory: { lead: ContentItem | null; others: ContentItem[] };
  articles: ContentItem[];
  studies: ContentItem[];
  publications: ContentItem[];
  newsEvents: ContentItem[];
}

export interface ListParams {
  types: ContentType[];
  area?: string;
  kind?: string;
  region?: string;
  when?: "upcoming" | "past" | "";
  q?: string;
  page?: number;
  pageSize?: number;
}
```

```ts
// apps/client/src/lib/cms-api.ts
import { useQuery } from "@tanstack/react-query";
import type { HomeResponse, ItemResponse, ListParams, ListResponse } from "./cms-types";

export class NotFoundError extends Error {
  constructor() {
    super("Not found");
  }
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" });
  if (r.status === 404) throw new NotFoundError();
  if (!r.ok) throw new Error(`Request failed (${r.status})`);
  return r.json() as Promise<T>;
}

export function buildListUrl(p: ListParams): string {
  const qs = new URLSearchParams();
  qs.set("type", p.types.join(","));
  for (const key of ["area", "kind", "region", "when", "q"] as const) {
    const v = p[key];
    if (v) qs.set(key, v);
  }
  if (p.page) qs.set("page", String(p.page));
  if (p.pageSize) qs.set("pageSize", String(p.pageSize));
  return `/api/cms/items?${qs.toString()}`;
}

export function useCmsList(p: ListParams, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["cms", "list", p],
    queryFn: () => getJson<ListResponse>(buildListUrl(p)),
    enabled: opts.enabled ?? true,
    placeholderData: (prev) => prev,
  });
}

export function useCmsItem(slug: string, preview: boolean) {
  return useQuery({
    queryKey: ["cms", "item", slug, preview],
    queryFn: () =>
      getJson<ItemResponse>(
        preview ? `/api/admin/cms/preview/${encodeURIComponent(slug)}` : `/api/cms/items/by-slug/${encodeURIComponent(slug)}`,
      ),
    retry: (count, err) => !(err instanceof NotFoundError) && count < 2,
  });
}

export function useCmsHome() {
  return useQuery({ queryKey: ["cms", "home"], queryFn: () => getJson<HomeResponse>("/api/cms/home") });
}
```

```ts
// apps/client/src/lib/cms-labels.ts
import type { ContentArea, ContentItem, ContentType, Lang } from "./cms-types";

type Pair = { ar: string; en: string };
const pair = (ar: string, en: string): Pair => ({ ar, en });

export const AREA_LABELS: Record<ContentArea, Pair> = {
  sharia_policy: pair("السياسة الشرعية والفكر الإسلامي", "Sharia Policy and Islamic Thought"),
  public_policy_admin: pair("السياسات والإدارة العامة", "Public Policy and Public Administration"),
  leadership_governance: pair("القيادة والإدارة والحوكمة", "Leadership, Management and Governance"),
};

export const REGION_LABELS: Record<string, Pair> = {
  egypt: pair("مصر", "Egypt"),
  middle_east: pair("الشرق الأوسط", "Middle East"),
  islamic_world: pair("العالم الإسلامي", "Islamic World"),
  rest_of_world: pair("بقية العالم", "Rest of the World"),
};

export const OBSERVATORY_KINDS: Record<string, Pair> = {
  daily_brief: pair("الموجز اليومي", "Daily Brief"),
  weekly_review: pair("المراجعة الأسبوعية", "Weekly Review"),
  research_output: pair("الإنتاج الفكري والبحثي", "Research Output"),
  follow_up_file: pair("ملفات المتابعة", "Follow-up Files"),
};

export const PUBLICATION_KINDS: Record<string, Pair> = {
  book: pair("كتاب", "Book"),
  report: pair("تقرير", "Report"),
  periodical: pair("دورية", "Periodical"),
  research: pair("بحث علمي", "Research"),
};

export const EVENT_KINDS: Record<string, Pair> = {
  training: pair("تدريب", "Training"),
  workshop: pair("ورشة عمل", "Workshop"),
  seminar: pair("ندوة", "Seminar"),
  conference: pair("مؤتمر", "Conference"),
  exhibition: pair("معرض", "Exhibition"),
};

const TYPE_BADGES: Record<ContentType, Pair> = {
  observatory: pair("موجز المرصد", "Observatory"),
  article: pair("مقال", "Article"),
  study: pair("دراسة", "Study"),
  publication: pair("إصدار", "Publication"),
  news: pair("خبر", "News"),
  event: pair("فعالية", "Event"),
};

const CTAS: Record<string, Pair> = {
  observatory: pair("اقرأ الموجز", "Read the brief"),
  article: pair("اقرأ المقال", "Read article"),
  study: pair("اطّلع على الدراسة", "View study"),
  report: pair("اطّلع على التقرير", "View report"),
  periodical: pair("تصفح الدورية", "Browse periodical"),
  research: pair("عرض البحث", "View research"),
  book: pair("تفاصيل الكتاب", "Book details"),
  news: pair("تفاصيل الخبر", "News details"),
  event: pair("تفاصيل الفعالية", "Event details"),
};

export function pickLang(item: Record<string, any>, field: string, lang: Lang): string {
  const ar = item[`${field}Ar`] ?? "";
  const en = item[`${field}En`] ?? "";
  return lang === "en" && en ? en : ar;
}

export function typeBadge(type: ContentType, details: Record<string, any>, lang: Lang): string {
  if (type === "publication" && PUBLICATION_KINDS[details?.kind]) return PUBLICATION_KINDS[details.kind][lang];
  if (type === "event" && EVENT_KINDS[details?.kind]) return EVENT_KINDS[details.kind][lang];
  return TYPE_BADGES[type][lang];
}

export function ctaLabel(type: ContentType | "book", details: Record<string, any>, lang: Lang): string {
  if (type === "publication") return (CTAS[details?.kind] ?? CTAS.report)[lang];
  return CTAS[type][lang];
}

const BASE: Record<ContentType, string> = {
  observatory: "/observatory",
  article: "/articles",
  study: "/studies",
  publication: "/publications",
  news: "/news-events",
  event: "/news-events",
};

export function contentPath(type: ContentType, slug: string): string {
  return `${BASE[type]}/${slug}`;
}

export function formatDate(iso: string | null | undefined, lang: Lang, withTime = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function eventCta(details: Record<string, any>, lang: Lang): { label: string; href: string | null } {
  const past = details?.startsAt ? Date.parse(details.startsAt) < Date.now() : false;
  if (past) return { label: lang === "ar" ? "اطّلع على ملخص الفعالية" : "View event summary", href: null };
  if (details?.registration === "open") {
    return { label: lang === "ar" ? "سجّل للمشاركة" : "Register to attend", href: details.registrationUrl || "/contact" };
  }
  if (details?.registration === "closed") return { label: lang === "ar" ? "التسجيل مغلق" : "Registration closed", href: null };
  return { label: lang === "ar" ? "سجّل اهتمامك" : "Register your interest", href: "/contact" };
}

export function itemDate(item: Pick<ContentItem, "type" | "details" | "publishedAt">): string | null {
  return item.type === "event" && item.details?.startsAt ? item.details.startsAt : item.publishedAt;
}
```

```ts
// apps/client/src/lib/cms-sections.ts
import type { ContentType } from "./cms-types";
import { EVENT_KINDS } from "./cms-labels";

export type SectionKey = "observatory" | "articles" | "studies" | "publications" | "news-events";
export interface SectionTab {
  value: string;
  labelAr: string;
  labelEn: string;
  types: ContentType[];
  kind?: string;
  books?: boolean;
  defaultWhen?: "upcoming" | "past";
  subKinds?: Record<string, { ar: string; en: string }>;
}
export interface SectionConfig {
  key: SectionKey;
  path: string;
  types: ContentType[];
  titleAr: string; titleEn: string;
  introAr: string; introEn: string;
  tabs?: SectionTab[];
  filters: ("area" | "region" | "when")[];
}

export const SECTIONS: Record<SectionKey, SectionConfig> = {
  observatory: {
    key: "observatory", path: "/observatory", types: ["observatory"],
    titleAr: "مرصد دار نظم للشأن العام", titleEn: "DarNozom Public Affairs Observatory",
    introAr: "نتابع المستجدات والإنتاج الفكري والبحثي في مجالات دار نظم، ونقدّم رصدًا منظمًا يساعد على فهم القضايا وتحديد ما يستحق القراءة والتحليل والمتابعة.",
    introEn: "We follow developments and new intellectual and research output in DarNozom's fields, offering structured monitoring that helps understand issues and identify what deserves reading, analysis and follow-up.",
    tabs: [
      { value: "all", labelAr: "الكل", labelEn: "All", types: ["observatory"] },
      { value: "daily_brief", labelAr: "الموجز اليومي", labelEn: "Daily Brief", types: ["observatory"], kind: "daily_brief" },
      { value: "weekly_review", labelAr: "المراجعة الأسبوعية", labelEn: "Weekly Review", types: ["observatory"], kind: "weekly_review" },
      { value: "research_output", labelAr: "الإنتاج الفكري والبحثي", labelEn: "Research Output", types: ["observatory"], kind: "research_output" },
      { value: "follow_up_file", labelAr: "ملفات المتابعة", labelEn: "Follow-up Files", types: ["observatory"], kind: "follow_up_file" },
    ],
    filters: ["area", "region"],
  },
  articles: {
    key: "articles", path: "/articles", types: ["article"],
    titleAr: "المقالات", titleEn: "Articles",
    introAr: "أفكار وتحليلات معمقة في قضايا السياسات والمؤسسات.", introEn: "In-depth ideas and analysis on policy and institutional issues.",
    filters: ["area"],
  },
  studies: {
    key: "studies", path: "/studies", types: ["study"],
    titleAr: "الدراسات", titleEn: "Studies",
    introAr: "دراسات متخصصة تسهم في فهم الواقع واستشراف المستقبل.", introEn: "Specialised studies that help understand the present and anticipate the future.",
    filters: ["area"],
  },
  publications: {
    key: "publications", path: "/publications", types: ["publication"],
    titleAr: "المكتبة والإصدارات", titleEn: "Library and Publications",
    introAr: "كتب وتقارير ودوريات وأبحاث في السياسات والإدارة والحوكمة.", introEn: "Books, reports, periodicals and research on policy, administration and governance.",
    tabs: [
      { value: "all", labelAr: "الكل", labelEn: "All", types: ["publication"] },
      { value: "books", labelAr: "كتب", labelEn: "Books", types: ["publication"], books: true },
      { value: "report", labelAr: "تقارير", labelEn: "Reports", types: ["publication"], kind: "report" },
      { value: "periodical", labelAr: "دوريات", labelEn: "Periodicals", types: ["publication"], kind: "periodical" },
      { value: "research", labelAr: "أبحاث علمية", labelEn: "Research", types: ["publication"], kind: "research" },
    ],
    filters: ["area"],
  },
  "news-events": {
    key: "news-events", path: "/news-events", types: ["news", "event"],
    titleAr: "أخبار وفعاليات دار نظم", titleEn: "DarNozom News and Events",
    introAr: "تابع أخبار المؤسسة وأنشطتها العلمية والمهنية، واطّلع على فرص المشاركة في التدريب وورش العمل والندوات والمؤتمرات والمعارض.",
    introEn: "Follow DarNozom's news and scholarly and professional activities, and discover opportunities to join training, workshops, seminars, conferences and exhibitions.",
    tabs: [
      { value: "news", labelAr: "الأخبار", labelEn: "News", types: ["news"] },
      { value: "events", labelAr: "الفعاليات", labelEn: "Events", types: ["event"], defaultWhen: "upcoming", subKinds: EVENT_KINDS },
    ],
    filters: ["when"],
  },
};
```

```ts
// apps/client/src/lib/darnozom-books.ts
import { useQuery } from "@tanstack/react-query";
import type { HttpTypes } from "@medusajs/types";
import { listProductsByIds, searchStoreBooks } from "./book-catalog";
import { DARNOZOM_PUBLISHER } from "./site-constants";
import type { ContentItem } from "./cms-types";
import { contentPath } from "./cms-labels";

export interface BookCard { id: string; title: string; imageUrl: string; href: string; createdAt: string | null }

export interface PublicationCardData {
  key: string;
  kind: "book" | "report" | "periodical" | "research";
  titleAr: string; titleEn: string;
  summaryAr: string; summaryEn: string;
  imageUrl: string;
  href: string;
  date: string | null;
}

export function toBookCard(p: HttpTypes.StoreProduct): BookCard {
  return {
    id: p.id,
    title: p.title ?? "",
    imageUrl: p.thumbnail ?? p.images?.[0]?.url ?? "",
    href: `/services/store/books/${p.id}`,
    createdAt: (p.created_at as string | null | undefined) ?? null,
  };
}

export function useDarNozomBooks(limit: number, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["cms", "dn-books", limit],
    queryFn: async () => (await searchStoreBooks({ publisher: DARNOZOM_PUBLISHER, limit })).products.map(toBookCard),
    enabled: opts.enabled ?? true,
    retry: 1,
    staleTime: 5 * 60_000,
  });
}

export function useStoreBook(id: string | null) {
  return useQuery({
    queryKey: ["cms", "book", id],
    queryFn: async () => {
      const [p] = await listProductsByIds([id!]);
      return p ? toBookCard(p) : null;
    },
    enabled: !!id,
    retry: 1,
  });
}

export function mergePublications(items: ContentItem[], books: BookCard[], n: number): PublicationCardData[] {
  const fromItems: PublicationCardData[] = items.map((i) => ({
    key: `pub:${i.slug}`,
    kind: (i.details?.kind ?? "report") as PublicationCardData["kind"],
    titleAr: i.titleAr, titleEn: i.titleEn, summaryAr: i.summaryAr, summaryEn: i.summaryEn,
    imageUrl: i.coverImageUrl, href: contentPath("publication", i.slug), date: i.publishedAt,
  }));
  const fromBooks: PublicationCardData[] = books.map((b) => ({
    key: `book:${b.id}`, kind: "book",
    titleAr: b.title, titleEn: b.title, summaryAr: "", summaryEn: "",
    imageUrl: b.imageUrl, href: b.href, date: b.createdAt,
  }));
  return [...fromItems, ...fromBooks]
    .sort((a, b) => (Date.parse(b.date ?? "") || 0) - (Date.parse(a.date ?? "") || 0))
    .slice(0, n);
}
```

- [ ] **Step 4: Verify the publisher value.** Run `grep -rn "publisher" apps/medusa/src/api/store/books/search/route.ts` to see how the filter matches (exact or partial). Then, with Medusa running, open `/services/store/books` and look at the Publisher facet options. If Dar Nozom's books use a different spelling (e.g. "دار نظم للنشر"), set `DARNOZOM_PUBLISHER` in `site-constants.ts` to that exact value.

- [ ] **Step 5: Run the tests**

Run: `pnpm --filter @workspace/client exec vitest run src/lib && pnpm --filter @workspace/client typecheck`
Expected: PASS; exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/lib/cms-*.ts apps/client/src/lib/darnozom-books*.ts apps/client/src/lib/site-constants.ts
git commit -m "feat(client): CMS types, query hooks, labels, sections and book merging

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Footer and shared content components

**Files:**
- Rewrite: `apps/client/src/components/site-footer.tsx`
- Create: `apps/client/src/components/content/category-badge.tsx`, `content-card.tsx`, `section-header.tsx`, `rich-html.tsx`, `newsletter-block.tsx`, `page-shell.tsx`
- Test: `apps/client/src/components/site-footer.test.tsx`, `apps/client/src/components/content/content-card.test.tsx`, `apps/client/src/components/content/newsletter-block.test.tsx`

**Interfaces:**
- Consumes: `BRAND`, `CONTACT`, label helpers, `ContentItem`.
- Produces:
  - `SiteFooter({ tone }: { tone?: "dark" | "light" })` (named export, as today; default `"dark"`)
  - `CategoryBadge({ children })`
  - `ContentCard({ item, variant }: { item: ContentItem; variant?: "vertical" | "horizontal" | "compact" })`
  - `SectionHeader({ title, subtitle, href, linkLabel })`
  - `RichHtml({ html })`
  - `NewsletterBlock({ id? })` (anchor id defaults to `"newsletter"`)
  - `PageShell({ children, footerTone })` = `SiteNav` + `<main>` + `SiteFooter`

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/client/src/components/site-footer.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true }) }));
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("renders the four columns in the brief's order", () => {
    render(<SiteFooter />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["دار نظم", "المعرفة والتعلم", "الخدمات والحلول", "تواصل معنا"]);
    expect(screen.getByText("في ضوء مقاصد الشريعة")).toBeTruthy();
    expect(screen.getByText("info@darnozom.com")).toBeTruthy();
  });
  it("switches surface for the light tone", () => {
    const { container, rerender } = render(<SiteFooter />);
    expect(container.querySelector("footer")!.className).toContain("bg-navy-deep");
    rerender(<SiteFooter tone="light" />);
    expect(container.querySelector("footer")!.className).toContain("bg-ivory");
  });
});
```

```tsx
// apps/client/src/components/content/content-card.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true }) }));
import { ContentCard } from "./content-card";

const base = {
  id: 1, slug: "s", status: "published", titleAr: "عنوان", titleEn: "", summaryAr: "ملخص", summaryEn: "",
  bodyAr: "", bodyEn: "", coverImageUrl: "/seed/x.webp", area: "sharia_policy", authorAr: "دار نظم", authorEn: "",
  isExternal: false, externalUrl: "", publishedAt: "2026-10-01T00:00:00Z", details: {}, createdAt: "", updatedAt: "",
} as const;

describe("ContentCard", () => {
  it("shows badge, title, CTA verb and links to the detail page", () => {
    render(<ContentCard item={{ ...base, type: "article" } as any} />);
    expect(screen.getByText("مقال")).toBeTruthy();
    const link = screen.getByRole("link", { name: /اقرأ المقال/ });
    expect(link.getAttribute("href")).toBe("/articles/s");
  });
  it("labels external references", () => {
    render(<ContentCard item={{ ...base, type: "observatory", isExternal: true, details: { kind: "daily_brief" } } as any} />);
    expect(screen.getByText("مرجع من جهة أخرى")).toBeTruthy();
  });
  it("shows an event's kind and 'date to be announced' when it has no start time", () => {
    render(<ContentCard item={{ ...base, type: "event", details: { kind: "seminar" } } as any} />);
    expect(screen.getByText("ندوة")).toBeTruthy();
    expect(screen.getByText("الموعد يُعلن لاحقًا")).toBeTruthy();
  });
});
```

```tsx
// apps/client/src/components/content/newsletter-block.test.tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true }) }));
const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
import { NewsletterBlock } from "./newsletter-block";

describe("NewsletterBlock", () => {
  it("requires consent and never claims a subscription", () => {
    render(<NewsletterBlock />);
    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), { target: { value: "a@b.co" } });
    fireEvent.click(screen.getByRole("button", { name: "اشترك في النشرة" }));
    expect(screen.getByText("يرجى الموافقة على استلام الرسائل")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "اشترك في النشرة" }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "النشرة البريدية قيد الإطلاق" }));
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @workspace/client exec vitest run src/components/site-footer.test.tsx src/components/content`
Expected: FAIL — modules missing; the old footer has no `h2`s.

- [ ] **Step 3: Implement the components**

```tsx
// apps/client/src/components/content/category-badge.tsx
import type { ReactNode } from "react";

export function CategoryBadge({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "outline" }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-xs font-semibold leading-6 rounded-[2px] ${
        tone === "gold" ? "bg-gold-light text-ink" : "border border-line text-ink-muted bg-white"
      }`}
    >
      {children}
    </span>
  );
}
```

```tsx
// apps/client/src/components/content/section-header.tsx
import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export function SectionHeader({ title, subtitle, href, linkLabel, as = "h2" }: {
  title: string; subtitle?: string; href?: string; linkLabel?: string; as?: "h1" | "h2";
}) {
  const { isArabic } = useLanguage();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const H = as;
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <H className="text-[25px] lg:text-[30px] font-bold text-navy leading-tight">{title}</H>
        {subtitle && <p className="text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link href={href} className="shrink-0 inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-navy hover:text-gold">
          {linkLabel} <Arrow className="w-4 h-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
```

```tsx
// apps/client/src/components/content/rich-html.tsx
// HTML is sanitised server-side (apps/api/src/lib/cms/sanitize.ts) before storage.
export function RichHtml({ html, className = "" }: { html: string; className?: string }) {
  if (!html) return null;
  return (
    <div
      className={`prose prose-lg max-w-none prose-headings:text-navy prose-headings:font-bold prose-a:text-navy prose-blockquote:border-gold prose-p:text-ink ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

```tsx
// apps/client/src/components/content/content-card.tsx
import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { ContentItem } from "@/lib/cms-types";
import { AREA_LABELS, contentPath, ctaLabel, formatDate, itemDate, pickLang, typeBadge } from "@/lib/cms-labels";
import { CategoryBadge } from "./category-badge";

type Variant = "vertical" | "horizontal" | "compact";

export function ContentCard({ item, variant = "vertical" }: { item: ContentItem; variant?: Variant }) {
  const { language: lang, isArabic } = useLanguage();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const href = contentPath(item.type, item.slug);
  const title = pickLang(item, "title", lang);
  const summary = pickLang(item, "summary", lang);
  const author = pickLang(item, "author", lang);
  const date = itemDate(item);
  const dateText = item.type === "event" && !item.details?.startsAt
    ? (isArabic ? "الموعد يُعلن لاحقًا" : "Date to be announced")
    : formatDate(date, lang);

  const image = item.coverImageUrl ? (
    <img
      src={item.coverImageUrl}
      alt=""
      loading="lazy"
      className={
        variant === "vertical" ? "w-full aspect-[16/9] object-cover"
        : variant === "horizontal" ? "w-2/5 shrink-0 object-cover min-h-[160px]"
        : "w-28 h-20 shrink-0 object-cover"
      }
    />
  ) : null;

  return (
    <article className={`group bg-white border border-line rounded-[4px] overflow-hidden flex ${variant === "vertical" ? "flex-col" : "flex-row"} hover:shadow-md transition-shadow`}>
      {variant !== "compact" && image}
      <div className="flex-1 p-4 lg:p-5 flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge>{typeBadge(item.type, item.details, lang)}</CategoryBadge>
          {item.isExternal && <CategoryBadge tone="outline">{isArabic ? "مرجع من جهة أخرى" : "External reference"}</CategoryBadge>}
          {item.area && variant !== "compact" && (
            <span className="text-xs text-ink-muted">{AREA_LABELS[item.area][lang]}</span>
          )}
        </div>
        <h3 className={`font-bold text-navy leading-snug ${variant === "compact" ? "text-base" : "text-lg"}`}>
          <Link href={href} className="hover:underline">{title}</Link>
        </h3>
        {summary && <p className={`text-sm text-ink-muted ${variant === "compact" ? "line-clamp-2" : "line-clamp-3"}`}>{summary}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-xs text-ink-muted">
          <span>{[author, dateText].filter(Boolean).join(" · ")}</span>
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-navy min-h-11">
            {ctaLabel(item.type, item.details, lang)} <Arrow className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </div>
      {variant === "compact" && image}
    </article>
  );
}
```

```tsx
// apps/client/src/components/content/newsletter-block.tsx
import { useState } from "react";
import { Mail } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useToast } from "@/hooks/use-toast";

// Round 1: UI only. No email is stored or sent until the newsletter backend ships.
export function NewsletterBlock({ id = "newsletter" }: { id?: string }) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t("يرجى إدخال بريد إلكتروني صحيح", "Please enter a valid email"));
    if (!consent) return setError(t("يرجى الموافقة على استلام الرسائل", "Please agree to receive emails"));
    setError("");
    toast({
      title: t("النشرة البريدية قيد الإطلاق", "The newsletter is launching soon"),
      description: t("سنفعّل الاشتراك قريبًا، ولم يُحفظ بريدك بعد.", "Subscriptions open soon; your email has not been saved yet."),
    });
  };

  return (
    <section id={id} className="mx-auto max-w-[1200px] px-5 lg:px-6 my-12 scroll-mt-28">
      <div className="bg-navy text-white rounded-[4px] p-6 lg:p-10 grid gap-6 lg:grid-cols-2 lg:items-center">
        <div className="flex items-start gap-4">
          <Mail className="w-10 h-10 text-gold-light shrink-0" aria-hidden />
          <div>
            <h2 className="text-2xl lg:text-[28px] font-bold">{t("كل جديد من دار نظم يصلك على بريدك", "Everything new from DarNozom, in your inbox")}</h2>
            <p className="text-white/80 mt-1">{t("الإصدارات والمرصد والمقالات والدراسات", "Publications, the Observatory, articles and studies")}</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="sr-only" htmlFor={`${id}-email`}>{t("البريد الإلكتروني", "Email")}</label>
            <input
              id={`${id}-email`} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com" aria-label={t("البريد الإلكتروني", "Email")}
              className="flex-1 min-h-12 px-4 rounded-[4px] bg-white text-ink placeholder:text-ink-muted"
            />
            <button type="submit" className="min-h-12 px-6 rounded-[4px] bg-gold-light text-ink font-bold hover:bg-gold">
              {t("اشترك في النشرة", "Subscribe")}
            </button>
          </div>
          <label className="flex items-start gap-2 text-sm text-white/85">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1.5 w-4 h-4" />
            <span>{t("أوافق على استلام الرسائل البريدية من دار نظم. يمكنك إلغاء الاشتراك في أي وقت.", "I agree to receive emails from DarNozom. You can unsubscribe at any time.")}</span>
          </label>
          {error && <p role="alert" className="text-sm text-gold-light">{error}</p>}
        </form>
      </div>
    </section>
  );
}
```

```tsx
// apps/client/src/components/content/page-shell.tsx
import type { ReactNode } from "react";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export function PageShell({ children, footerTone = "dark" }: { children: ReactNode; footerTone?: "dark" | "light" }) {
  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <SiteNav mode="page" />
      <main className="flex-1">{children}</main>
      <SiteFooter tone={footerTone} />
    </div>
  );
}
```

```tsx
// apps/client/src/components/site-footer.tsx
import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";
import { BRAND, CONTACT } from "@/lib/site-constants";

type Tone = "dark" | "light";
const col = (ar: string, en: string, links: [string, string, string][]) => ({ ar, en, links });

const COLUMNS = [
  col("المعرفة والتعلم", "Knowledge and Learning", [
    ["المعرفة والبحوث", "Knowledge and Research", "/services/research"],
    ["الأكاديمية", "Academy", "/academy"],
    ["المكتبة والإصدارات", "Library and Publications", "/publications"],
    ["إصدارات دار نظم", "DarNozom Publications", "/publications?tab=all"],
    ["المرصد", "Observatory", "/observatory"],
  ]),
  col("الخدمات والحلول", "Services and Solutions", [
    ["خدماتنا", "Services", "/services"],
    ["الاستشارات", "Consulting", "/services/consulting"],
    ["التدريب وبناء القدرات", "Training and Capacity Building", "/academy/for-organizations"],
    ["نظم بلاتفورم", "Nozom Platform", "/services/digital-transformation"],
    ["الأخبار والفعاليات", "News and Events", "/news-events"],
  ]),
];

export function SiteFooter({ tone = "dark" }: { tone?: Tone }) {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const dark = tone === "dark";
  const surface = dark ? "bg-navy-deep text-white" : "bg-ivory text-navy border-t border-line";
  const muted = dark ? "text-white/75" : "text-ink-muted";
  const hover = dark ? "hover:text-white" : "hover:text-navy";
  const linkCls = `inline-flex items-center min-h-11 ${muted} ${hover}`;
  const arrow = isArabic ? "←" : "→";

  return (
    <footer className={surface}>
      <div className="mx-auto max-w-[1200px] px-5 lg:px-6 pt-12 pb-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="text-xl font-bold mb-3"><Link href="/">{t(BRAND.nameAr, BRAND.nameEn)}</Link></h2>
            <p className={`text-sm ${muted}`}>{t(BRAND.taglineAr, BRAND.taglineEn)}</p>
            <p className="mt-3 font-semibold">{t(BRAND.sloganAr, BRAND.sloganEn)}</p>
            <p className={`mt-2 text-sm ${dark ? "text-gold-light" : "text-gold"}`}>{t(BRAND.refLineAr, BRAND.refLineEn)}</p>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.ar} aria-label={t(c.ar, c.en)}>
              <h2 className="text-lg font-bold mb-3">{t(c.ar, c.en)}</h2>
              <ul>
                {c.links.map(([ar, en, href]) => (
                  <li key={href}><Link href={href} className={linkCls}>{t(ar, en)} <span aria-hidden className="ms-1.5">{arrow}</span></Link></li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <h2 className="text-lg font-bold mb-3">{t("تواصل معنا", "Contact Us")}</h2>
            <ul>
              <li><a href={`mailto:${CONTACT.email}`} dir="ltr" className={linkCls}>{CONTACT.email}</a></li>
              <li><a href={CONTACT.phoneHref} dir="ltr" className={linkCls}>{CONTACT.phone}</a></li>
              <li><a href="/#newsletter" className={linkCls}>{t("اشترك في النشرة", "Subscribe to the newsletter")} <span aria-hidden className="ms-1.5">{arrow}</span></a></li>
              <li><Link href="/service-registration" className={linkCls}>{t("أرسل طلبك", "Send your request")} <span aria-hidden className="ms-1.5">{arrow}</span></Link></li>
            </ul>
          </div>
        </div>
        <div className={`mt-10 pt-5 border-t ${dark ? "border-white/15" : "border-line"} flex flex-col sm:flex-row gap-3 justify-between text-sm ${muted}`}>
          <p>© {new Date().getFullYear()} {t("دار نظم. جميع الحقوق محفوظة.", "DarNozom. All rights reserved.")}</p>
          <ul className="flex flex-wrap gap-x-5">
            <li><Link href="/privacy" className={linkCls}>{t("الخصوصية", "Privacy")}</Link></li>
            <li><Link href="/terms" className={linkCls}>{t("الشروط", "Terms")}</Link></li>
            <li><Link href="/return-policy" className={linkCls}>{t("الإرجاع", "Returns")}</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Check old footer features.** The old footer rendered `OdooPartnerBadge` and social links. The brief limits the footer to the four columns, so remove both from the footer. Run `grep -rn "OdooPartnerBadge" apps/client/src`; if the footer was its only user, leave the component file in place (unused) and mention that in the commit.

- [ ] **Step 5: Run the tests**

Run: `pnpm --filter @workspace/client exec vitest run src/components && pnpm --filter @workspace/client typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/components/site-footer.tsx apps/client/src/components/site-footer.test.tsx apps/client/src/components/content
git commit -m "feat(client): four-column footer with tone variant and shared content components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: List and detail pages for the six content types

**Files:**
- Create: `apps/client/src/pages/content/content-list-page.tsx`, `apps/client/src/pages/content/content-detail-page.tsx`, `apps/client/src/components/content/detail-blocks.tsx`
- Modify: `apps/client/src/App.tsx`
- Delete: `apps/client/src/pages/events.tsx`
- Test: `apps/client/src/pages/content/content-list-page.test.tsx`, `apps/client/src/pages/content/content-detail-page.test.tsx`

**Interfaces:**
- Consumes: Tasks 11–12.
- Produces: `ContentListPage({ section }: { section: SectionKey })` (default export); `ContentDetailPage({ section, slug }: { section: SectionKey; slug: string })` (default export); routes `/observatory`, `/articles`, `/studies`, `/publications`, `/news-events` and their `/:slug` pages; `/events` → `/news-events?tab=events`.

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/client/src/pages/content/content-list-page.test.tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true, toggleLanguage: vi.fn() }) }));
vi.mock("@/components/content/page-shell", () => ({ PageShell: ({ children }: any) => <>{children}</> }));
vi.mock("@/lib/darnozom-books", () => ({ useDarNozomBooks: () => ({ data: [], isLoading: false }) }));

import ContentListPage from "./content-list-page";

const item = (slug: string) => ({
  id: 1, type: "event", slug, status: "published", titleAr: `فعالية ${slug}`, titleEn: "", summaryAr: "", summaryEn: "",
  bodyAr: "", bodyEn: "", coverImageUrl: "", area: null, authorAr: "", authorEn: "", isExternal: false, externalUrl: "",
  publishedAt: "2026-10-01T00:00:00Z", details: { kind: "seminar" }, createdAt: "", updatedAt: "",
});

function setup(path: string, items = [item("e1")]) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ items, total: items.length, page: 1, pageSize: 12 })));
  vi.stubGlobal("fetch", fetchMock);
  const loc = memoryLocation({ path, record: true });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Router hook={loc.hook} searchHook={loc.searchHook}>
        <ContentListPage section="news-events" />
      </Router>
    </QueryClientProvider>,
  );
  return { fetchMock, loc };
}

afterEach(() => vi.unstubAllGlobals());

describe("ContentListPage", () => {
  it("reads tab and filters from the URL into the API call", async () => {
    const { fetchMock } = setup("/news-events?tab=events&kind=seminar");
    await screen.findByText("فعالية e1");
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("type=event");
    expect(url).toContain("kind=seminar");
    expect(url).toContain("when=upcoming");
  });

  it("writes tab changes back to the URL", async () => {
    const { loc } = setup("/news-events?tab=events");
    await screen.findByText("فعالية e1");
    fireEvent.click(screen.getByRole("tab", { name: "الأخبار" }));
    await waitFor(() => expect(loc.history!.at(-1)).toBe("/news-events?tab=news"));
  });

  it("shows an empty state", async () => {
    setup("/news-events?tab=news", []);
    expect(await screen.findByText("لا توجد مواد منشورة بعد في هذا القسم.")).toBeTruthy();
  });
});
```

```tsx
// apps/client/src/pages/content/content-detail-page.test.tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true, toggleLanguage: vi.fn() }) }));
vi.mock("@/components/content/page-shell", () => ({ PageShell: ({ children }: any) => <>{children}</> }));
vi.mock("@/components/content/newsletter-block", () => ({ NewsletterBlock: () => null }));
vi.mock("@/pages/not-found", () => ({ default: () => <p>NOT FOUND</p> }));

import ContentDetailPage from "./content-detail-page";

const obs = {
  id: 7, type: "observatory", slug: "o1", status: "published", titleAr: "رصد", titleEn: "", summaryAr: "", summaryEn: "",
  bodyAr: "<p>نص</p>", bodyEn: "", coverImageUrl: "", area: null, authorAr: "", authorEn: "", isExternal: false, externalUrl: "",
  publishedAt: "2026-10-01T00:00:00Z", createdAt: "", updatedAt: "",
  details: { kind: "daily_brief", whatHappenedAr: "<p>حدث</p>", ourReadingAr: "<p>قراءة</p>", researchQuestionsAr: "<p>سؤال</p>", sources: [{ title: "المصدر", url: "https://src.example" }] },
};

function setup(section: any, slug: string, response: { status: number; body?: unknown }) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(response.body ?? {}), { status: response.status })));
  const loc = memoryLocation({ path: `/x/${slug}` });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Router hook={loc.hook} searchHook={loc.searchHook}>
        <ContentDetailPage section={section} slug={slug} />
      </Router>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ContentDetailPage", () => {
  it("renders observatory sections and sources", async () => {
    setup("observatory", "o1", { status: 200, body: { item: obs, related: [] } });
    expect(await screen.findByRole("heading", { level: 1, name: "رصد" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "ما الذي حدث؟" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "قراءة دار نظم" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "موضوعات تستحق البحث" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "المصدر" }).getAttribute("href")).toBe("https://src.example");
  });

  it("shows NotFound on 404", async () => {
    setup("articles", "missing", { status: 404 });
    expect(await screen.findByText("NOT FOUND")).toBeTruthy();
  });

  it("shows NotFound when the slug belongs to another section", async () => {
    setup("articles", "o1", { status: 200, body: { item: obs, related: [] } });
    expect(await screen.findByText("NOT FOUND")).toBeTruthy();
  });

  it("shows the interest CTA for an event without a date", async () => {
    setup("news-events", "e1", { status: 200, body: { item: { ...obs, type: "event", details: { kind: "seminar", registration: "interest", mode: "in_person" } }, related: [] } });
    expect(await screen.findByRole("link", { name: "سجّل اهتمامك" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @workspace/client exec vitest run src/pages/content`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement the detail blocks**

```tsx
// apps/client/src/components/content/detail-blocks.tsx
import { Download, ExternalLink } from "lucide-react";
import type { CmsLink, ContentItem, Lang } from "@/lib/cms-types";
import { EVENT_KINDS, REGION_LABELS, eventCta, formatDate } from "@/lib/cms-labels";
import { RichHtml } from "./rich-html";

const L = (lang: Lang, ar: string, en: string) => (lang === "ar" ? ar : en);
const field = (d: Record<string, any>, key: string, lang: Lang) => (lang === "en" && d[`${key}En`] ? d[`${key}En`] : d[`${key}Ar`]) ?? "";

function Section({ title, html }: { title: string; html: string }) {
  if (!html) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-navy mb-3 border-s-4 border-gold ps-3">{title}</h2>
      <RichHtml html={html} />
    </section>
  );
}

export function LinksList({ title, links }: { title: string; links: CmsLink[] }) {
  if (!links?.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-navy mb-3">{title}</h2>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-navy underline underline-offset-4 min-h-11">
              {l.title} <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PdfButton({ url, lang, label }: { url?: string; lang: Lang; label?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-12 px-5 rounded-[4px] bg-navy text-white font-semibold hover:bg-navy-deep">
      <Download className="w-4 h-4" aria-hidden /> {label ?? L(lang, "تحميل الملف", "Download file")}
    </a>
  );
}

export function TypeBlocks({ item, lang }: { item: ContentItem; lang: Lang }) {
  const d = item.details ?? {};
  switch (item.type) {
    case "observatory":
      return (
        <>
          <Section title={L(lang, "ما الذي حدث؟", "What happened?")} html={field(d, "whatHappened", lang)} />
          <Section title={L(lang, "قراءة دار نظم", "DarNozom's reading")} html={field(d, "ourReading", lang)} />
          <Section title={L(lang, "موضوعات تستحق البحث", "Topics worth researching")} html={field(d, "researchQuestions", lang)} />
          <LinksList title={L(lang, "المصادر", "Sources")} links={d.sources} />
        </>
      );
    case "study":
      return (
        <>
          <Section title={L(lang, "سؤال الدراسة", "Research question")} html={field(d, "question", lang)} />
          <Section title={L(lang, "المنهج", "Method")} html={field(d, "method", lang)} />
          <Section title={L(lang, "النتائج", "Findings")} html={field(d, "findings", lang)} />
          <Section title={L(lang, "التوصيات", "Recommendations")} html={field(d, "recommendations", lang)} />
          {d.keywords?.length > 0 && (
            <p className="mt-6 text-sm text-ink-muted">{L(lang, "كلمات مفتاحية: ", "Keywords: ")}{d.keywords.join("، ")}</p>
          )}
          <div className="mt-6"><PdfButton url={d.pdfUrl} lang={lang} label={L(lang, "حمّل الدراسة", "Download the study")} /></div>
        </>
      );
    case "publication":
      return (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {d.issueNumber && <span className="text-ink-muted">{L(lang, "العدد", "Issue")} {d.issueNumber}</span>}
          <PdfButton url={d.pdfUrl} lang={lang} />
        </div>
      );
    case "article":
    case "news":
      return <LinksList title={L(lang, "روابط ذات صلة", "Related links")} links={d.relatedLinks} />;
    case "event":
      return null;
  }
}

export function EventFacts({ item, lang }: { item: ContentItem; lang: Lang }) {
  if (item.type !== "event") return null;
  const d = item.details ?? {};
  const cta = eventCta(d, lang);
  const mode = { in_person: L(lang, "حضوري", "In person"), online: L(lang, "عن بُعد", "Online"), hybrid: L(lang, "حضوري وعن بُعد", "Hybrid") }[d.mode as string] ?? "";
  const venue = field(d, "venue", lang);
  return (
    <dl className="bg-white border border-line rounded-[4px] p-5 space-y-3 text-sm">
      <div><dt className="text-ink-muted">{L(lang, "النوع", "Type")}</dt><dd className="font-semibold">{EVENT_KINDS[d.kind]?.[lang]}</dd></div>
      <div><dt className="text-ink-muted">{L(lang, "الموعد", "Date")}</dt><dd className="font-semibold">{d.startsAt ? `${formatDate(d.startsAt, lang, true)} (${d.timezone ?? "Africa/Cairo"})` : L(lang, "يُعلن لاحقًا", "To be announced")}</dd></div>
      {mode && <div><dt className="text-ink-muted">{L(lang, "نمط الحضور", "Attendance")}</dt><dd className="font-semibold">{mode}{venue ? ` — ${venue}` : ""}</dd></div>}
      {d.isExternalEvent && d.organizerName && (
        <div><dt className="text-ink-muted">{L(lang, "فعالية خارجية — الجهة المنظمة", "External event — organiser")}</dt>
          <dd>{d.organizerUrl ? <a className="underline text-navy" href={d.organizerUrl} target="_blank" rel="noopener noreferrer">{d.organizerName}</a> : d.organizerName}</dd></div>
      )}
      {cta.href ? (
        <a href={cta.href} className="mt-2 flex items-center justify-center min-h-12 rounded-[4px] bg-gold-light text-ink font-bold hover:bg-gold">{cta.label}</a>
      ) : (
        <p className="mt-2 text-center text-ink-muted">{cta.label}</p>
      )}
    </dl>
  );
}

export function RegionTag({ item, lang }: { item: ContentItem; lang: Lang }) {
  const r = item.details?.region;
  return r && REGION_LABELS[r] ? <span className="text-sm text-ink-muted">{REGION_LABELS[r][lang]}</span> : null;
}
```

- [ ] **Step 4: Implement the detail page**

```tsx
// apps/client/src/pages/content/content-detail-page.tsx
import { useEffect } from "react";
import { Link, useSearch } from "wouter";
import { ExternalLink, Share2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { NotFoundError, useCmsItem } from "@/lib/cms-api";
import { SECTIONS, type SectionKey } from "@/lib/cms-sections";
import { AREA_LABELS, formatDate, pickLang, typeBadge } from "@/lib/cms-labels";
import { PageShell } from "@/components/content/page-shell";
import { CategoryBadge } from "@/components/content/category-badge";
import { ContentCard } from "@/components/content/content-card";
import { RichHtml } from "@/components/content/rich-html";
import { NewsletterBlock } from "@/components/content/newsletter-block";
import { EventFacts, RegionTag, TypeBlocks } from "@/components/content/detail-blocks";
import { FetchError } from "@/components/fetch-error";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";

export default function ContentDetailPage({ section, slug }: { section: SectionKey; slug: string }) {
  const { language: lang, isArabic } = useLanguage();
  const preview = new URLSearchParams(useSearch()).get("preview") === "1";
  const cfg = SECTIONS[section];
  const q = useCmsItem(slug, preview);
  const item = q.data?.item;
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  useEffect(() => {
    if (item) document.title = `${pickLang(item, "title", lang)} | ${t("دار نظم", "DarNozom")}`;
  }, [item, lang]);

  if (q.error instanceof NotFoundError || (item && !cfg.types.includes(item.type))) return <NotFound />;

  const share = async () => {
    const url = window.location.href.replace(/[?&]preview=1/, "");
    if (navigator.share) await navigator.share({ url, title: item ? pickLang(item, "title", lang) : "" }).catch(() => {});
    else await navigator.clipboard?.writeText(url);
  };

  return (
    <PageShell footerTone="light">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-6 py-8 lg:py-12">
        {preview && item && item.status !== "published" && (
          <p role="status" className="mb-4 bg-mist border border-line px-4 py-2 text-sm text-navy">{t("معاينة — هذه المادة غير منشورة", "Preview — this item is not published")}</p>
        )}
        <nav aria-label={t("مسار التصفح", "Breadcrumb")} className="text-sm text-ink-muted mb-6">
          <Link href="/" className="hover:text-navy">{t("الرئيسية", "Home")}</Link>
          <span className="mx-2" aria-hidden>/</span>
          <Link href={cfg.path} className="hover:text-navy">{t(cfg.titleAr, cfg.titleEn)}</Link>
        </nav>

        {q.isLoading && <div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-64 w-full" /></div>}
        {q.isError && !(q.error instanceof NotFoundError) && <FetchError onRetry={() => q.refetch()} className="py-16" />}

        {item && (
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <article>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <CategoryBadge>{typeBadge(item.type, item.details, lang)}</CategoryBadge>
                <CategoryBadge tone="outline">{item.isExternal ? t("مرجع من جهة أخرى", "External reference") : t("إصدار دار نظم", "DarNozom publication")}</CategoryBadge>
                {item.area && <span className="text-sm text-ink-muted">{AREA_LABELS[item.area][lang]}</span>}
                <RegionTag item={item} lang={lang} />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-navy leading-tight">{pickLang(item, "title", lang)}</h1>
              <p className="mt-3 text-sm text-ink-muted">
                {[pickLang(item, "author", lang), formatDate(item.publishedAt, lang)].filter(Boolean).join(" · ")}
              </p>
              {pickLang(item, "summary", lang) && <p className="mt-5 text-lg text-ink">{pickLang(item, "summary", lang)}</p>}
              {item.coverImageUrl && <img src={item.coverImageUrl} alt="" className="mt-6 w-full max-h-[460px] object-cover rounded-[4px]" />}
              {lang === "en" && !item.bodyEn && item.bodyAr && (
                <p className="mt-6 text-sm bg-mist px-4 py-2 text-navy">This item has not been translated yet. The Arabic original is shown below.</p>
              )}
              <div className="mt-8"><RichHtml html={pickLang(item, "body", lang)} /></div>
              <TypeBlocks item={item} lang={lang} />
              {item.isExternal && item.externalUrl && (
                <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 text-navy underline">
                  {t("عرض المصدر الأصلي", "View original source")} <ExternalLink className="w-4 h-4" aria-hidden />
                </a>
              )}
              <button type="button" onClick={share} className="mt-8 flex items-center gap-2 min-h-11 text-sm font-semibold text-navy">
                <Share2 className="w-4 h-4" aria-hidden /> {t("شارك هذا الإصدار", "Share this publication")}
              </button>
            </article>
            <aside className="space-y-6">
              <EventFacts item={item} lang={lang} />
              {q.data!.related.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-navy mb-3">{t("مواد ذات صلة", "Related items")}</h2>
                  <div className="space-y-3">{q.data!.related.map((r) => <ContentCard key={r.id} item={r} variant="compact" />)}</div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
      {item && !item.isExternal && (
        <>
          <p className="mx-auto max-w-[1200px] px-5 lg:px-6 text-xl font-bold text-navy">{t("تابع إصدارات دار نظم", "Follow DarNozom publications")}</p>
          <NewsletterBlock />
        </>
      )}
    </PageShell>
  );
}
```

- [ ] **Step 5: Implement the list page**

```tsx
// apps/client/src/pages/content/content-list-page.tsx
import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useLanguage } from "@/lib/language-context";
import { useCmsList } from "@/lib/cms-api";
import { SECTIONS, type SectionKey } from "@/lib/cms-sections";
import { AREA_LABELS, PUBLICATION_KINDS, REGION_LABELS } from "@/lib/cms-labels";
import { useDarNozomBooks } from "@/lib/darnozom-books";
import { DARNOZOM_PUBLISHER } from "@/lib/site-constants";
import { PageShell } from "@/components/content/page-shell";
import { ContentCard } from "@/components/content/content-card";
import { CategoryBadge } from "@/components/content/category-badge";
import { SectionHeader } from "@/components/content/section-header";
import { FetchError } from "@/components/fetch-error";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 12;
const selectCls = "min-h-11 px-3 rounded-[4px] border border-line bg-white text-ink";

export default function ContentListPage({ section }: { section: SectionKey }) {
  const cfg = SECTIONS[section];
  const { language: lang, isArabic } = useLanguage();
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const tab = cfg.tabs?.find((x) => x.value === params.get("tab")) ?? cfg.tabs?.[0];
  const area = params.get("area") ?? "";
  const region = params.get("region") ?? "";
  const when = (params.get("when") ?? tab?.defaultWhen ?? "") as "upcoming" | "past" | "";
  const kind = params.get("kind") ?? tab?.kind ?? "";
  const q = params.get("q") ?? "";
  const page = Math.max(Number(params.get("page") ?? 1) || 1, 1);
  const [draftQ, setDraftQ] = useState(q);
  useEffect(() => setDraftQ(q), [q]);

  useEffect(() => {
    document.title = `${t(cfg.titleAr, cfg.titleEn)} | ${t("دار نظم", "DarNozom")}`;
  }, [lang, cfg]);

  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(search);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    const qs = next.toString();
    navigate(`${cfg.path}${qs ? `?${qs}` : ""}`);
  };

  const booksTab = tab?.books === true;
  const list = useCmsList(
    { types: tab?.types ?? cfg.types, area, region, when: cfg.filters.includes("when") ? when : "", kind, q, page, pageSize: PAGE_SIZE },
    { enabled: !booksTab },
  );
  const books = useDarNozomBooks(24, { enabled: booksTab });
  const totalPages = list.data ? Math.max(Math.ceil(list.data.total / PAGE_SIZE), 1) : 1;

  return (
    <PageShell footerTone="light">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-6 py-10 lg:py-14">
        <SectionHeader as="h1" title={t(cfg.titleAr, cfg.titleEn)} subtitle={t(cfg.introAr, cfg.introEn)} />

        {cfg.tabs && (
          <div role="tablist" aria-label={t("الأقسام", "Sections")} className="flex flex-wrap gap-2 mb-5 border-b border-line">
            {cfg.tabs.map((x) => (
              <button
                key={x.value} role="tab" type="button" aria-selected={x.value === tab?.value}
                onClick={() => setParams({ tab: x.value, kind: "", when: "" })}
                className={`min-h-11 px-4 -mb-px border-b-2 font-semibold ${x.value === tab?.value ? "border-gold text-navy" : "border-transparent text-ink-muted hover:text-navy"}`}
              >
                {t(x.labelAr, x.labelEn)}
              </button>
            ))}
          </div>
        )}

        {!booksTab && (
          <form
            className="flex flex-wrap gap-3 mb-8"
            onSubmit={(e) => { e.preventDefault(); setParams({ q: draftQ.trim() }); }}
            role="search"
          >
            <input
              value={draftQ} onChange={(e) => setDraftQ(e.target.value)} placeholder={t("ابحث في هذا القسم", "Search this section")}
              aria-label={t("كلمة البحث", "Search term")} className={`${selectCls} flex-1 min-w-[200px]`}
            />
            {cfg.filters.includes("area") && (
              <select aria-label={t("المجال", "Field")} value={area} onChange={(e) => setParams({ area: e.target.value })} className={selectCls}>
                <option value="">{t("كل المجالات", "All fields")}</option>
                {Object.entries(AREA_LABELS).map(([v, l]) => <option key={v} value={v}>{l[lang]}</option>)}
              </select>
            )}
            {cfg.filters.includes("region") && (
              <select aria-label={t("النطاق الجغرافي", "Region")} value={region} onChange={(e) => setParams({ region: e.target.value })} className={selectCls}>
                <option value="">{t("كل النطاقات", "All regions")}</option>
                {Object.entries(REGION_LABELS).map(([v, l]) => <option key={v} value={v}>{l[lang]}</option>)}
              </select>
            )}
            {cfg.filters.includes("when") && tab?.defaultWhen && (
              <select aria-label={t("الموعد", "When")} value={when} onChange={(e) => setParams({ when: e.target.value })} className={selectCls}>
                <option value="upcoming">{t("القادمة", "Upcoming")}</option>
                <option value="past">{t("السابقة", "Past")}</option>
              </select>
            )}
            {tab?.subKinds && (
              <select aria-label={t("نوع الفعالية", "Event type")} value={kind} onChange={(e) => setParams({ kind: e.target.value })} className={selectCls}>
                <option value="">{t("كل الأنواع", "All types")}</option>
                {Object.entries(tab.subKinds).map(([v, l]) => <option key={v} value={v}>{l[lang]}</option>)}
              </select>
            )}
            <button type="submit" className="min-h-11 px-5 rounded-[4px] bg-navy text-white font-semibold">{t("بحث", "Search")}</button>
          </form>
        )}

        {booksTab ? (
          <BooksGrid books={books.data ?? []} loading={books.isLoading} failed={books.isError} isArabic={isArabic} />
        ) : list.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-72" />)}</div>
        ) : list.isError ? (
          <FetchError onRetry={() => list.refetch()} className="py-16" />
        ) : list.data!.items.length === 0 ? (
          <p className="py-16 text-center text-ink-muted">
            {q || area || region || kind ? t("لا توجد نتائج مطابقة. جرّب تعديل البحث أو المرشحات.", "No matching results. Try changing the search or filters.") : t("لا توجد مواد منشورة بعد في هذا القسم.", "Nothing has been published in this section yet.")}
          </p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.data!.items.map((item) => <ContentCard key={item.id} item={item} />)}
            </div>
            {totalPages > 1 && (
              <nav aria-label={t("الصفحات", "Pagination")} className="flex items-center justify-center gap-4 mt-10">
                <button type="button" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })} className="min-h-11 px-4 border border-line rounded-[4px] disabled:opacity-40">{t("السابق", "Previous")}</button>
                <span className="text-ink-muted">{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setParams({ page: String(page + 1) })} className="min-h-11 px-4 border border-line rounded-[4px] disabled:opacity-40">{t("التالي", "Next")}</button>
              </nav>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}

function BooksGrid({ books, loading, failed, isArabic }: { books: { id: string; title: string; imageUrl: string; href: string }[]; loading: boolean; failed: boolean; isArabic: boolean }) {
  const storeHref = `/services/store/books?publisher=${encodeURIComponent(DARNOZOM_PUBLISHER)}`;
  if (loading) return <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-72" />)}</div>;
  if (failed || books.length === 0) {
    return (
      <p className="py-16 text-center text-ink-muted">
        {isArabic ? "تصفح كتب دار نظم في " : "Browse DarNozom books in the "}
        <Link href={storeHref} className="text-navy underline">{isArabic ? "متجر الكتب" : "book store"}</Link>.
      </p>
    );
  }
  return (
    <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
      {books.map((b) => (
        <Link key={b.id} href={b.href} className="bg-white border border-line rounded-[4px] p-3 hover:shadow-md">
          {b.imageUrl && <img src={b.imageUrl} alt="" loading="lazy" className="w-full aspect-[3/4] object-cover" />}
          <CategoryBadge>{PUBLICATION_KINDS.book[isArabic ? "ar" : "en"]}</CategoryBadge>
          <p className="mt-2 font-bold text-navy line-clamp-2">{b.title}</p>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Register routes.** In `apps/client/src/App.tsx`:
  - Remove `import Events from "@/pages/events";` and the `<Route path="/events" component={Events} />` line.
  - Add `import ContentListPage from "@/pages/content/content-list-page";` and `import ContentDetailPage from "@/pages/content/content-detail-page";`.
  - Inside `Router()`, before the `/services/store` routes, add:

```tsx
      <Route path="/events"><Redirect to="/news-events?tab=events" replace /></Route>
      <Route path="/observatory">{() => <ContentListPage section="observatory" />}</Route>
      <Route path="/observatory/:slug">{(p) => <ContentDetailPage key={p.slug} section="observatory" slug={p.slug} />}</Route>
      <Route path="/articles">{() => <ContentListPage section="articles" />}</Route>
      <Route path="/articles/:slug">{(p) => <ContentDetailPage key={p.slug} section="articles" slug={p.slug} />}</Route>
      <Route path="/studies">{() => <ContentListPage section="studies" />}</Route>
      <Route path="/studies/:slug">{(p) => <ContentDetailPage key={p.slug} section="studies" slug={p.slug} />}</Route>
      <Route path="/publications">{() => <ContentListPage section="publications" />}</Route>
      <Route path="/publications/:slug">{(p) => <ContentDetailPage key={p.slug} section="publications" slug={p.slug} />}</Route>
      <Route path="/news-events">{() => <ContentListPage section="news-events" />}</Route>
      <Route path="/news-events/:slug">{(p) => <ContentDetailPage key={p.slug} section="news-events" slug={p.slug} />}</Route>
```

  - Delete `apps/client/src/pages/events.tsx`. Run `grep -rn '"/events"\|href="/events' apps/client/src` and change any remaining links to `/news-events?tab=events`.

- [ ] **Step 7: Run the tests, typecheck and click through**

Run: `pnpm --filter @workspace/client exec vitest run src/pages/content && pnpm --filter @workspace/client typecheck`
Expected: PASS. Then, with API + client running, open `/observatory`, `/articles/public-value-decision-quality`, `/news-events?tab=events`, `/publications?tab=books` and `/events` (it should redirect).

- [ ] **Step 8: Commit**

```bash
git add apps/client/src/pages/content apps/client/src/components/content/detail-blocks.tsx apps/client/src/App.tsx apps/client/src/pages/events.tsx
git commit -m "feat(client): list and detail pages for observatory, articles, studies, publications, news and events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: New home page

**Files:**
- Create: `apps/client/src/components/home/featured-showcase.tsx`, `about-section.tsx`, `observatory-section.tsx`, `publications-row.tsx`, `home-sections.tsx`
- Rewrite: `apps/client/src/pages/home.tsx`
- Test: `apps/client/src/pages/home.test.tsx`, `apps/client/src/components/home/featured-showcase.test.tsx`

**Interfaces:**
- Consumes: `useCmsHome`, `useDarNozomBooks`, `useStoreBook`, `mergePublications`, the content components, `BRAND`.
- Produces: `FeaturedShowcase({ cards }: { cards: FeaturedCard[] })`, `AboutSection()`, `ObservatorySection({ lead, others })`, `PublicationsRow({ items })`, `ArticlesSection`, `StudiesSection`, `NewsEventsSection` (in `home-sections.tsx`), and `Home` (default export).

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/client/src/components/home/featured-showcase.test.tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true }) }));
vi.mock("@/lib/darnozom-books", () => ({ useStoreBook: () => ({ data: null }) }));
import { FeaturedShowcase } from "./featured-showcase";

const card = (id: number, title: string) => ({
  id, sourceKind: "custom", medusaProductId: null, contentType: null, contentKind: null, badgeAr: "برنامج", badgeEn: "",
  titleAr: title, titleEn: "", summaryAr: "", summaryEn: "", imageUrl: "/seed/x.webp", ctaLabelAr: "اكتشف", ctaLabelEn: "", href: `/x/${id}`,
});
const cards = [card(1, "الأول"), card(2, "الثاني"), card(3, "الثالث"), card(4, "الرابع")] as any;
const mainTitle = () => screen.getByTestId("featured-main-title").textContent;

describe("FeaturedShowcase", () => {
  it("shows the first card large and moves with arrows and dots", () => {
    render(<FeaturedShowcase cards={cards} />);
    expect(mainTitle()).toBe("الأول");
    fireEvent.click(screen.getByRole("button", { name: "العنصر التالي" }));
    expect(mainTitle()).toBe("الثاني");
    fireEvent.click(screen.getByRole("button", { name: "العنصر السابق" }));
    fireEvent.click(screen.getByRole("button", { name: "العنصر السابق" }));
    expect(mainTitle()).toBe("الرابع");
    fireEvent.click(screen.getByRole("button", { name: "عرض العنصر 3" }));
    expect(mainTitle()).toBe("الثالث");
  });
  it("selects a side card and marks it current", () => {
    render(<FeaturedShowcase cards={cards} />);
    const side = screen.getByRole("button", { name: /الثاني/ });
    fireEvent.click(side);
    expect(mainTitle()).toBe("الثاني");
    expect(side.getAttribute("aria-current")).toBe("true");
  });
  it("supports arrow keys and announces the title politely", () => {
    render(<FeaturedShowcase cards={cards} />);
    fireEvent.keyDown(screen.getByRole("region", { name: "مختارات دار نظم" }), { key: "ArrowLeft" });
    expect(mainTitle()).toBe("الثاني");
    expect(screen.getByTestId("featured-live").getAttribute("aria-live")).toBe("polite");
  });
});
```

```tsx
// apps/client/src/pages/home.test.tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true, toggleLanguage: vi.fn() }) }));
vi.mock("@/components/site-nav", () => ({ default: () => null }));
vi.mock("@/components/site-footer", () => ({ SiteFooter: ({ tone }: any) => <footer data-tone={tone} /> }));
const booksHook = vi.fn();
vi.mock("@/lib/darnozom-books", async (orig) => ({ ...(await orig<any>()), useDarNozomBooks: () => booksHook(), useStoreBook: () => ({ data: null }) }));

import Home from "./home";

const item = (type: string, slug: string, extra: any = {}) => ({
  id: slug.length, type, slug, status: "published", titleAr: `عنوان ${slug}`, titleEn: "", summaryAr: "", summaryEn: "",
  bodyAr: "", bodyEn: "", coverImageUrl: "", area: null, authorAr: "", authorEn: "", isExternal: false, externalUrl: "",
  publishedAt: "2026-10-01T00:00:00Z", details: {}, createdAt: "", updatedAt: "", ...extra,
});

function renderHome(home: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(home))));
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Home />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Home", () => {
  it("renders sections in the approved order and hides empty ones", async () => {
    booksHook.mockReturnValue({ data: [], isError: false });
    const { container } = renderHome({
      featured: [],
      observatory: { lead: null, others: [] },
      articles: [item("article", "a1")],
      studies: [],
      publications: [item("publication", "p1", { details: { kind: "report" } })],
      newsEvents: [item("news", "n1")],
    });
    await screen.findByText("عنوان a1");
    const headings = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(headings).toEqual(["عن دار نظم", "المقالات", "الإصدارات", "الأخبار والفعاليات", "كل جديد من دار نظم يصلك على بريدك"]);
    expect(container.querySelector("footer")!.getAttribute("data-tone")).toBe("light");
  });

  it("still renders admin publications when the book store is unavailable", async () => {
    booksHook.mockReturnValue({ data: undefined, isError: true });
    renderHome({
      featured: [], observatory: { lead: null, others: [] }, articles: [], studies: [], newsEvents: [],
      publications: [item("publication", "p2", { details: { kind: "periodical" } })],
    });
    expect(await screen.findByText("عنوان p2")).toBeTruthy();
    expect(screen.getByText("دورية")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @workspace/client exec vitest run src/pages/home.test.tsx src/components/home`
Expected: FAIL.

- [ ] **Step 3: Implement the featured showcase**

```tsx
// apps/client/src/components/home/featured-showcase.tsx
import { useRef, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { FeaturedCard } from "@/lib/cms-types";
import { typeBadge } from "@/lib/cms-labels";
import { useStoreBook } from "@/lib/darnozom-books";
import { CategoryBadge } from "@/components/content/category-badge";

function useCardText(card: FeaturedCard, lang: "ar" | "en") {
  const book = useStoreBook(card.sourceKind === "book" ? card.medusaProductId : null).data;
  const pick = (ar: string, en: string) => (lang === "en" && en ? en : ar);
  const badge = pick(card.badgeAr, card.badgeEn) ||
    (card.contentType ? typeBadge(card.contentType, { kind: card.contentKind }, lang) : card.sourceKind === "book" ? (lang === "ar" ? "كتاب" : "Book") : "");
  return {
    badge,
    title: pick(card.titleAr, card.titleEn) || book?.title || "",
    summary: pick(card.summaryAr, card.summaryEn),
    image: card.imageUrl || book?.imageUrl || "",
    cta: pick(card.ctaLabelAr, card.ctaLabelEn) || (lang === "ar" ? "اكتشف المزيد" : "Learn more"),
  };
}

export function FeaturedShowcase({ cards }: { cards: FeaturedCard[] }) {
  const { language: lang, isArabic } = useLanguage();
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const touchX = useRef<number | null>(null);
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  if (cards.length === 0) return null;

  const go = (i: number) => setIndex((i + cards.length) % cards.length);
  const next = () => go(index + 1);
  const prev = () => go(index - 1);
  const onKeyDown = (e: React.KeyboardEvent) => {
    // In RTL, the visual "next" is to the left.
    if (e.key === "ArrowLeft") (isArabic ? next : prev)();
    if (e.key === "ArrowRight") (isArabic ? prev : next)();
  };
  const NextIcon = isArabic ? ChevronLeft : ChevronRight;
  const PrevIcon = isArabic ? ChevronRight : ChevronLeft;

  return (
    <section aria-roledescription="carousel" aria-label={t("مختارات دار نظم", "DarNozom Highlights")} role="region" onKeyDown={onKeyDown} className="mx-auto max-w-[1200px] px-5 lg:px-6 pt-8">
      <h1 className="text-[25px] lg:text-[31px] font-bold text-navy">{t("مختارات دار نظم", "DarNozom Highlights")}</h1>
      <p className="text-ink-muted mb-5">{t("معرفة وبرامج وحلول تدعم القرار والمؤسسات", "Knowledge, programs and solutions that support decisions and institutions")}</p>
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div
          className="relative bg-navy text-white rounded-[4px] overflow-hidden"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 40) ((dx < 0) !== isArabic ? next : prev)();
            touchX.current = null;
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={cards[index].id} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.28 }}>
              <MainCard card={cards[index]} lang={lang} isArabic={isArabic} />
            </motion.div>
          </AnimatePresence>
          {cards.length > 1 && (
            <>
              <button type="button" onClick={prev} aria-label={t("العنصر السابق", "Previous item")} className="absolute top-[38%] start-3 w-11 h-11 rounded-full bg-navy/80 text-white flex items-center justify-center hover:bg-navy">
                <PrevIcon className="w-5 h-5" />
              </button>
              <button type="button" onClick={next} aria-label={t("العنصر التالي", "Next item")} className="absolute top-[38%] end-3 w-11 h-11 rounded-full bg-navy/80 text-white flex items-center justify-center hover:bg-navy">
                <NextIcon className="w-5 h-5" />
              </button>
            </>
          )}
          {cards.length > 1 && (
            <div className="flex justify-center gap-2 py-3 bg-navy">
              {cards.map((c, i) => (
                <button
                  key={c.id} type="button" onClick={() => go(i)} aria-label={t(`عرض العنصر ${i + 1}`, `Show item ${i + 1}`)} aria-current={i === index}
                  className="w-6 h-6 flex items-center justify-center"
                >
                  <span className={`block rounded-full ${i === index ? "w-2.5 h-2.5 bg-gold-light" : "w-2 h-2 bg-white/50"}`} />
                </button>
              ))}
            </div>
          )}
          <p data-testid="featured-live" aria-live="polite" className="sr-only">{useCardText(cards[index], lang).title}</p>
        </div>

        <div className="flex lg:flex-col gap-4 overflow-x-auto snap-x lg:overflow-visible -mx-5 px-5 lg:mx-0 lg:px-0">
          {cards.slice(1).map((card, i) => (
            <SideCard key={card.id} card={card} lang={lang} isArabic={isArabic} current={index === i + 1} onSelect={() => go(i + 1)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MainCard({ card, lang, isArabic }: { card: FeaturedCard; lang: "ar" | "en"; isArabic: boolean }) {
  const c = useCardText(card, lang);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  return (
    <>
      {c.image && <img src={c.image} alt="" className="w-full aspect-[2/1] object-cover" />}
      <div className="p-5 lg:p-7">
        {c.badge && <CategoryBadge>{c.badge}</CategoryBadge>}
        <h2 data-testid="featured-main-title" className="mt-3 text-2xl lg:text-[28px] font-bold leading-snug">{c.title}</h2>
        {c.summary && <p className="mt-2 text-white/85">{c.summary}</p>}
        <Link href={card.href} className="mt-4 inline-flex items-center gap-2 min-h-11 px-5 rounded-[4px] bg-gold-light text-ink font-bold hover:bg-gold">
          {c.cta} <Arrow className="w-4 h-4" aria-hidden />
        </Link>
      </div>
    </>
  );
}

function SideCard({ card, lang, isArabic, current, onSelect }: { card: FeaturedCard; lang: "ar" | "en"; isArabic: boolean; current: boolean; onSelect: () => void }) {
  const c = useCardText(card, lang);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  return (
    <div className={`snap-start shrink-0 w-[80vw] sm:w-[60vw] lg:w-auto flex bg-white border rounded-[4px] overflow-hidden ${current ? "border-gold ring-1 ring-gold" : "border-line"}`}>
      <button type="button" onClick={onSelect} aria-current={current} className="flex-1 p-4 text-start" aria-label={c.title}>
        {c.badge && <CategoryBadge>{c.badge}</CategoryBadge>}
        <span className="block mt-2 font-bold text-navy">{c.title}</span>
        {c.summary && <span className="block mt-1 text-sm text-ink-muted line-clamp-2">{c.summary}</span>}
      </button>
      {c.image && <img src={c.image} alt="" loading="lazy" className="w-32 object-cover" />}
      <Link href={card.href} className="sr-only focus:not-sr-only">{c.cta} <Arrow className="inline w-3 h-3" /></Link>
    </div>
  );
}
```

- [ ] **Step 4: Implement the other home sections**

```tsx
// apps/client/src/components/home/about-section.tsx
import { Link } from "wouter";
import { BookOpen, Laptop, MessageSquare, Users } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { BRAND } from "@/lib/site-constants";

const SERVICES = [
  { icon: BookOpen, ar: "البحوث والدراسات", en: "Research and Studies", href: "/services/research" },
  { icon: Users, ar: "التدريب وبناء القدرات", en: "Training and Capacity Building", href: "/academy" },
  { icon: MessageSquare, ar: "الاستشارات", en: "Consulting", href: "/services/consulting" },
  { icon: Laptop, ar: "نظم بلاتفورم", en: "Nozom Platform", href: "/services/digital-transformation" },
];

export function AboutSection() {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  return (
    <section className="mt-12">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-6 grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-lg font-bold text-navy">{t("عن دار نظم", "About DarNozom")}</h2>
          <p className="mt-2 text-2xl lg:text-[28px] font-bold text-navy leading-snug">{t(BRAND.sloganAr, BRAND.sloganEn)}</p>
          <p className="mt-2 text-gold font-semibold">{t(BRAND.refLineAr, BRAND.refLineEn)}</p>
          <p className="mt-4 text-ink-muted">
            {t(
              "دار نظم مؤسسة للبحوث والاستشارات وبناء القدرات في مجالات السياسات والقيادة والإدارة والحوكمة، تجمع بين المرجعية الإسلامية والمعرفة والخبرة المعاصرة، وتسهم في تطوير الشأن العام وبناء مؤسسات فاعلة.",
              "DarNozom is an institution for research, consulting and capacity building in policy, leadership, management and governance. It combines an Islamic frame of reference with contemporary knowledge and expertise, contributing to public affairs and to building effective institutions.",
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/about" className="min-h-12 px-6 inline-flex items-center rounded-[4px] bg-navy text-white font-semibold hover:bg-navy-deep">{t("تعرّف على دار نظم", "Discover DarNozom")}</Link>
            <Link href="/services" className="min-h-12 px-6 inline-flex items-center rounded-[4px] border border-navy text-navy font-semibold hover:bg-mist">{t("خدماتنا", "Our services")}</Link>
          </div>
        </div>
        <img src="/seed/about.webp" alt="" className="w-full aspect-[2/1] object-cover rounded-[4px]" />
      </div>
      <div className="mt-10 bg-white border-y border-line">
        <ul className="mx-auto max-w-[1200px] px-5 lg:px-6 grid grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ icon: Icon, ar, en, href }, i) => (
            <li key={href} className={`py-5 ${i > 0 ? "lg:border-s lg:border-gold/50" : ""}`}>
              <Link href={href} className="flex items-center justify-center gap-3 min-h-11 text-navy font-semibold hover:text-gold">
                <Icon className="w-6 h-6" strokeWidth={1.5} aria-hidden /> {t(ar, en)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

```tsx
// apps/client/src/components/home/observatory-section.tsx
import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { ContentItem } from "@/lib/cms-types";
import { contentPath, ctaLabel, pickLang, typeBadge } from "@/lib/cms-labels";
import { CategoryBadge } from "@/components/content/category-badge";
import { ContentCard } from "@/components/content/content-card";
import { SectionHeader } from "@/components/content/section-header";

export function ObservatorySection({ lead, others }: { lead: ContentItem | null; others: ContentItem[] }) {
  const { language: lang, isArabic } = useLanguage();
  if (!lead) return null;
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  return (
    <section className="mx-auto max-w-[1200px] px-5 lg:px-6 mt-14">
      <SectionHeader title={t("المرصد", "Observatory")} subtitle={t("رصد وتحليل لقضايا الشأن العام والإنتاج الفكري والبحثي", "Monitoring and analysis of public affairs and new research")} href="/observatory" linkLabel={t("تابع المرصد", "Follow the Observatory")} />
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <article className="relative rounded-[4px] overflow-hidden bg-navy text-white min-h-[320px]">
          {lead.coverImageUrl && <img src={lead.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
          <div className="relative p-6 lg:p-8 flex flex-col h-full justify-end bg-gradient-to-t from-navy-deep/90 via-navy/50 to-transparent">
            <CategoryBadge>{typeBadge(lead.type, lead.details, lang)}</CategoryBadge>
            <h3 className="mt-3 text-2xl lg:text-[28px] font-bold leading-snug">{pickLang(lead, "title", lang)}</h3>
            <p className="mt-2 text-white/85 max-w-xl">{pickLang(lead, "summary", lang)}</p>
            <Link href={contentPath(lead.type, lead.slug)} className="mt-4 inline-flex items-center gap-2 min-h-11 font-semibold">
              {ctaLabel(lead.type, lead.details, lang)} <Arrow className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </article>
        <div className="grid gap-4">{others.map((o) => <ContentCard key={o.id} item={o} variant="compact" />)}</div>
      </div>
    </section>
  );
}
```

```tsx
// apps/client/src/components/home/publications-row.tsx
import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { ContentItem } from "@/lib/cms-types";
import { PUBLICATION_KINDS } from "@/lib/cms-labels";
import { mergePublications, useDarNozomBooks } from "@/lib/darnozom-books";
import { CategoryBadge } from "@/components/content/category-badge";
import { SectionHeader } from "@/components/content/section-header";

export function PublicationsRow({ items }: { items: ContentItem[] }) {
  const { language: lang, isArabic } = useLanguage();
  const books = useDarNozomBooks(4);
  const cards = mergePublications(items, books.data ?? [], 4);
  if (cards.length === 0) return null;
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  return (
    <section className="mx-auto max-w-[1200px] px-5 lg:px-6 mt-14">
      <SectionHeader title={t("الإصدارات", "Publications")} subtitle={t("كتب وتقارير ودوريات في السياسات والإدارة والحوكمة", "Books, reports and periodicals on policy, administration and governance")} href="/publications" linkLabel={t("المكتبة ومتجر الكتب", "Library and book store")} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <article key={c.key} className="flex bg-white border border-line rounded-[4px] overflow-hidden">
            <div className="flex-1 p-4 flex flex-col gap-2">
              <CategoryBadge>{PUBLICATION_KINDS[c.kind][lang]}</CategoryBadge>
              <h3 className="font-bold text-navy">{lang === "en" && c.titleEn ? c.titleEn : c.titleAr}</h3>
              <Link href={c.href} className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-navy min-h-11">
                {t("تفاصيل الإصدار", "Publication details")} <Arrow className="w-4 h-4" aria-hidden />
              </Link>
            </div>
            {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" className="w-24 object-cover" />}
          </article>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// apps/client/src/components/home/home-sections.tsx
import { useLanguage } from "@/lib/language-context";
import type { ContentItem } from "@/lib/cms-types";
import { ContentCard } from "@/components/content/content-card";
import { SectionHeader } from "@/components/content/section-header";

function Block({ title, subtitle, href, items, cols, variant }: {
  title: string; subtitle: string; href: string; items: ContentItem[]; cols: string; variant: "vertical" | "horizontal";
}) {
  const { isArabic } = useLanguage();
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1200px] px-5 lg:px-6 mt-14">
      <SectionHeader title={title} subtitle={subtitle} href={href} linkLabel={isArabic ? "عرض الكل" : "View all"} />
      <div className={`grid gap-5 ${cols}`}>{items.map((i) => <ContentCard key={i.id} item={i} variant={variant} />)}</div>
    </section>
  );
}

export function ArticlesSection({ items }: { items: ContentItem[] }) {
  const { isArabic: ar } = useLanguage();
  return <Block title={ar ? "المقالات" : "Articles"} subtitle={ar ? "أفكار وتحليلات معمقة في قضايا السياسات والمؤسسات" : "In-depth ideas and analysis on policy and institutions"} href="/articles" items={items} cols="sm:grid-cols-2 lg:grid-cols-3" variant="vertical" />;
}

export function StudiesSection({ items }: { items: ContentItem[] }) {
  const { isArabic: ar } = useLanguage();
  return <Block title={ar ? "الدراسات" : "Studies"} subtitle={ar ? "دراسات متخصصة تسهم في فهم الواقع واستشراف المستقبل" : "Specialised studies to understand the present and anticipate the future"} href="/studies" items={items} cols="lg:grid-cols-2" variant="horizontal" />;
}

export function NewsEventsSection({ items }: { items: ContentItem[] }) {
  const { isArabic: ar } = useLanguage();
  return <Block title={ar ? "الأخبار والفعاليات" : "News and Events"} subtitle={ar ? "آخر المستجدات والفعاليات والبرامج" : "The latest news, events and programs"} href="/news-events" items={items} cols="sm:grid-cols-2 lg:grid-cols-3" variant="horizontal" />;
}
```

- [ ] **Step 5: Rewrite `pages/home.tsx`**

```tsx
// apps/client/src/pages/home.tsx
import { useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useCmsHome } from "@/lib/cms-api";
import { PageShell } from "@/components/content/page-shell";
import { NewsletterBlock } from "@/components/content/newsletter-block";
import { FeaturedShowcase } from "@/components/home/featured-showcase";
import { AboutSection } from "@/components/home/about-section";
import { ObservatorySection } from "@/components/home/observatory-section";
import { PublicationsRow } from "@/components/home/publications-row";
import { ArticlesSection, NewsEventsSection, StudiesSection } from "@/components/home/home-sections";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { isArabic } = useLanguage();
  const home = useCmsHome();
  const d = home.data;

  useEffect(() => {
    document.title = isArabic ? "دار نظم — للبحوث والاستشارات والتدريب" : "DarNozom — Research, Consulting and Training";
  }, [isArabic]);

  return (
    <PageShell footerTone="light">
      {home.isLoading && (
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6 pt-8 grid gap-5 lg:grid-cols-[3fr_2fr]">
          <Skeleton className="h-[420px]" /><Skeleton className="h-[420px]" />
        </div>
      )}
      {d && <FeaturedShowcase cards={d.featured} />}
      <AboutSection />
      {d && (
        <>
          <ObservatorySection lead={d.observatory.lead} others={d.observatory.others} />
          <ArticlesSection items={d.articles} />
          <StudiesSection items={d.studies} />
          <PublicationsRow items={d.publications} />
          <NewsEventsSection items={d.newsEvents} />
        </>
      )}
      <NewsletterBlock />
    </PageShell>
  );
}
```

Note: if `/api/cms/home` fails, the page still shows About + Newsletter. That's intentional, because content sections are hidden when there's no data.

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter @workspace/client exec vitest run src/pages/home.test.tsx src/components/home && pnpm --filter @workspace/client typecheck`
Expected: PASS. If `home.test` finds an extra `h2` from the featured card (`featured-main-title` is an `h2`), the seeded payload in that test has `featured: []`, so it shouldn't appear. Keep the assertion strict.

- [ ] **Step 7: Compare with the reference**

With API + client running, open `/` at 1280px and at 375px, alongside `DarNozom_Homepage_Reference.png`. Check:
- section order
- the large card is on the right in Arabic, with 3 side cards
- gold badges and buttons
- the services strip has 4 icons with gold dividers
- the footer is light under the navy newsletter

Switch to English and confirm the layout mirrors and nothing is blank. Fix spacing differences in the components; don't change behaviour.

- [ ] **Step 8: Commit**

```bash
git add apps/client/src/pages/home.tsx apps/client/src/pages/home.test.tsx apps/client/src/components/home
git commit -m "feat(client): rebuild home page to match the approved reference

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Admin content management (list + editor)

**Files:**
- Create: `apps/client/src/lib/content-types.ts`, `apps/client/src/components/admin/rich-text-editor.tsx`, `apps/client/src/components/admin/file-upload-field.tsx`, `apps/client/src/pages/admin/content/content-list.tsx`, `apps/client/src/pages/admin/content/content-editor.tsx`
- Modify: `apps/client/src/App.tsx`, `apps/client/src/pages/admin/layout.tsx`
- Delete: `apps/client/src/pages/admin/events.tsx`
- Test: `apps/client/src/pages/admin/content/content-editor.test.tsx`

**Interfaces:**
- Consumes: admin API (Tasks 3–6); `adminFetch`, `adminFetchJson`, `adminJsonHeaders` from `lib/admin-api.ts`; `PageHeader`, `Toast`, `useToast` from `pages/admin/layout.tsx`; `ImageUploadField` from `pages/admin/_image-upload.tsx`.
- Produces:
  - `content-types.ts`: `FieldDef` union; `TYPE_CONFIG: Record<ContentType, { labelAr: string; pluralAr: string; detailFields: FieldDef[] }>`; `emptyDetails(type): Record<string, any>`
  - `RichTextEditor({ value, onChange, dir, label })`
  - `FileUploadField({ value, onChange, folder })`
  - `AdminContentList({ type })`, `AdminContentEditor({ type, id })` (`id` is `"new"` or a number string)
  - Routes `/admin/content/:type`, `/admin/content/:type/new`, `/admin/content/:type/:id`; `/admin/events` → `/admin/content/event`

- [ ] **Step 1: Install editor dependencies**

Run: `pnpm --filter @workspace/client add @tiptap/react@^3 @tiptap/pm@^3 @tiptap/starter-kit@^3 @tiptap/extension-image@^3`
Expected: installed. TipTap 3's StarterKit includes Link, configured as `link` in `StarterKit.configure`.

- [ ] **Step 2: Write the failing test**

```tsx
// apps/client/src/pages/admin/content/content-editor.test.tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/components/admin/rich-text-editor", () => ({
  RichTextEditor: ({ label, value, onChange }: any) => <textarea aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />,
}));
vi.mock("@/pages/admin/_image-upload", () => ({ ImageUploadField: () => null }));
vi.mock("@/components/admin/file-upload-field", () => ({ FileUploadField: () => null }));

import AdminContentEditor from "./content-editor";

function setup(type: string, fetchImpl: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal("fetch", fetchMock);
  const loc = memoryLocation({ path: `/admin/content/${type}/new`, record: true });
  render(<Router hook={loc.hook}><AdminContentEditor type={type as any} id="new" /></Router>);
  return { fetchMock, loc };
}

afterEach(() => vi.unstubAllGlobals());

describe("AdminContentEditor", () => {
  it("shows observatory-specific fields", () => {
    setup("observatory", async () => new Response("{}"));
    expect(screen.getByLabelText("نوع المادة")).toBeTruthy();
    expect(screen.getByLabelText("ما الذي حدث؟ (عربي)")).toBeTruthy();
    expect(screen.getByText("المصادر")).toBeTruthy();
    expect(screen.queryByLabelText("رقم العدد")).toBeNull();
  });

  it("shows event fields and posts the full payload", async () => {
    const { fetchMock, loc } = setup("event", async () => new Response(JSON.stringify({ id: 42 }), { status: 201 }));
    fireEvent.change(screen.getByLabelText("العنوان (عربي)"), { target: { value: "ندوة" } });
    fireEvent.change(screen.getByLabelText("نوع الفعالية"), { target: { value: "seminar" } });
    fireEvent.change(screen.getByLabelText("الحالة"), { target: { value: "published" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/cms/items");
    const body = JSON.parse(String(init!.body));
    expect(body).toMatchObject({ type: "event", titleAr: "ندوة", status: "published", details: { kind: "seminar", registration: "interest" } });
    await waitFor(() => expect(loc.history!.at(-1)).toBe("/admin/content/event/42"));
  });

  it("shows server validation issues", async () => {
    setup("publication", async () =>
      new Response(JSON.stringify({ error: "Invalid content", issues: [{ path: ["details", "kind"], message: "Required" }] }), { status: 400 }),
    );
    fireEvent.change(screen.getByLabelText("العنوان (عربي)"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ" }));
    expect(await screen.findByText("details.kind: Required")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter @workspace/client exec vitest run src/pages/admin/content`
Expected: FAIL — module missing.

- [ ] **Step 4: Write the field config**

```ts
// apps/client/src/lib/content-types.ts
import type { ContentType } from "./cms-types";
import { EVENT_KINDS, OBSERVATORY_KINDS, REGION_LABELS } from "./cms-labels";

type Opt = { value: string; labelAr: string };
const opts = (rec: Record<string, { ar: string }>): Opt[] => Object.entries(rec).map(([value, l]) => ({ value, labelAr: l.ar }));

export type FieldDef =
  | { kind: "select"; key: string; labelAr: string; options: Opt[]; required?: boolean }
  | { kind: "text"; key: string; labelAr: string; bilingual?: boolean }
  | { kind: "html"; key: string; labelAr: string }
  | { kind: "links"; key: string; labelAr: string }
  | { kind: "tags"; key: string; labelAr: string }
  | { kind: "file"; key: string; labelAr: string }
  | { kind: "datetime"; key: string; labelAr: string }
  | { kind: "checkbox"; key: string; labelAr: string };

export const TYPE_CONFIG: Record<ContentType, { labelAr: string; pluralAr: string; detailFields: FieldDef[] }> = {
  observatory: {
    labelAr: "مادة رصد", pluralAr: "المرصد",
    detailFields: [
      { kind: "select", key: "kind", labelAr: "نوع المادة", options: opts(OBSERVATORY_KINDS), required: true },
      { kind: "select", key: "region", labelAr: "النطاق الجغرافي", options: opts(REGION_LABELS) },
      { kind: "html", key: "whatHappened", labelAr: "ما الذي حدث؟" },
      { kind: "html", key: "ourReading", labelAr: "قراءة دار نظم" },
      { kind: "html", key: "researchQuestions", labelAr: "موضوعات تستحق البحث" },
      { kind: "links", key: "sources", labelAr: "المصادر" },
    ],
  },
  article: { labelAr: "مقال", pluralAr: "المقالات", detailFields: [{ kind: "links", key: "relatedLinks", labelAr: "روابط ذات صلة" }] },
  study: {
    labelAr: "دراسة", pluralAr: "الدراسات",
    detailFields: [
      { kind: "html", key: "question", labelAr: "سؤال الدراسة" },
      { kind: "html", key: "method", labelAr: "المنهج" },
      { kind: "html", key: "findings", labelAr: "النتائج" },
      { kind: "html", key: "recommendations", labelAr: "التوصيات" },
      { kind: "tags", key: "keywords", labelAr: "كلمات مفتاحية" },
      { kind: "file", key: "pdfUrl", labelAr: "ملف الدراسة (PDF)" },
    ],
  },
  publication: {
    labelAr: "إصدار", pluralAr: "الإصدارات",
    detailFields: [
      { kind: "select", key: "kind", labelAr: "نوع الإصدار", required: true, options: [
        { value: "report", labelAr: "تقرير" }, { value: "periodical", labelAr: "دورية" }, { value: "research", labelAr: "بحث علمي" },
      ] },
      { kind: "text", key: "issueNumber", labelAr: "رقم العدد" },
      { kind: "file", key: "pdfUrl", labelAr: "ملف الإصدار (PDF)" },
    ],
  },
  news: { labelAr: "خبر", pluralAr: "الأخبار", detailFields: [{ kind: "links", key: "relatedLinks", labelAr: "روابط ذات صلة" }] },
  event: {
    labelAr: "فعالية", pluralAr: "الفعاليات",
    detailFields: [
      { kind: "select", key: "kind", labelAr: "نوع الفعالية", options: opts(EVENT_KINDS), required: true },
      { kind: "datetime", key: "startsAt", labelAr: "تبدأ في" },
      { kind: "datetime", key: "endsAt", labelAr: "تنتهي في" },
      { kind: "select", key: "mode", labelAr: "نمط الحضور", options: [
        { value: "in_person", labelAr: "حضوري" }, { value: "online", labelAr: "عن بُعد" }, { value: "hybrid", labelAr: "حضوري وعن بُعد" },
      ] },
      { kind: "text", key: "venue", labelAr: "المكان", bilingual: true },
      { kind: "select", key: "registration", labelAr: "حالة التسجيل", options: [
        { value: "interest", labelAr: "سجّل اهتمامك (لا موعد بعد)" }, { value: "open", labelAr: "التسجيل مفتوح" }, { value: "closed", labelAr: "التسجيل مغلق" },
      ] },
      { kind: "text", key: "registrationUrl", labelAr: "رابط التسجيل" },
      { kind: "checkbox", key: "isExternalEvent", labelAr: "فعالية خارجية" },
      { kind: "text", key: "organizerName", labelAr: "الجهة المنظمة" },
      { kind: "text", key: "organizerUrl", labelAr: "رابط الجهة المنظمة" },
    ],
  },
};

export function emptyDetails(type: ContentType): Record<string, any> {
  const d: Record<string, any> = {};
  for (const f of TYPE_CONFIG[type].detailFields) {
    if (f.kind === "links" || f.kind === "tags") d[f.key] = [];
    else if (f.kind === "checkbox") d[f.key] = false;
    else if (f.kind === "html" || (f.kind === "text" && f.bilingual)) { d[`${f.key}Ar`] = ""; d[`${f.key}En`] = ""; }
    else if (f.kind !== "select" && f.kind !== "datetime") d[f.key] = "";
  }
  if (type === "event") Object.assign(d, { mode: "in_person", registration: "interest" });
  return d;
}
```

- [ ] **Step 5: Write the editor widgets**

```tsx
// apps/client/src/components/admin/rich-text-editor.tsx
import { useEffect, useId } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

export function RichTextEditor({ value, onChange, dir = "rtl", label }: { value: string; onChange: (html: string) => void; dir?: "rtl" | "ltr"; label: string }) {
  const labelId = useId();
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }), Image],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { dir, "aria-labelledby": labelId, class: "prose max-w-none min-h-[180px] p-3 focus:outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  const uploadImage = async (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    const r = await adminFetch("/api/admin/upload-image?folder=cms", { method: "POST", body: fd });
    if (r.ok) editor?.chain().focus().setImage({ src: (await r.json()).url }).run();
  };

  const btn = (active: boolean) => `w-9 h-9 inline-flex items-center justify-center rounded ${active ? "bg-mist text-navy" : "text-ink-muted hover:bg-mist"}`;
  if (!editor) return null;
  return (
    <div className="border border-line rounded-[4px] bg-white">
      <span id={labelId} className="sr-only">{label}</span>
      <div className="flex flex-wrap gap-1 p-1 border-b border-line" role="toolbar" aria-label={`أدوات ${label}`}>
        <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="عريض"><Bold className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="مائل"><Italic className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="عنوان 2"><Heading2 className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="عنوان 3"><Heading3 className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="قائمة نقطية"><List className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="قائمة مرقمة"><ListOrdered className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="اقتباس"><Quote className="w-4 h-4" /></button>
        <button
          type="button" className={btn(editor.isActive("link"))} aria-label="رابط"
          onClick={() => {
            const url = window.prompt("الرابط (https://…)", editor.getAttributes("link").href ?? "");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
        ><Link2 className="w-4 h-4" /></button>
        <label className={`${btn(false)} cursor-pointer`} aria-label="إدراج صورة">
          <ImagePlus className="w-4 h-4" />
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
        </label>
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().undo().run()} aria-label="تراجع"><Undo2 className="w-4 h-4" /></button>
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().redo().run()} aria-label="إعادة"><Redo2 className="w-4 h-4" /></button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
```

```tsx
// apps/client/src/components/admin/file-upload-field.tsx
import { useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

export function FileUploadField({ value, onChange, folder = "cms" }: { value: string; onChange: (url: string) => void; folder?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file: File) => {
    if (file.type !== "application/pdf") return setError("يُسمح بملفات PDF فقط");
    if (file.size > 25 * 1024 * 1024) return setError("الحد الأقصى 25 ميجابايت");
    setBusy(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await adminFetch(`/api/admin/upload-file?folder=${encodeURIComponent(folder)}`, { method: "POST", body: fd });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "فشل رفع الملف");
      onChange(body.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-1">
      {value ? (
        <div className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-navy" />
          <a href={value} target="_blank" rel="noreferrer" className="underline text-navy truncate" dir="ltr">{value}</a>
          <button type="button" onClick={() => onChange("")} aria-label="إزالة الملف"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 min-h-10 px-3 border border-dashed border-line rounded cursor-pointer text-sm">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} رفع ملف PDF
          <input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Write the admin list page**

```tsx
// apps/client/src/pages/admin/content/content-list.tsx
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { adminFetch, adminFetchJson } from "@/lib/admin-api";
import type { ContentItem, ContentStatus, ContentType, ListResponse } from "@/lib/cms-types";
import { contentPath, formatDate } from "@/lib/cms-labels";
import { TYPE_CONFIG } from "@/lib/content-types";
import { PageHeader, Toast, useToast } from "@/pages/admin/layout";
import { Button } from "@/components/ui/button";

export const STATUS_LABELS: Record<ContentStatus, string> = { draft: "مسودة", review: "قيد المراجعة", published: "منشور", archived: "مؤرشف" };

export default function AdminContentList({ type }: { type: ContentType }) {
  const cfg = TYPE_CONFIG[type];
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const { toast, show } = useToast();

  const load = async () => {
    const qs = new URLSearchParams({ type, pageSize: "100" });
    if (status) qs.set("status", status);
    if (q.trim()) qs.set("q", q.trim());
    try {
      setData(await adminFetchJson<ListResponse>(`/api/admin/cms/items?${qs}`));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => { void load(); }, [type, status]);

  const remove = async (item: ContentItem) => {
    if (!window.confirm(`حذف «${item.titleAr}» نهائيًا؟`)) return;
    const r = await adminFetch(`/api/admin/cms/items/${item.id}`, { method: "DELETE" });
    if (r.ok) { show("تم الحذف"); void load(); } else show("تعذّر الحذف", "error");
  };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title={cfg.pluralAr}
        description={`إدارة ${cfg.pluralAr}: إضافة وتعديل ونشر وأرشفة.`}
        actions={<Button asChild className="rounded-none gap-2"><Link href={`/admin/content/${type}/new`}><Plus className="w-4 h-4" /> {`${cfg.labelAr} جديد`}</Link></Button>}
      />
      <form className="flex flex-wrap gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في العناوين والملخصات" className="min-h-10 px-3 border border-line rounded flex-1 min-w-[220px]" />
        <select aria-label="الحالة" value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-10 px-3 border border-line rounded">
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Button type="submit" variant="outline" className="rounded-none">بحث</Button>
      </form>
      {error && <p className="text-destructive mb-3">{error}</p>}
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-mist text-navy">
            <tr><th className="p-3 text-start">العنوان</th><th className="p-3 text-start">الحالة</th><th className="p-3 text-start">تاريخ النشر</th><th className="p-3 text-start">إجراءات</th></tr>
          </thead>
          <tbody>
            {data?.items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="p-3 font-semibold">{item.titleAr}{item.details?.legacyDateText && <span className="ms-2 text-xs text-amber-700">(راجع الموعد: {item.details.legacyDateText})</span>}</td>
                <td className="p-3">{STATUS_LABELS[item.status]}</td>
                <td className="p-3">{formatDate(item.publishedAt, "ar")}</td>
                <td className="p-3 flex gap-1">
                  <Link href={`/admin/content/${type}/${item.id}`} aria-label="تعديل" className="p-2 hover:bg-mist rounded"><Pencil className="w-4 h-4" /></Link>
                  <a href={`${contentPath(item.type, item.slug)}?preview=1`} target="_blank" rel="noreferrer" aria-label="معاينة" className="p-2 hover:bg-mist rounded"><Eye className="w-4 h-4" /></a>
                  <button type="button" onClick={() => remove(item)} aria-label="حذف" className="p-2 hover:bg-red-50 text-destructive rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-ink-muted">لا توجد عناصر.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

Check that `Button` in `components/ui/button.tsx` supports `asChild` (shadcn default). If it doesn't, render a styled `Link` instead.

- [ ] **Step 7: Write the editor page**

```tsx
// apps/client/src/pages/admin/content/content-editor.tsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Trash2 } from "lucide-react";
import { adminFetch, adminFetchJson, adminJsonHeaders } from "@/lib/admin-api";
import type { CmsLink, ContentItem, ContentType } from "@/lib/cms-types";
import { AREA_LABELS, contentPath } from "@/lib/cms-labels";
import { TYPE_CONFIG, emptyDetails, type FieldDef } from "@/lib/content-types";
import { PageHeader, Toast, useToast } from "@/pages/admin/layout";
import { ImageUploadField } from "@/pages/admin/_image-upload";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { FileUploadField } from "@/components/admin/file-upload-field";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "./content-list";

type Form = Omit<ContentItem, "id" | "createdAt" | "updatedAt">;

const blank = (type: ContentType): Form => ({
  type, slug: "", status: "draft", titleAr: "", titleEn: "", summaryAr: "", summaryEn: "", bodyAr: "", bodyEn: "",
  coverImageUrl: "", area: null, authorAr: "دار نظم", authorEn: "DarNozom", isExternal: false, externalUrl: "",
  publishedAt: null, details: emptyDetails(type),
});

const inputCls = "w-full min-h-10 px-3 border border-line rounded bg-white";
const toLocalInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : undefined);

export default function AdminContentEditor({ type, id }: { type: ContentType; id: string }) {
  const cfg = TYPE_CONFIG[type];
  const isNew = id === "new";
  const [, navigate] = useLocation();
  const [form, setForm] = useState<Form>(() => blank(type));
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();

  useEffect(() => {
    if (isNew) return;
    adminFetchJson<ContentItem>(`/api/admin/cms/items/${id}`)
      .then(({ id: _i, createdAt: _c, updatedAt: _u, ...rest }) => setForm({ ...rest, details: { ...emptyDetails(type), ...rest.details } }))
      .catch((e) => show((e as Error).message, "error"));
  }, [id]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setD = (k: string, v: unknown) => setForm((f) => ({ ...f, details: { ...f.details, [k]: v } }));
  const sfx = lang === "ar" ? "Ar" : "En";

  const save = async () => {
    setSaving(true); setIssues([]);
    const details = Object.fromEntries(Object.entries(form.details).filter(([, v]) => v !== "" && v !== undefined));
    const payload = { ...form, details };
    const r = await adminFetch(isNew ? "/api/admin/cms/items" : `/api/admin/cms/items/${id}`, {
      method: isNew ? "POST" : "PUT", headers: adminJsonHeaders(), body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) {
      setIssues(body.issues?.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`) ?? [body.error ?? "تعذّر الحفظ"]);
      return;
    }
    show("تم الحفظ");
    if (isNew) navigate(`/admin/content/${type}/${body.id}`);
    else setForm((f) => ({ ...f, slug: body.slug, publishedAt: body.publishedAt }));
  };

  const renderDetail = (f: FieldDef) => {
    const d = form.details;
    switch (f.kind) {
      case "select":
        return (
          <label key={f.key} className="block">
            <span className="text-sm font-semibold">{f.labelAr}</span>
            <select aria-label={f.labelAr} className={inputCls} value={d[f.key] ?? ""} onChange={(e) => setD(f.key, e.target.value || undefined)}>
              <option value="">{f.required ? "— اختر —" : "— بدون —"}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.labelAr}</option>)}
            </select>
          </label>
        );
      case "text": {
        const key = f.bilingual ? `${f.key}${sfx}` : f.key;
        const label = f.bilingual ? `${f.labelAr} (${lang === "ar" ? "عربي" : "إنجليزي"})` : f.labelAr;
        return (
          <label key={key} className="block">
            <span className="text-sm font-semibold">{label}</span>
            <input aria-label={label} className={inputCls} value={d[key] ?? ""} onChange={(e) => setD(key, e.target.value)} dir={/url/i.test(f.key) ? "ltr" : undefined} />
          </label>
        );
      }
      case "html": {
        const label = `${f.labelAr} (${lang === "ar" ? "عربي" : "إنجليزي"})`;
        return (
          <div key={`${f.key}${sfx}`}>
            <span className="text-sm font-semibold">{label}</span>
            <RichTextEditor label={label} dir={lang === "ar" ? "rtl" : "ltr"} value={d[`${f.key}${sfx}`] ?? ""} onChange={(v) => setD(`${f.key}${sfx}`, v)} />
          </div>
        );
      }
      case "links": {
        const links: CmsLink[] = d[f.key] ?? [];
        const update = (next: CmsLink[]) => setD(f.key, next);
        return (
          <fieldset key={f.key} className="space-y-2">
            <legend className="text-sm font-semibold">{f.labelAr}</legend>
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input aria-label="عنوان الرابط" className={inputCls} placeholder="العنوان" value={l.title} onChange={(e) => update(links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <input aria-label="الرابط" className={inputCls} dir="ltr" placeholder="https://" value={l.url} onChange={(e) => update(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                <button type="button" aria-label="حذف الرابط" onClick={() => update(links.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4 text-destructive" /></button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="rounded-none gap-1" onClick={() => update([...links, { title: "", url: "" }])}><Plus className="w-3 h-3" /> إضافة رابط</Button>
          </fieldset>
        );
      }
      case "tags":
        return (
          <label key={f.key} className="block">
            <span className="text-sm font-semibold">{f.labelAr} (افصل بفاصلة)</span>
            <input aria-label={f.labelAr} className={inputCls} value={(d[f.key] ?? []).join("، ")} onChange={(e) => setD(f.key, e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean))} />
          </label>
        );
      case "file":
        return (
          <div key={f.key}>
            <span className="text-sm font-semibold">{f.labelAr}</span>
            <FileUploadField value={d[f.key] ?? ""} onChange={(v) => setD(f.key, v)} folder="cms" />
          </div>
        );
      case "datetime":
        return (
          <label key={f.key} className="block">
            <span className="text-sm font-semibold">{f.labelAr} (بتوقيت جهازك)</span>
            <input type="datetime-local" aria-label={f.labelAr} className={inputCls} value={toLocalInput(d[f.key])} onChange={(e) => setD(f.key, fromLocalInput(e.target.value))} />
          </label>
        );
      case "checkbox":
        return (
          <label key={f.key} className="flex items-center gap-2">
            <input type="checkbox" checked={!!d[f.key]} onChange={(e) => setD(f.key, e.target.checked)} /> <span className="text-sm">{f.labelAr}</span>
          </label>
        );
    }
  };

  return (
    <div className="max-w-4xl">
      <Toast toast={toast} />
      <PageHeader
        title={isNew ? `${cfg.labelAr} جديد` : `تعديل ${cfg.labelAr}`}
        actions={
          <>
            <Link href={`/admin/content/${type}`} className="text-sm underline">رجوع للقائمة</Link>
            {!isNew && form.slug && <a href={`${contentPath(type, form.slug)}?preview=1`} target="_blank" rel="noreferrer" className="text-sm underline">معاينة</a>}
            <Button type="button" onClick={save} disabled={saving} className="rounded-none">{saving ? "جارٍ الحفظ…" : "حفظ"}</Button>
          </>
        }
      />
      {issues.length > 0 && (
        <ul role="alert" className="mb-4 border border-destructive/40 bg-red-50 p-3 text-sm text-destructive list-disc ps-6">
          {issues.map((i) => <li key={i}>{i}</li>)}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <label className="block">
          <span className="text-sm font-semibold">الحالة</span>
          <select aria-label="الحالة" className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value as Form["status"])}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">المجال</span>
          <select aria-label="المجال" className={inputCls} value={form.area ?? ""} onChange={(e) => set("area", (e.target.value || null) as Form["area"])}>
            <option value="">— بدون —</option>
            {Object.entries(AREA_LABELS).map(([v, l]) => <option key={v} value={v}>{l.ar}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">تاريخ النشر</span>
          <input type="datetime-local" aria-label="تاريخ النشر" className={inputCls} value={toLocalInput(form.publishedAt ?? undefined)} onChange={(e) => set("publishedAt", fromLocalInput(e.target.value) ?? null)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold">الرابط المختصر (slug) — يُولَّد تلقائيًا إن تُرك فارغًا</span>
          <input aria-label="الرابط المختصر" className={inputCls} dir="ltr" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
        </label>
        <label className="flex items-center gap-2 mt-6">
          <input type="checkbox" checked={form.isExternal} onChange={(e) => set("isExternal", e.target.checked)} /> <span className="text-sm">مرجع من جهة أخرى</span>
        </label>
        {form.isExternal && (
          <label className="block sm:col-span-3">
            <span className="text-sm font-semibold">رابط المصدر الأصلي</span>
            <input aria-label="رابط المصدر الأصلي" className={inputCls} dir="ltr" value={form.externalUrl} onChange={(e) => set("externalUrl", e.target.value)} />
          </label>
        )}
        <div className="sm:col-span-3">
          <span className="text-sm font-semibold">صورة الغلاف</span>
          <ImageUploadField value={form.coverImageUrl} onChange={(v) => set("coverImageUrl", v)} folder="cms" />
        </div>
      </div>

      <div role="tablist" className="flex gap-2 border-b border-line mb-4">
        {(["ar", "en"] as const).map((l) => (
          <button key={l} role="tab" type="button" aria-selected={lang === l} onClick={() => setLang(l)} className={`px-4 min-h-10 border-b-2 font-semibold ${lang === l ? "border-gold text-navy" : "border-transparent text-ink-muted"}`}>
            {l === "ar" ? "العربية" : "English"}
          </button>
        ))}
      </div>

      <div className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
        {(["title", "author"] as const).map((k) => {
          const label = `${k === "title" ? "العنوان" : "الكاتب أو الجهة"} (${lang === "ar" ? "عربي" : "إنجليزي"})`;
          return (
            <label key={k} className="block">
              <span className="text-sm font-semibold">{label}</span>
              <input aria-label={label} className={inputCls} value={form[`${k}${sfx}` as keyof Form] as string} onChange={(e) => set(`${k}${sfx}` as keyof Form, e.target.value as never)} />
            </label>
          );
        })}
        <label className="block">
          <span className="text-sm font-semibold">{`الملخص (${lang === "ar" ? "عربي" : "إنجليزي"})`}</span>
          <textarea aria-label={`الملخص (${lang === "ar" ? "عربي" : "إنجليزي"})`} rows={3} className={`${inputCls} py-2`} value={form[`summary${sfx}`]} onChange={(e) => set(`summary${sfx}`, e.target.value)} />
        </label>
        <div>
          <span className="text-sm font-semibold">{`النص (${lang === "ar" ? "عربي" : "إنجليزي"})`}</span>
          <RichTextEditor label={`النص (${lang === "ar" ? "عربي" : "إنجليزي"})`} dir={lang === "ar" ? "rtl" : "ltr"} value={form[`body${sfx}`]} onChange={(v) => set(`body${sfx}`, v)} />
        </div>
      </div>

      {cfg.detailFields.length > 0 && (
        <section className="mt-8 border-t border-line pt-6 space-y-4" dir="rtl">
          <h2 className="font-bold text-navy">{`بيانات ${cfg.labelAr}`}</h2>
          {cfg.detailFields.map(renderDetail)}
        </section>
      )}
    </div>
  );
}
```

Event-specific fields render with `dir="rtl"` labels, and bilingual ones follow the language tab. The test's `getByLabelText("ما الذي حدث؟ (عربي)")` matches the html field label in the default Arabic tab.

- [ ] **Step 8: Routes and sidebar**
  - In `App.tsx`, import `AdminContentList` and `AdminContentEditor`. Inside `AdminRouter`'s `<Switch>`, replace `<Route path="/admin/events" component={AdminEvents} />` with:

```tsx
        <Route path="/admin/events"><Redirect to="/admin/content/event" /></Route>
        <Route path="/admin/content/:type/:id">{(p) => <AdminContentEditor key={`${p.type}-${p.id}`} type={p.type as any} id={p.id} />}</Route>
        <Route path="/admin/content/:type">{(p) => <AdminContentList key={p.type} type={p.type as any} />}</Route>
```

  - Remove the `AdminEvents` import, and delete `pages/admin/events.tsx`.
  - Guard unknown types: at the top of both components add `if (!(type in TYPE_CONFIG)) return <NotFound />;` (import `NotFound` from `@/pages/not-found`). In `AdminContentEditor`, place this guard **after** all hooks, so the rules of hooks hold. Simplest: wrap it as `export default function AdminContentEditorRoute(props) { return props.type in TYPE_CONFIG ? <AdminContentEditor {...props} /> : <NotFound /> }`, and do the same for the list.
  - In `pages/admin/layout.tsx` `NAV_ITEMS`, replace `{ href: "/admin/events", label: "الفعاليات", icon: CalendarDays }` with these entries, inserted right after "نظرة عامة":

```ts
  { href: "/admin/featured", label: "مختارات الرئيسية", icon: Star },
  { href: "/admin/content/observatory", label: "المرصد", icon: Radar },
  { href: "/admin/content/article", label: "المقالات", icon: Newspaper },
  { href: "/admin/content/study", label: "الدراسات", icon: FileSearch },
  { href: "/admin/content/publication", label: "الإصدارات", icon: Library },
  { href: "/admin/content/news", label: "الأخبار", icon: Megaphone },
  { href: "/admin/content/event", label: "الفعاليات", icon: CalendarDays },
```

  Add `Star, Radar, Newspaper, FileSearch, Library, Megaphone` to the `lucide-react` import.

- [ ] **Step 9: Run the tests and typecheck**

Run: `pnpm --filter @workspace/client exec vitest run src/pages/admin && pnpm --filter @workspace/client typecheck`
Expected: PASS. If TipTap types complain about `setContent(value, { emitUpdate: false })`, check the installed major version in `node_modules/@tiptap/core/package.json`. v3 uses the options object; v2 uses `setContent(value, false)`.

- [ ] **Step 10: Manual check**

Sign in as the admin and open `/admin/content/article/new`:
- Write an Arabic title and body with a heading and a link, then upload a cover. Save → the URL changes to `/admin/content/article/<id>`.
- Switch to English and add a translation. Set the status to منشور and save.
- Open the public page and the home page: the article appears.
- Set it to مسودة: it disappears from public pages.
- Repeat a quick create for one item of each other type, including a study PDF and an event with a date.

- [ ] **Step 11: Commit**

```bash
git add apps/client/src/lib/content-types.ts apps/client/src/components/admin apps/client/src/pages/admin apps/client/src/App.tsx apps/client/package.json pnpm-lock.yaml
git commit -m "feat(admin): manage observatory, articles, studies, publications, news and events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Admin featured-slider manager

**Files:**
- Create: `apps/client/src/pages/admin/content/featured.tsx`
- Modify: `apps/client/src/App.tsx`
- Test: `apps/client/src/pages/admin/content/featured.test.tsx`

**Interfaces:**
- Consumes: `/api/admin/cms/featured*`, `/api/admin/cms/items` (content picker), `searchStoreBooks` (book picker), `ImageUploadField`.
- Produces: `AdminFeatured()` (default export), route `/admin/featured`.

- [ ] **Step 1: Install dnd-kit**

Run: `pnpm --filter @workspace/client add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

- [ ] **Step 2: Write the failing test**

```tsx
// apps/client/src/pages/admin/content/featured.test.tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/pages/admin/_image-upload", () => ({ ImageUploadField: ({ onChange }: any) => <button type="button" onClick={() => onChange("/seed/hero.webp")}>رفع صورة</button> }));
vi.mock("@/lib/book-catalog", () => ({ searchStoreBooks: vi.fn(async () => ({ products: [], total: 0 })) }));

import AdminFeatured from "./featured";

const slide = (id: number, title: string) => ({
  id, position: id, isActive: true, sourceKind: "custom", contentItemId: null, medusaProductId: null,
  badgeAr: "", badgeEn: "", titleAr: title, titleEn: "", summaryAr: "", summaryEn: "", imageUrl: "/x.webp",
  ctaLabelAr: "", ctaLabelEn: "", href: "/academy", linkedTitleAr: null, linkedStatus: null,
});

afterEach(() => vi.unstubAllGlobals());

describe("AdminFeatured", () => {
  it("lists slides and moves one down with the keyboard-accessible button", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/admin/cms/featured" && !init?.method) return new Response(JSON.stringify([slide(1, "أ"), slide(2, "ب")]));
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminFeatured />);
    await screen.findByText("أ");
    fireEvent.click(screen.getAllByRole("button", { name: "تحريك لأسفل" })[0]);
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) => u === "/api/admin/cms/featured/order");
      expect(JSON.parse(String(call![1]!.body))).toEqual({ ids: [2, 1] });
    });
  });

  it("creates a custom card", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/admin/cms/featured" && init?.method === "POST") return new Response(JSON.stringify(slide(9, "جديد")), { status: 201 });
      return new Response(JSON.stringify([]));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminFeatured />);
    fireEvent.click(await screen.findByRole("button", { name: "إضافة بطاقة" }));
    fireEvent.click(screen.getByRole("tab", { name: "بطاقة مخصصة" }));
    fireEvent.change(screen.getByLabelText("العنوان (عربي)"), { target: { value: "جديد" } });
    fireEvent.change(screen.getByLabelText("الرابط"), { target: { value: "/academy" } });
    fireEvent.click(screen.getByText("رفع صورة"));
    fireEvent.click(screen.getByRole("button", { name: "حفظ البطاقة" }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u, i]) => u === "/api/admin/cms/featured" && i?.method === "POST");
      expect(JSON.parse(String(call![1]!.body))).toMatchObject({ sourceKind: "custom", titleAr: "جديد", href: "/academy", imageUrl: "/seed/hero.webp" });
    });
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter @workspace/client exec vitest run src/pages/admin/content/featured.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement**

```tsx
// apps/client/src/pages/admin/content/featured.tsx
import { useEffect, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { adminFetch, adminFetchJson, adminJsonHeaders } from "@/lib/admin-api";
import { searchStoreBooks } from "@/lib/book-catalog";
import type { ContentItem, ListResponse } from "@/lib/cms-types";
import { TYPE_CONFIG } from "@/lib/content-types";
import { PageHeader, Toast, useToast } from "@/pages/admin/layout";
import { ImageUploadField } from "@/pages/admin/_image-upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Source = "content" | "book" | "custom";
interface Slide {
  id: number; position: number; isActive: boolean; sourceKind: Source;
  contentItemId: number | null; medusaProductId: string | null;
  badgeAr: string; badgeEn: string; titleAr: string; titleEn: string; summaryAr: string; summaryEn: string;
  imageUrl: string; ctaLabelAr: string; ctaLabelEn: string; href: string;
  linkedTitleAr: string | null; linkedStatus: string | null;
}
type Draft = Omit<Slide, "id" | "position" | "linkedTitleAr" | "linkedStatus"> & { id?: number; pickedLabel?: string };

const emptyDraft = (): Draft => ({
  isActive: true, sourceKind: "content", contentItemId: null, medusaProductId: null,
  badgeAr: "", badgeEn: "", titleAr: "", titleEn: "", summaryAr: "", summaryEn: "", imageUrl: "", ctaLabelAr: "", ctaLabelEn: "", href: "",
});
const inputCls = "w-full min-h-10 px-3 border border-line rounded bg-white";
const SOURCE_LABELS: Record<Source, string> = { content: "محتوى من الموقع", book: "كتاب من المتجر", custom: "بطاقة مخصصة" };

export default function AdminFeatured() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const { toast, show } = useToast();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const load = () => adminFetchJson<Slide[]>("/api/admin/cms/featured").then(setSlides).catch((e) => show((e as Error).message, "error"));
  useEffect(() => { void load(); }, []);

  const saveOrder = async (next: Slide[]) => {
    setSlides(next);
    const r = await adminFetch("/api/admin/cms/featured/order", { method: "PUT", headers: adminJsonHeaders(), body: JSON.stringify({ ids: next.map((s) => s.id) }) });
    if (!r.ok) { show("تعذّر حفظ الترتيب", "error"); void load(); }
  };
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= slides.length) return;
    void saveOrder(arrayMove(slides, i, j));
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = slides.findIndex((s) => s.id === e.active.id);
    const to = slides.findIndex((s) => s.id === e.over!.id);
    void saveOrder(arrayMove(slides, from, to));
  };

  const persist = async (d: Draft) => {
    const { id, pickedLabel: _p, ...body } = d;
    const r = await adminFetch(id ? `/api/admin/cms/featured/${id}` : "/api/admin/cms/featured", {
      method: id ? "PUT" : "POST", headers: adminJsonHeaders(), body: JSON.stringify(body),
    });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) return show(res.issues?.map((i: { message: string }) => i.message).join("، ") || res.error || "تعذّر الحفظ", "error");
    show("تم الحفظ"); setDraft(null); void load();
  };
  const toggle = (s: Slide) => persist({ ...s, isActive: !s.isActive });
  const remove = async (s: Slide) => {
    if (!window.confirm("حذف هذه البطاقة من المختارات؟")) return;
    const r = await adminFetch(`/api/admin/cms/featured/${s.id}`, { method: "DELETE" });
    if (r.ok) void load(); else show("تعذّر الحذف", "error");
  };

  return (
    <div className="max-w-4xl">
      <Toast toast={toast} />
      <PageHeader
        title="مختارات الرئيسية"
        description="البطاقة الأولى تظهر كبيرة، وتليها ثلاث بطاقات جانبية. يُنصح بأربع إلى ست بطاقات. اسحب لإعادة الترتيب."
        actions={<Button type="button" className="rounded-none gap-2" onClick={() => setDraft(emptyDraft())}><Plus className="w-4 h-4" /> إضافة بطاقة</Button>}
      />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {slides.map((s, i) => (
              <SortableRow key={s.id} slide={s} index={i} total={slides.length} onMove={move} onEdit={() => setDraft({ ...s })} onToggle={() => toggle(s)} onRemove={() => remove(s)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {slides.length === 0 && <p className="text-ink-muted py-8 text-center">لا توجد بطاقات بعد.</p>}
      {draft && <SlideDialog draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={() => persist(draft)} />}
    </div>
  );
}

function SortableRow({ slide, index, total, onMove, onEdit, onToggle, onRemove }: {
  slide: Slide; index: number; total: number; onMove: (i: number, d: number) => void; onEdit: () => void; onToggle: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slide.id });
  const title = slide.titleAr || slide.linkedTitleAr || slide.medusaProductId || "—";
  const warn = slide.sourceKind === "content" && slide.linkedStatus !== "published";
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-3 bg-white border p-3 ${index === 0 ? "border-gold" : "border-line"}`}>
      <button type="button" {...attributes} {...listeners} aria-label="سحب لإعادة الترتيب" className="cursor-grab p-1"><GripVertical className="w-4 h-4" /></button>
      {slide.imageUrl && <img src={slide.imageUrl} alt="" className="w-16 h-10 object-cover" />}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{title}</p>
        <p className="text-xs text-ink-muted">
          {SOURCE_LABELS[slide.sourceKind]}{index === 0 && " · البطاقة الكبيرة"}{!slide.isActive && " · مخفية"}
          {warn && <span className="text-amber-700"> · المحتوى المرتبط غير منشور، فلن تظهر البطاقة</span>}
        </p>
      </div>
      <button type="button" aria-label="تحريك لأعلى" disabled={index === 0} onClick={() => onMove(index, -1)} className="p-1 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
      <button type="button" aria-label="تحريك لأسفل" disabled={index === total - 1} onClick={() => onMove(index, 1)} className="p-1 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={slide.isActive} onChange={onToggle} /> ظاهرة</label>
      <button type="button" aria-label="تعديل" onClick={onEdit} className="p-1"><Pencil className="w-4 h-4" /></button>
      <button type="button" aria-label="حذف" onClick={onRemove} className="p-1 text-destructive"><Trash2 className="w-4 h-4" /></button>
    </li>
  );
}

function SlideDialog({ draft, onChange, onClose, onSave }: { draft: Draft; onChange: (d: Draft) => void; onClose: () => void; onSave: () => void }) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => onChange({ ...draft, [k]: v });
  const custom = draft.sourceKind === "custom";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogTitle>{draft.id ? "تعديل بطاقة" : "إضافة بطاقة"}</DialogTitle>
        <div role="tablist" className="flex gap-2 border-b border-line">
          {(Object.keys(SOURCE_LABELS) as Source[]).map((s) => (
            <button key={s} type="button" role="tab" aria-selected={draft.sourceKind === s} onClick={() => onChange({ ...draft, sourceKind: s, contentItemId: null, medusaProductId: null, pickedLabel: undefined })} className={`px-3 min-h-10 border-b-2 ${draft.sourceKind === s ? "border-gold text-navy font-semibold" : "border-transparent"}`}>
              {SOURCE_LABELS[s]}
            </button>
          ))}
        </div>
        {draft.sourceKind === "content" && <ContentPicker draft={draft} onPick={(id, label) => onChange({ ...draft, contentItemId: id, pickedLabel: label })} />}
        {draft.sourceKind === "book" && <BookPicker draft={draft} onPick={(id, label) => onChange({ ...draft, medusaProductId: id, pickedLabel: label })} />}
        <p className="text-xs text-ink-muted">{custom ? "كل الحقول التالية مطلوبة للبطاقة المخصصة (العنوان والرابط والصورة على الأقل)." : "اترك الحقول التالية فارغة لاستخدام بيانات المادة المرتبطة، أو املأها لتجاوزها."}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["badgeAr", "الشارة (عربي)"], ["badgeEn", "الشارة (إنجليزي)"], ["titleAr", "العنوان (عربي)"], ["titleEn", "العنوان (إنجليزي)"], ["ctaLabelAr", "نص الزر (عربي)"], ["ctaLabelEn", "نص الزر (إنجليزي)"]] as const).map(([k, label]) => (
            <label key={k} className="block"><span className="text-sm">{label}</span><input aria-label={label} className={inputCls} value={draft[k]} onChange={(e) => set(k, e.target.value)} /></label>
          ))}
          {([["summaryAr", "الملخص (عربي)"], ["summaryEn", "الملخص (إنجليزي)"]] as const).map(([k, label]) => (
            <label key={k} className="block sm:col-span-2"><span className="text-sm">{label}</span><textarea aria-label={label} rows={2} className={`${inputCls} py-2`} value={draft[k]} onChange={(e) => set(k, e.target.value)} /></label>
          ))}
          <label className="block sm:col-span-2"><span className="text-sm">الرابط</span><input aria-label="الرابط" dir="ltr" className={inputCls} value={draft.href} placeholder="/academy" onChange={(e) => set("href", e.target.value)} /></label>
          <div className="sm:col-span-2"><span className="text-sm">الصورة</span><ImageUploadField value={draft.imageUrl} onChange={(v) => set("imageUrl", v)} folder="featured" /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-none" onClick={onClose}>إلغاء</Button>
          <Button type="button" className="rounded-none" onClick={onSave}>حفظ البطاقة</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContentPicker({ draft, onPick }: { draft: Draft; onPick: (id: number, label: string) => void }) {
  const [type, setType] = useState<keyof typeof TYPE_CONFIG>("study");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ContentItem[]>([]);
  useEffect(() => {
    const qs = new URLSearchParams({ type, status: "published", pageSize: "20" });
    if (q.trim()) qs.set("q", q.trim());
    const ctrl = new AbortController();
    adminFetch(`/api/admin/cms/items?${qs}`, { signal: ctrl.signal }).then((r) => r.json()).then((d: ListResponse) => setItems(d.items ?? [])).catch(() => {});
    return () => ctrl.abort();
  }, [type, q]);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select aria-label="نوع المحتوى" className={inputCls} value={type} onChange={(e) => setType(e.target.value as keyof typeof TYPE_CONFIG)}>
          {Object.entries(TYPE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.pluralAr}</option>)}
        </select>
        <input aria-label="بحث في المحتوى" className={inputCls} placeholder="بحث" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {draft.contentItemId && <p className="text-sm">المختار: <strong>{draft.pickedLabel ?? `#${draft.contentItemId}`}</strong></p>}
      <ul className="max-h-48 overflow-y-auto border border-line divide-y divide-line">
        {items.map((i) => (
          <li key={i.id}><button type="button" onClick={() => onPick(i.id, i.titleAr)} className={`w-full text-start px-3 py-2 hover:bg-mist ${draft.contentItemId === i.id ? "bg-mist" : ""}`}>{i.titleAr}</button></li>
        ))}
        {items.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">لا يوجد محتوى منشور مطابق.</li>}
      </ul>
    </div>
  );
}

function BookPicker({ draft, onPick }: { draft: Draft; onPick: (id: string, label: string) => void }) {
  const [q, setQ] = useState("");
  const [books, setBooks] = useState<{ id: string; title: string }[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      searchStoreBooks({ q: q.trim() || undefined, limit: 20 })
        .then((r) => alive && (setBooks(r.products.map((p) => ({ id: p.id, title: p.title ?? p.id }))), setFailed(false)))
        .catch(() => alive && setFailed(true));
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [q]);
  return (
    <div className="space-y-2">
      <input aria-label="بحث في الكتب" className={inputCls} placeholder="ابحث بالعنوان أو المؤلف" value={q} onChange={(e) => setQ(e.target.value)} />
      {draft.medusaProductId && <p className="text-sm">المختار: <strong>{draft.pickedLabel ?? draft.medusaProductId}</strong></p>}
      {failed && <p className="text-sm text-destructive">تعذّر الوصول إلى متجر الكتب.</p>}
      <ul className="max-h-48 overflow-y-auto border border-line divide-y divide-line">
        {books.map((b) => (
          <li key={b.id}><button type="button" onClick={() => onPick(b.id, b.title)} className={`w-full text-start px-3 py-2 hover:bg-mist ${draft.medusaProductId === b.id ? "bg-mist" : ""}`}>{b.title}</button></li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Route.** In `App.tsx`, import `AdminFeatured from "@/pages/admin/content/featured"` and add `<Route path="/admin/featured" component={AdminFeatured} />` inside `AdminRouter`'s `<Switch>`, **before** the `/admin/content/...` routes.

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter @workspace/client exec vitest run src/pages/admin/content && pnpm --filter @workspace/client typecheck`
Expected: PASS.

- [ ] **Step 7: Manual check**

In `/admin/featured`:
- Drag the 2nd card to the top, then reload `/`: the large card changed.
- Add a "content" card linked to a published study. Then unpublish the study: the card disappears from the home page, and the admin row shows the amber warning.
- Add a "book" card: the title and cover come from Medusa.

- [ ] **Step 8: Commit**

```bash
git add apps/client/src/pages/admin/content/featured.tsx apps/client/src/pages/admin/content/featured.test.tsx apps/client/src/App.tsx apps/client/package.json pnpm-lock.yaml
git commit -m "feat(admin): featured slider manager with drag-and-drop ordering

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Whole-branch verification

**Files:** none new (fixes only)

- [ ] **Step 1: Full typecheck and tests**

Run: `pnpm typecheck && pnpm test`
Expected: exit 0 for every package. Paste the summary lines (`Test Files … passed`) into the PR description.

- [ ] **Step 2: Production build**

Run: `pnpm build:client && pnpm build:api`
Expected: both succeed. Note the client bundle size from the Vite output. If the main chunk grew by more than ~300 kB because of TipTap and dnd-kit, lazy-load the admin routes: in `App.tsx`, change the three admin content imports to `const X = lazy(() => import(...))` and wrap `AdminRouter`'s `<Switch>` in `<Suspense fallback={null}>`.

- [ ] **Step 3: Manual acceptance pass (both languages, 1280px and 375px)**

Tick each one:
- [ ] Home matches the reference: order, gold badges and buttons, services strip, light footer under the navy newsletter
- [ ] Each "عرض الكل" opens its list page; each card opens its detail page; the back button keeps the filters
- [ ] The header dropdowns work with mouse, keyboard (Tab, Enter, Escape) and touch
- [ ] `/events` redirects; old event rows appear under الفعاليات, and the ones flagged "راجع الموعد" are in قيد المراجعة
- [ ] Store, cart, checkout, sign-in and account still work, with only colours and fonts changed
- [ ] English view: no blank titles; the "not translated yet" note appears on Arabic-only bodies
- [ ] No console errors on any visited page

- [ ] **Step 4: Final review**

Use superpowers:requesting-code-review on the branch diff (`git diff production...feat/redesign-cms`). Fix the findings and re-run Step 1.

- [ ] **Step 5: Hand-off note**

Tell the user:
- The branch is ready for review and has not been merged into `production`.
- Before the first deploy, take a manual `pg_dump` on the server, because `deploy.sh` does not back up.
- The seeded images are low-resolution crops and should be replaced with original photos in the admin.
- Ask them to verify the `DARNOZOM_PUBLISHER` value against Medusa.
