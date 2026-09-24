# Bookstore Catalog Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Dar Nozom store into a proper scholarly bookstore: rich book records, an 8-section classification editable from Medusa Admin, real search (title/author/publisher/section/subject/keywords), independent print and digital editions, an organized bilingual book page with related books, and an API that lets ChatGPT create draft books in bulk.

**Architecture:** Medusa stays the source of truth. A new Medusa module (`bookCatalog`) stores one `book_profile` row per product (authors, publisher, ISBN, …). Categories stay native Medusa product categories (nested: section → subcategory), seeded once and then managed in Medusa Admin. Search runs in a Medusa store route that loads the published book catalog and filters it in memory with Arabic-aware normalization (the catalog is hundreds of books, so no search index or sync job is needed and nothing can go stale). Print and digital are separate variants; a variant's `metadata.sale_enabled === false` takes that edition off sale. A key-protected `/partner/*` API on Medusa lets a Custom GPT create/update draft books.

**Tech Stack:** Medusa 2.21 (modules, workflows, file-based API routes, Admin SDK widgets/routes, `@medusajs/ui`), zod 4, React + wouter + `@medusajs/js-sdk` storefront, Express API (orders), vitest everywhere.

**Spec:** `docs/superpowers/specs/2026-09-24-bookstore-catalog-requirements.md`

## Global Constraints

- Medusa is the source of truth for books, categories, prices and stock; the storefront admin "Books" page stays read-only.
- Books created through the partner (ChatGPT) API are always `status: "draft"`; the API refuses to modify a book that is no longer a draft.
- The partner API never accepts or stores digital book files.
- No digital edition is ever created automatically. A digital edition requires `profile.digital_rights === true`.
- Print and digital each keep their own price, stock/availability and `sale_enabled` flag.
- Money amounts are Medusa v2 major units (66 = 66.00 EGP). Currency is EGP.
- Category display names: `name` = English, `metadata.name_ar` = Arabic, `metadata.darnozom = "book"` marks bookstore categories.
- Book language values: `"ar" | "en" | "both"`.
- UI copy exists in Arabic and English; Arabic is right-to-left.
- Test commands: Medusa `cd apps/medusa && npx vitest run <path>`; API `cd apps/api && node --env-file=../../.env ./node_modules/vitest/vitest.mjs run <path>`; client `cd apps/client && npx vitest run <path>`.
- Commit steps are checkpoints: only run them if the user has asked for commits in this session (their standing rule is "commit only when asked"). Never commit to `production` directly — branch first.

## Review Focus

1. Arabic spelling variants in search — "أصول الفقه", "اصول الفقة" and "أُصُولُ الفِقْه" must all find the same book (tests in Task 1 and Task 11).
2. ISBN typed with hyphens/spaces or an ISBN-10 ending in X — accepted, stored normalized, and treated as the same book (Task 1, Task 19).
3. ChatGPT retrying the same request — second call updates the same draft instead of creating a duplicate; a published book is refused with 409 (Task 19).
4. Image URLs pointing at internal addresses (`http://127.0.0.1`, `169.254.169.254`, `http://` anything) — rejected before any request is made (Task 18).
5. Running the catalog seed twice, or after staff renamed a section — no duplicate categories, staff renames preserved (Task 4).

---

## File Map

**Medusa (`apps/medusa`)**
- `src/lib/book-text.ts` — Arabic-aware normalization, ISBN helpers (Task 1)
- `src/lib/book-input.ts` — zod schemas for profile / create-book input (Task 2)
- `src/modules/book-catalog/` — `BookProfile` model, service, `profile-store.ts` upsert logic, migration (Task 3)
- `src/lib/save-book-profile.ts` — save profile + mirror author + ensure primary category on product (Task 5)
- `src/lib/book-taxonomy.ts`, `src/lib/seed-book-catalog.ts`, `src/scripts/seed-book-catalog.ts` — 8 sections, legacy mapping, profile backfill (Task 4)
- `src/api/admin/books/[id]/profile/route.ts` (Task 5)
- `src/lib/create-book-product.ts` (modify), `src/lib/create-book.ts`, `src/api/admin/books/route.ts` (rewrite) (Task 6)
- `src/subscribers/auto-add-book-editions.ts` (modify) (Task 7)
- `src/lib/book-editions.ts`, `src/api/admin/books/[id]/editions/route.ts`, `src/api/admin/books/[id]/editions/[variantId]/route.ts` (Task 8)
- `src/admin/lib/book-profile-form.ts`, `src/admin/lib/category-tree.ts`, `src/admin/components/book-profile-fields.tsx`, `src/admin/components/category-picker.tsx`, `src/admin/widgets/book-profile.tsx`, `src/admin/widgets/book-editions.tsx`, `src/admin/routes/create-book/page.tsx` (rewrite) (Task 10)
- `src/lib/book-search.ts`, `src/lib/book-catalog-loader.ts`, `src/api/store/books/search/route.ts`, `src/api/store/books/[id]/route.ts` (Tasks 11–12)
- `src/lib/partner-auth.ts`, `src/lib/safe-image-fetch.ts`, `src/lib/partner-books.ts`, `src/lib/partner-openapi.ts`, `src/api/partner/**` (Tasks 17–20)

**Client (`apps/client/src`)**
- `lib/book-variants.ts` (modify) (Task 9)
- `lib/book-catalog.ts`, `lib/book-filters.ts` (Task 13)
- `components/store/category-filter.tsx`, `components/store/facet-select.tsx`, `pages/store-books.tsx` (modify) (Task 14)
- `components/store/book-profile-panel.tsx`, `components/store/related-books.tsx`, `pages/store-book-detail.tsx` (modify) (Task 15)
- `pages/admin/store/books.tsx` (modify) (Task 16)

**API (`apps/api`)**
- `src/lib/medusa-book-variants.ts` (modify) (Task 9)

**Docs / deploy**
- `docs/chatgpt-books-api.md` (Task 20), `deploy/deploy.sh`, `apps/medusa/.env.template` (Task 21)

---

# Phase 1 — Catalog data

### Task 1: Arabic-aware text normalization and ISBN helpers

**Files:**
- Create: `apps/medusa/src/lib/book-text.ts`
- Test: `apps/medusa/src/lib/book-text.test.ts`

**Interfaces:**
- Produces: `normalizeSearchText(input: string | null | undefined): string`, `searchTokens(q: string | null | undefined): string[]`, `normalizeIsbn(raw: string | null | undefined): string | null`, `isValidIsbn(raw: string | null | undefined): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// apps/medusa/src/lib/book-text.test.ts
import { describe, it, expect } from "vitest";
import { isValidIsbn, normalizeIsbn, normalizeSearchText, searchTokens } from "./book-text";

describe("normalizeSearchText", () => {
  it("treats common Arabic spelling variants as the same text", () => {
    const forms = ["أصول الفقه", "اصول الفقة", "أُصُولُ الفِقْهِ", "إصول  الفقــه"];
    const normalized = forms.map(normalizeSearchText);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("اصول الفقه");
  });

  it("folds alef maqsura, hamza carriers and case; drops punctuation", () => {
    expect(normalizeSearchText("مُصطفى")).toBe("مصطفي");
    expect(normalizeSearchText("مسؤولية")).toBe(normalizeSearchText("مسوولية"));
    expect(normalizeSearchText("Public-Policy, 2nd ed.")).toBe("public policy 2nd ed");
  });

  it("returns an empty string for missing input", () => {
    expect(normalizeSearchText(null)).toBe("");
    expect(normalizeSearchText(undefined)).toBe("");
  });
});

describe("searchTokens", () => {
  it("splits a normalized query into words", () => {
    expect(searchTokens("  الإدارة   العامة ")).toEqual(["الاداره", "العامه"]);
    expect(searchTokens("")).toEqual([]);
  });
});

describe("ISBN", () => {
  it("normalizes hyphens, spaces and a lowercase x", () => {
    expect(normalizeIsbn("978-0-306-40615-7")).toBe("9780306406157");
    expect(normalizeIsbn(" 0 8044 2957 x ")).toBe("080442957X");
    expect(normalizeIsbn("")).toBeNull();
    expect(normalizeIsbn(null)).toBeNull();
  });

  it("validates ISBN-13 and ISBN-10 checksums", () => {
    expect(isValidIsbn("978-0-306-40615-7")).toBe(true);
    expect(isValidIsbn("0-306-40615-2")).toBe(true);
    expect(isValidIsbn("0-8044-2957-X")).toBe(true);
    expect(isValidIsbn("978-0-306-40615-8")).toBe(false);
    expect(isValidIsbn("12345")).toBe(false);
    expect(isValidIsbn(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/medusa && npx vitest run src/lib/book-text.test.ts`
Expected: FAIL — `Cannot find module './book-text'`

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/medusa/src/lib/book-text.ts

// Arabic diacritics (harakat, tanween, shadda, sukun, Quranic marks) and tatweel.
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

/**
 * Normalizes text for search so common Arabic spelling variants match:
 * alef forms (أ إ آ ٱ → ا), taa marbuta (ة → ه), alef maqsura (ى → ي),
 * hamza carriers (ؤ → و, ئ → ي), no diacritics or tatweel. Latin text is
 * lower-cased. Anything that isn't a letter or digit becomes a space.
 */
export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function searchTokens(q: string | null | undefined): string[] {
  return normalizeSearchText(q).split(" ").filter(Boolean);
}

/** Digits (and a final X) only, upper-cased; null when nothing is left. */
export function normalizeIsbn(raw: string | null | undefined): string | null {
  const s = (raw ?? "").toUpperCase().replace(/[^0-9X]/g, "");
  return s || null;
}

export function isValidIsbn(raw: string | null | undefined): boolean {
  const s = normalizeIsbn(raw);
  if (!s) return false;
  if (s.length === 10) {
    if (!/^\d{9}[\dX]$/.test(s)) return false;
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += (s[i] === "X" ? 10 : Number(s[i])) * (10 - i);
    return sum % 11 === 0;
  }
  if (s.length === 13) {
    if (!/^\d{13}$/.test(s)) return false;
    let sum = 0;
    for (let i = 0; i < 13; i++) sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3);
    return sum % 10 === 0;
  }
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/medusa && npx vitest run src/lib/book-text.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/lib/book-text.ts apps/medusa/src/lib/book-text.test.ts
git commit -m "feat(books): Arabic-aware search normalization and ISBN helpers"
```

---

### Task 2: Input validation for book profiles and new books

**Files:**
- Create: `apps/medusa/src/lib/book-input.ts`
- Test: `apps/medusa/src/lib/book-input.test.ts`

**Interfaces:**
- Consumes: `normalizeIsbn`, `isValidIsbn` (Task 1)
- Produces:
  - `bookProfileSchema` (zod), `type BookProfileInput` =
    `{ authors: string[]; editors: string[]; translators: string[]; publisher: string | null; isbn: string | null; external_id: string | null; publication_year: number | null; edition_number: number | null; pages: number | null; volumes: number; language: "ar" | "en" | "both"; primary_category_id: string | null; keywords: string[]; target_audience: string | null; table_of_contents: string | null; digital_rights: boolean }`
  - `createBookSchema`, `type CreateBookInput` =
    `{ title: string; subtitle: string | null; description: string | null; status: "draft" | "published"; sales_channel_id: string; image_urls: string[]; additional_category_ids: string[]; print: { price: number; stock: number } | null; digital: { price: number } | null; profile: BookProfileInput }`
  - `type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] }`
  - `parseBookProfile(raw: unknown): ParseResult<BookProfileInput>`, `parseCreateBook(raw: unknown): ParseResult<CreateBookInput>`

- [ ] **Step 1: Write the failing test**

```ts
// apps/medusa/src/lib/book-input.test.ts
import { describe, it, expect } from "vitest";
import { parseBookProfile, parseCreateBook } from "./book-input";

const profile = { authors: ["  د. أحمد يوسف "], language: "ar" };

describe("parseBookProfile", () => {
  it("fills defaults and trims", () => {
    const r = parseBookProfile(profile);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      authors: ["د. أحمد يوسف"],
      editors: [],
      translators: [],
      publisher: null,
      isbn: null,
      external_id: null,
      publication_year: null,
      edition_number: null,
      pages: null,
      volumes: 1,
      language: "ar",
      primary_category_id: null,
      keywords: [],
      target_audience: null,
      table_of_contents: null,
      digital_rights: false,
    });
  });

  it("requires at least one author and a known language", () => {
    const r = parseBookProfile({ authors: [], language: "fr" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join("\n")).toMatch(/authors/);
    expect(r.errors.join("\n")).toMatch(/language/);
  });

  it("normalizes a valid ISBN and rejects a bad checksum", () => {
    const good = parseBookProfile({ ...profile, isbn: "978-0-306-40615-7" });
    expect(good.ok && good.value.isbn).toBe("9780306406157");
    const bad = parseBookProfile({ ...profile, isbn: "978-0-306-40615-8" });
    expect(bad.ok).toBe(false);
  });

  it("dedupes keywords case-insensitively and bounds numbers", () => {
    const r = parseBookProfile({ ...profile, keywords: ["Waqf", "waqf", " الوقف "], pages: 320 });
    expect(r.ok && r.value.keywords).toEqual(["Waqf", "الوقف"]);
    expect(parseBookProfile({ ...profile, pages: 0 }).ok).toBe(false);
    expect(parseBookProfile({ ...profile, publication_year: 3000 }).ok).toBe(false);
  });
});

describe("parseCreateBook", () => {
  const base = {
    title: "السياسة الشرعية",
    sales_channel_id: "sc_1",
    profile,
  };

  it("accepts a print-only book", () => {
    const r = parseCreateBook({ ...base, print: { price: 120, stock: 5 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.print).toEqual({ price: 120, stock: 5 });
    expect(r.value.digital).toBeNull();
    expect(r.value.status).toBe("draft");
  });

  it("rejects a book with no edition", () => {
    const r = parseCreateBook(base);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join()).toMatch(/print edition, a digital edition, or both/);
  });

  it("rejects a digital edition without digital distribution rights", () => {
    const r = parseCreateBook({ ...base, digital: { price: 40 } });
    expect(r.ok).toBe(false);
    const ok = parseCreateBook({
      ...base,
      digital: { price: 40 },
      profile: { ...profile, digital_rights: true },
    });
    expect(ok.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/medusa && npx vitest run src/lib/book-input.test.ts`
Expected: FAIL — `Cannot find module './book-input'`

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/medusa/src/lib/book-input.ts
import { z } from "zod";
import { isValidIsbn, normalizeIsbn } from "./book-text";

const personName = z.string().trim().min(1).max(200);
const people = z.array(personName).max(20);
const optionalText = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => (v ? v : null));
const optionalInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullish().transform((v) => v ?? null);
const maxYear = new Date().getFullYear() + 1;

export const bookProfileSchema = z.object({
  authors: people.min(1, "at least one author is required"),
  editors: people.default([]),
  translators: people.default([]),
  publisher: optionalText(200),
  isbn: z
    .string()
    .nullish()
    .transform((v) => normalizeIsbn(v))
    .refine((v) => v === null || isValidIsbn(v), "isbn is not a valid ISBN-10 or ISBN-13"),
  external_id: optionalText(100),
  publication_year: optionalInt(1000, maxYear),
  edition_number: optionalInt(1, 200),
  pages: optionalInt(1, 100_000),
  volumes: z.number().int().min(1).max(500).default(1),
  language: z.enum(["ar", "en", "both"]),
  primary_category_id: optionalText(100),
  keywords: z
    .array(z.string().trim().min(1).max(60))
    .max(30)
    .default([])
    // Case-insensitive dedupe that keeps the first spelling ("Waqf", not "waqf").
    .transform((ks) => ks.filter((k, i) => ks.findIndex((x) => x.toLowerCase() === k.toLowerCase()) === i)),
  target_audience: optionalText(500),
  table_of_contents: optionalText(20_000),
  digital_rights: z.boolean().default(false),
});
export type BookProfileInput = z.output<typeof bookProfileSchema>;

const price = z.number().positive().max(1_000_000);

export const createBookSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    subtitle: optionalText(300),
    description: optionalText(20_000),
    status: z.enum(["draft", "published"]).default("draft"),
    sales_channel_id: z.string().trim().min(1),
    image_urls: z.array(z.string().url()).max(20).default([]),
    additional_category_ids: z.array(z.string().trim().min(1)).max(20).default([]),
    print: z
      .object({ price, stock: z.number().int().min(0).max(1_000_000).default(0) })
      .nullable()
      .default(null),
    digital: z.object({ price }).nullable().default(null),
    profile: bookProfileSchema,
  })
  .superRefine((v, ctx) => {
    if (!v.print && !v.digital) {
      ctx.addIssue({
        code: "custom",
        path: ["print"],
        message: "a book needs a print edition, a digital edition, or both",
      });
    }
    if (v.digital && !v.profile.digital_rights) {
      ctx.addIssue({
        code: "custom",
        path: ["digital"],
        message: "a digital edition needs digital distribution rights (profile.digital_rights)",
      });
    }
  });
export type CreateBookInput = z.output<typeof createBookSchema>;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function toResult<T>(r: { success: true; data: T } | { success: false; error: z.ZodError }): ParseResult<T> {
  if (r.success) return { ok: true, value: r.data };
  return {
    ok: false,
    errors: r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`),
  };
}

export function parseBookProfile(raw: unknown): ParseResult<BookProfileInput> {
  return toResult(bookProfileSchema.safeParse(raw));
}

export function parseCreateBook(raw: unknown): ParseResult<CreateBookInput> {
  return toResult(createBookSchema.safeParse(raw));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/medusa && npx vitest run src/lib/book-input.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/lib/book-input.ts apps/medusa/src/lib/book-input.test.ts
git commit -m "feat(books): validation for book profiles and new books"
```

---

### Task 3: `bookCatalog` module with the `BookProfile` model

**Files:**
- Create: `apps/medusa/src/modules/book-catalog/models/book-profile.ts`
- Create: `apps/medusa/src/modules/book-catalog/service.ts`
- Create: `apps/medusa/src/modules/book-catalog/profile-store.ts`
- Create: `apps/medusa/src/modules/book-catalog/index.ts`
- Create (generated): `apps/medusa/src/modules/book-catalog/migrations/Migration<timestamp>.ts`
- Modify: `apps/medusa/medusa-config.ts` (modules list, next to `./src/modules/manual-payment`)
- Test: `apps/medusa/src/modules/book-catalog/profile-store.test.ts`

**Interfaces:**
- Consumes: `BookProfileInput` (Task 2)
- Produces:
  - `BOOK_CATALOG_MODULE = "bookCatalog"`
  - `type BookProfileRow = BookProfileInput & { id: string; product_id: string }`
  - `interface BookProfileRepo { listBookProfiles(filters: Record<string, unknown>): Promise<BookProfileRow[]>; createBookProfiles(data: Record<string, unknown>): Promise<BookProfileRow>; updateBookProfiles(data: Record<string, unknown>): Promise<BookProfileRow> }` (satisfied by the generated service)
  - `upsertBookProfile(repo: BookProfileRepo, productId: string, input: BookProfileInput): Promise<BookProfileRow>`
  - `findProfileByIdentity(repo: BookProfileRepo, id: { isbn?: string | null; external_id?: string | null }): Promise<BookProfileRow | null>`
  - `class BookProfileConflictError extends Error`

- [ ] **Step 1: Write the failing test**

```ts
// apps/medusa/src/modules/book-catalog/profile-store.test.ts
import { describe, it, expect } from "vitest";
import {
  BookProfileConflictError,
  findProfileByIdentity,
  upsertBookProfile,
  type BookProfileRepo,
  type BookProfileRow,
} from "./profile-store";
import type { BookProfileInput } from "../../lib/book-input";

function fakeRepo(rows: BookProfileRow[] = []): BookProfileRepo & { rows: BookProfileRow[] } {
  return {
    rows,
    async listBookProfiles(filters) {
      return rows.filter((r) =>
        Object.entries(filters).every(([k, v]) => (r as Record<string, unknown>)[k] === v),
      );
    },
    async createBookProfiles(data) {
      const row = { id: `bp_${rows.length + 1}`, ...data } as BookProfileRow;
      rows.push(row);
      return row;
    },
    async updateBookProfiles(data) {
      const i = rows.findIndex((r) => r.id === data.id);
      rows[i] = { ...rows[i], ...data } as BookProfileRow;
      return rows[i];
    },
  };
}

const input: BookProfileInput = {
  authors: ["A"], editors: [], translators: [], publisher: null, isbn: "9780306406157",
  external_id: null, publication_year: null, edition_number: null, pages: null, volumes: 1,
  language: "ar", primary_category_id: null, keywords: [], target_audience: null,
  table_of_contents: null, digital_rights: false,
};

describe("upsertBookProfile", () => {
  it("creates a profile for a product, then updates the same row", async () => {
    const repo = fakeRepo();
    const created = await upsertBookProfile(repo, "prod_1", input);
    expect(created.product_id).toBe("prod_1");
    const updated = await upsertBookProfile(repo, "prod_1", { ...input, pages: 200 });
    expect(updated.id).toBe(created.id);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].pages).toBe(200);
  });

  it("refuses an ISBN that already belongs to another product", async () => {
    const repo = fakeRepo();
    await upsertBookProfile(repo, "prod_1", input);
    await expect(upsertBookProfile(repo, "prod_2", input)).rejects.toBeInstanceOf(
      BookProfileConflictError,
    );
  });

  it("refuses an external_id that already belongs to another product", async () => {
    const repo = fakeRepo();
    await upsertBookProfile(repo, "prod_1", { ...input, isbn: null, external_id: "gpt-1" });
    await expect(
      upsertBookProfile(repo, "prod_2", { ...input, isbn: null, external_id: "gpt-1" }),
    ).rejects.toThrow(/external_id gpt-1/);
  });
});

describe("findProfileByIdentity", () => {
  it("finds by ISBN first, then external_id", async () => {
    const repo = fakeRepo();
    await upsertBookProfile(repo, "prod_1", { ...input, external_id: "gpt-1" });
    expect((await findProfileByIdentity(repo, { isbn: "9780306406157" }))?.product_id).toBe("prod_1");
    expect((await findProfileByIdentity(repo, { external_id: "gpt-1" }))?.product_id).toBe("prod_1");
    expect(await findProfileByIdentity(repo, {})).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/medusa && npx vitest run src/modules/book-catalog/profile-store.test.ts`
Expected: FAIL — `Cannot find module './profile-store'`

- [ ] **Step 3: Write the model, service, store and module definition**

```ts
// apps/medusa/src/modules/book-catalog/models/book-profile.ts
import { model } from "@medusajs/framework/utils";

// Scholarly metadata for one book product (one row per product). Lists are
// JSON arrays of strings. ISBN / external_id are unique so the ChatGPT API
// can upsert without creating duplicates.
export const BookProfile = model
  .define("book_profile", {
    id: model.id().primaryKey(),
    product_id: model.text().unique(),
    authors: model.json().nullable(),
    editors: model.json().nullable(),
    translators: model.json().nullable(),
    publisher: model.text().nullable(),
    isbn: model.text().nullable(),
    external_id: model.text().nullable(),
    publication_year: model.number().nullable(),
    edition_number: model.number().nullable(),
    pages: model.number().nullable(),
    volumes: model.number().default(1),
    language: model.enum(["ar", "en", "both"]).default("ar"),
    primary_category_id: model.text().nullable(),
    keywords: model.json().nullable(),
    target_audience: model.text().nullable(),
    table_of_contents: model.text().nullable(),
    digital_rights: model.boolean().default(false),
  })
  .indexes([
    { on: ["isbn"], unique: true, where: "isbn IS NOT NULL" },
    { on: ["external_id"], unique: true, where: "external_id IS NOT NULL" },
  ]);
```

```ts
// apps/medusa/src/modules/book-catalog/service.ts
import { MedusaService } from "@medusajs/framework/utils";
import { BookProfile } from "./models/book-profile";

// Generated CRUD: listBookProfiles / createBookProfiles / updateBookProfiles /
// deleteBookProfiles. Upsert rules live in profile-store.ts (unit-tested).
class BookCatalogModuleService extends MedusaService({ BookProfile }) {}

export default BookCatalogModuleService;
```

```ts
// apps/medusa/src/modules/book-catalog/profile-store.ts
import type { BookProfileInput } from "../../lib/book-input";

export type BookProfileRow = BookProfileInput & { id: string; product_id: string };

export interface BookProfileRepo {
  listBookProfiles(filters: Record<string, unknown>): Promise<BookProfileRow[]>;
  createBookProfiles(data: Record<string, unknown>): Promise<BookProfileRow>;
  updateBookProfiles(data: Record<string, unknown>): Promise<BookProfileRow>;
}

export class BookProfileConflictError extends Error {}

async function assertUnique(
  repo: BookProfileRepo,
  field: "isbn" | "external_id",
  value: string | null,
  productId: string,
) {
  if (!value) return;
  const [other] = await repo.listBookProfiles({ [field]: value });
  if (other && other.product_id !== productId) {
    throw new BookProfileConflictError(
      `${field} ${value} already belongs to product ${other.product_id}`,
    );
  }
}

export async function upsertBookProfile(
  repo: BookProfileRepo,
  productId: string,
  input: BookProfileInput,
): Promise<BookProfileRow> {
  await assertUnique(repo, "isbn", input.isbn, productId);
  await assertUnique(repo, "external_id", input.external_id, productId);
  const [existing] = await repo.listBookProfiles({ product_id: productId });
  if (existing) return repo.updateBookProfiles({ id: existing.id, ...input });
  return repo.createBookProfiles({ product_id: productId, ...input });
}

export async function findProfileByIdentity(
  repo: BookProfileRepo,
  id: { isbn?: string | null; external_id?: string | null },
): Promise<BookProfileRow | null> {
  if (id.isbn) {
    const [row] = await repo.listBookProfiles({ isbn: id.isbn });
    if (row) return row;
  }
  if (id.external_id) {
    const [row] = await repo.listBookProfiles({ external_id: id.external_id });
    if (row) return row;
  }
  return null;
}
```

```ts
// apps/medusa/src/modules/book-catalog/index.ts
import { Module } from "@medusajs/framework/utils";
import BookCatalogModuleService from "./service";

export const BOOK_CATALOG_MODULE = "bookCatalog";

export default Module(BOOK_CATALOG_MODULE, {
  service: BookCatalogModuleService,
});

export * from "./profile-store";
```

In `apps/medusa/medusa-config.ts`, add to the `modules` array directly after the `./src/modules/manual-payment` entry:

```ts
    {
      resolve: './src/modules/book-catalog',
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/medusa && npx vitest run src/modules/book-catalog/profile-store.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Generate and apply the migration**

Run: `cd apps/medusa && npx medusa db:generate bookCatalog && npx medusa db:migrate`
Expected: a new `src/modules/book-catalog/migrations/Migration*.ts` creating table `book_profile` with a unique index on `product_id` and partial unique indexes on `isbn` and `external_id`; `db:migrate` reports it applied. Open the generated file and confirm those three indexes are present.

- [ ] **Step 6: Commit**

```bash
git add apps/medusa/src/modules/book-catalog apps/medusa/medusa-config.ts
git commit -m "feat(books): bookCatalog module with book_profile table"
```

---

### Task 4: Classification seed, legacy category mapping and profile backfill

**Files:**
- Create: `apps/medusa/src/lib/book-taxonomy.ts`
- Create: `apps/medusa/src/lib/seed-book-catalog.ts`
- Create: `apps/medusa/src/scripts/seed-book-catalog.ts`
- Test: `apps/medusa/src/lib/seed-book-catalog.test.ts`

**Interfaces:**
- Consumes: `normalizeIsbn`, `isValidIsbn` (Task 1); `BookProfileInput` (Task 2); `BOOK_CATALOG_MODULE`, `upsertBookProfile` (Task 3)
- Produces:
  - `BOOK_TAXONOMY: TaxonomySection[]` where `TaxonomySection = { handle: string; name: string; name_ar: string; children: { handle: string; name: string; name_ar: string }[] }`
  - `LEGACY_CATEGORY_MOVES: Array<{ handle: string; action: "merge"; into: string } | { handle: string; action: "reparent"; under: string }>`
  - `seedBookCatalog(deps: SeedDeps): Promise<SeedReport>` with `SeedReport = { createdCategories: number; mergedCategories: number; reparentedCategories: number; createdProfiles: number }`

- [ ] **Step 1: Write the taxonomy data (no test needed for pure data; Task 4's test exercises it)**

```ts
// apps/medusa/src/lib/book-taxonomy.ts

// Initial scientific classification. Seeded once by
// src/scripts/seed-book-catalog.ts; after that staff own it in Medusa Admin →
// Products → Categories (rename / add / remove). The seed never renames or
// deletes a category that already exists, so staff edits survive re-runs.
export type TaxonomyNode = { handle: string; name: string; name_ar: string };
export type TaxonomySection = TaxonomyNode & { children: TaxonomyNode[] };

export const BOOK_TAXONOMY: TaxonomySection[] = [
  {
    handle: "islamic-law-thought",
    name: "Islamic Law and Thought",
    name_ar: "الشريعة والفكر الإسلامي",
    children: [
      { handle: "fiqh-usul", name: "Fiqh and Its Principles", name_ar: "الفقه وأصوله" },
      { handle: "maqasid", name: "Objectives of Shariah", name_ar: "مقاصد الشريعة" },
      { handle: "siyasa-shariyya", name: "Shariah-Based Governance", name_ar: "السياسة الشرعية" },
      { handle: "ijtihad-fatwa", name: "Ijtihad and Fatwa", name_ar: "الاجتهاد والفتوى" },
      { handle: "contemporary-islamic-thought", name: "Contemporary Islamic Thought", name_ar: "الفكر الإسلامي المعاصر" },
    ],
  },
  {
    handle: "islamic-systems",
    name: "Islamic Systems",
    name_ar: "النظم الإسلامية",
    children: [
      { handle: "islamic-political-system", name: "Political System in Islam", name_ar: "النظام السياسي في الإسلام" },
      { handle: "islamic-judicial-system", name: "Judicial System", name_ar: "النظام القضائي" },
      { handle: "islamic-social-system", name: "Social System", name_ar: "النظام الاجتماعي" },
      { handle: "hisba-oversight", name: "Hisba and Oversight", name_ar: "الحسبة والرقابة" },
      { handle: "waqf-system", name: "Endowment (Waqf) System", name_ar: "نظام الوقف" },
    ],
  },
  {
    handle: "public-policies",
    name: "Public Policies",
    name_ar: "السياسات العامة",
    children: [
      { handle: "policy-analysis", name: "Policy Analysis", name_ar: "تحليل السياسات" },
      { handle: "social-policy", name: "Social Policy", name_ar: "السياسات الاجتماعية" },
      { handle: "economic-development-policy", name: "Economic and Development Policy", name_ar: "السياسات الاقتصادية والتنموية" },
      { handle: "education-policy", name: "Education Policy", name_ar: "السياسات التعليمية" },
      { handle: "governance", name: "Governance", name_ar: "الحوكمة" },
    ],
  },
  {
    handle: "public-administration",
    name: "Public Administration",
    name_ar: "الإدارة العامة",
    children: [
      { handle: "government-administration", name: "Government Administration", name_ar: "الإدارة الحكومية" },
      { handle: "digital-transformation", name: "Digital Transformation", name_ar: "التحول الرقمي" },
      { handle: "administrative-reform", name: "Administrative Reform", name_ar: "الإصلاح الإداري" },
      { handle: "public-sector-hr", name: "Public Sector Human Resources", name_ar: "الموارد البشرية في القطاع العام" },
      { handle: "local-administration", name: "Local Administration", name_ar: "الإدارة المحلية" },
    ],
  },
  {
    handle: "management-leadership",
    name: "Management and Leadership",
    name_ar: "الإدارة والقيادة",
    children: [
      { handle: "leadership", name: "Leadership", name_ar: "القيادة" },
      { handle: "strategic-management", name: "Strategic Management", name_ar: "الإدارة الاستراتيجية" },
      { handle: "organizational-behavior", name: "Organizational Behavior", name_ar: "السلوك التنظيمي" },
      { handle: "project-management", name: "Project Management", name_ar: "إدارة المشاريع" },
      { handle: "institutional-excellence", name: "Institutional Excellence and Quality", name_ar: "التميز المؤسسي والجودة" },
    ],
  },
  {
    handle: "islamic-economics-finance",
    name: "Islamic Economics and Financial Transactions",
    name_ar: "الاقتصاد الإسلامي والمعاملات المالية",
    children: [
      { handle: "islamic-economics", name: "Islamic Economics", name_ar: "الاقتصاد الإسلامي" },
      { handle: "financial-transactions-fiqh", name: "Jurisprudence of Financial Transactions", name_ar: "فقه المعاملات المالية" },
      { handle: "islamic-banking-finance", name: "Islamic Banking and Finance", name_ar: "المصرفية والتمويل الإسلامي" },
      { handle: "zakat-waqf", name: "Zakat and Waqf", name_ar: "الزكاة والوقف" },
      { handle: "takaful", name: "Takaful (Islamic Insurance)", name_ar: "التأمين التكافلي" },
    ],
  },
  {
    handle: "islamic-sciences",
    name: "Islamic Sciences",
    name_ar: "العلوم الإسلامية",
    children: [
      { handle: "quran-tafsir", name: "Quranic Sciences and Tafsir", name_ar: "علوم القرآن والتفسير" },
      { handle: "hadith", name: "Hadith and Its Sciences", name_ar: "الحديث وعلومه" },
      { handle: "aqidah", name: "Creed (Aqidah)", name_ar: "العقيدة" },
      { handle: "seerah-history", name: "Seerah and Islamic History", name_ar: "السيرة والتاريخ الإسلامي" },
      { handle: "arabic-language", name: "Arabic Language Sciences", name_ar: "اللغة العربية وعلومها" },
    ],
  },
  {
    handle: "children-youth-family",
    name: "Children's, Young Adult, and Family Education",
    name_ar: "كتب الأطفال والناشئة والتربية الأسرية",
    children: [
      { handle: "children-books", name: "Children's Books", name_ar: "كتب الأطفال" },
      { handle: "young-adult-books", name: "Young Adult Books", name_ar: "كتب الناشئة" },
      { handle: "parenting-family", name: "Parenting and Family Education", name_ar: "التربية الأسرية" },
      { handle: "values-character", name: "Values and Character", name_ar: "القيم والأخلاق" },
    ],
  },
];

// Categories that existed before the classification. "merge": products move
// into the target and the old category is deleted. "reparent": the category
// (and its products) is kept and placed under a section.
export const LEGACY_CATEGORY_MOVES = [
  { handle: "shariah", action: "merge", into: "islamic-law-thought" },
  { handle: "management", action: "merge", into: "management-leadership" },
  { handle: "digital-transformation", action: "reparent", under: "public-administration" },
] as const;
```

- [ ] **Step 2: Write the failing test for the seed orchestration**

```ts
// apps/medusa/src/lib/seed-book-catalog.test.ts
import { describe, it, expect } from "vitest";
import { seedBookCatalog, type CategoryRow, type SeedDeps } from "./seed-book-catalog";
import { BOOK_TAXONOMY } from "./book-taxonomy";

type Product = {
  id: string;
  metadata: Record<string, unknown> | null;
  category_ids: string[];
  has_digital: boolean;
};

function world(initialCategories: CategoryRow[], products: Product[]) {
  const categories = [...initialCategories];
  const profiles = new Map<string, Record<string, unknown>>();
  let seq = 0;
  const deps: SeedDeps = {
    async listCategories() {
      return categories.map((c) => ({ ...c }));
    },
    async createCategory(input) {
      const row = { id: `pcat_${++seq}`, ...input };
      categories.push(row);
      return row;
    },
    async updateCategory(id, update) {
      const c = categories.find((x) => x.id === id)!;
      Object.assign(c, update);
    },
    async deleteCategory(id) {
      categories.splice(categories.findIndex((c) => c.id === id), 1);
    },
    async listProductIdsInCategory(categoryId) {
      return products.filter((p) => p.category_ids.includes(categoryId)).map((p) => p.id);
    },
    async getProductCategoryIds(productId) {
      return products.find((p) => p.id === productId)!.category_ids;
    },
    async setProductCategoryIds(productId, ids) {
      products.find((p) => p.id === productId)!.category_ids = ids;
    },
    async listBookProducts() {
      return products.map((p) => ({ ...p }));
    },
    async hasProfile(productId) {
      return profiles.has(productId);
    },
    async upsertProfile(productId, input) {
      profiles.set(productId, input as unknown as Record<string, unknown>);
    },
    log() {},
  };
  return { deps, categories, products, profiles };
}

const legacy: CategoryRow[] = [
  { id: "pcat_shariah", handle: "shariah", name: "Shariah", parent_category_id: null, metadata: { darnozom: "book" } },
  { id: "pcat_mgmt", handle: "management", name: "Management", parent_category_id: null, metadata: { darnozom: "book" } },
  { id: "pcat_dt", handle: "digital-transformation", name: "Digital Transformation", parent_category_id: null, metadata: { darnozom: "book" } },
];

describe("seedBookCatalog", () => {
  it("creates 8 sections with their subcategories, marked as book categories", async () => {
    const w = world([], []);
    await seedBookCatalog(w.deps);
    const sections = w.categories.filter((c) => c.parent_category_id === null);
    expect(sections.map((s) => s.handle)).toEqual(BOOK_TAXONOMY.map((s) => s.handle));
    const law = sections.find((s) => s.handle === "islamic-law-thought")!;
    expect(law.metadata).toMatchObject({ darnozom: "book", name_ar: "الشريعة والفكر الإسلامي" });
    const lawChildren = w.categories.filter((c) => c.parent_category_id === law.id);
    expect(lawChildren.length).toBe(BOOK_TAXONOMY[0].children.length);
  });

  it("moves books from merged legacy categories and re-parents Digital Transformation", async () => {
    const w = world(legacy, [
      { id: "prod_1", metadata: { author: "أحمد" }, category_ids: ["pcat_shariah"], has_digital: false },
      { id: "prod_2", metadata: null, category_ids: ["pcat_mgmt", "pcat_dt"], has_digital: true },
    ]);
    const report = await seedBookCatalog(w.deps);
    const byHandle = (h: string) => w.categories.find((c) => c.handle === h);
    expect(byHandle("shariah")).toBeUndefined();
    expect(byHandle("management")).toBeUndefined();
    expect(w.products[0].category_ids).toEqual([byHandle("islamic-law-thought")!.id]);
    expect(w.products[1].category_ids.sort()).toEqual(
      ["pcat_dt", byHandle("management-leadership")!.id].sort(),
    );
    expect(byHandle("digital-transformation")!.parent_category_id).toBe(
      byHandle("public-administration")!.id,
    );
    expect(report).toMatchObject({ mergedCategories: 2, reparentedCategories: 1 });
  });

  it("is safe to run twice and keeps staff renames", async () => {
    const w = world([], []);
    await seedBookCatalog(w.deps);
    const count = w.categories.length;
    const law = w.categories.find((c) => c.handle === "islamic-law-thought")!;
    law.name = "Shariah & Islamic Thought"; // staff rename in Medusa Admin
    const second = await seedBookCatalog(w.deps);
    expect(w.categories.length).toBe(count);
    expect(second.createdCategories).toBe(0);
    expect(w.categories.find((c) => c.handle === "islamic-law-thought")!.name).toBe(
      "Shariah & Islamic Thought",
    );
  });

  it("backfills a profile from legacy metadata for books that have none", async () => {
    const w = world(legacy, [
      {
        id: "prod_1",
        metadata: { author: "أحمد يوسف، محمد علي", language: "en", pages: 210, isbn: "978-0-306-40615-7" },
        category_ids: ["pcat_shariah"],
        has_digital: true,
      },
    ]);
    const report = await seedBookCatalog(w.deps);
    expect(report.createdProfiles).toBe(1);
    expect(w.profiles.get("prod_1")).toMatchObject({
      authors: ["أحمد يوسف", "محمد علي"],
      language: "en",
      pages: 210,
      isbn: "9780306406157",
      digital_rights: true,
      primary_category_id: w.categories.find((c) => c.handle === "islamic-law-thought")!.id,
    });
    const again = await seedBookCatalog(w.deps);
    expect(again.createdProfiles).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/medusa && npx vitest run src/lib/seed-book-catalog.test.ts`
Expected: FAIL — `Cannot find module './seed-book-catalog'`

- [ ] **Step 4: Write the orchestration**

```ts
// apps/medusa/src/lib/seed-book-catalog.ts
import { BOOK_TAXONOMY, LEGACY_CATEGORY_MOVES } from "./book-taxonomy";
import type { BookProfileInput } from "./book-input";
import { isValidIsbn, normalizeIsbn } from "./book-text";

export type CategoryRow = {
  id: string;
  handle: string;
  name: string;
  parent_category_id: string | null;
  metadata: Record<string, unknown> | null;
};

export interface SeedDeps {
  listCategories(): Promise<CategoryRow[]>;
  createCategory(input: Omit<CategoryRow, "id"> & { rank: number }): Promise<CategoryRow>;
  updateCategory(
    id: string,
    update: { parent_category_id?: string | null; metadata?: Record<string, unknown> },
  ): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  listProductIdsInCategory(categoryId: string): Promise<string[]>;
  getProductCategoryIds(productId: string): Promise<string[]>;
  setProductCategoryIds(productId: string, ids: string[]): Promise<void>;
  listBookProducts(): Promise<
    Array<{ id: string; metadata: Record<string, unknown> | null; category_ids: string[]; has_digital: boolean }>
  >;
  hasProfile(productId: string): Promise<boolean>;
  /** Writes the row as-is (legacy books may have no author yet). */
  upsertProfile(productId: string, input: BookProfileInput): Promise<void>;
  log(message: string): void;
}

export type SeedReport = {
  createdCategories: number;
  mergedCategories: number;
  reparentedCategories: number;
  createdProfiles: number;
};

function splitAuthors(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/[،,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function seedBookCatalog(deps: SeedDeps): Promise<SeedReport> {
  const report: SeedReport = { createdCategories: 0, mergedCategories: 0, reparentedCategories: 0, createdProfiles: 0 };
  const byHandle = new Map((await deps.listCategories()).map((c) => [c.handle, c]));

  async function ensure(
    node: { handle: string; name: string; name_ar: string },
    parentId: string | null,
    rank: number,
  ): Promise<CategoryRow> {
    const existing = byHandle.get(node.handle);
    if (existing) return existing; // never rename/move what staff may have edited
    const created = await deps.createCategory({
      handle: node.handle,
      name: node.name,
      parent_category_id: parentId,
      rank,
      metadata: { darnozom: "book", name_ar: node.name_ar },
    });
    byHandle.set(created.handle, created);
    report.createdCategories++;
    return created;
  }

  // 1. Sections, then subcategories. A legacy category whose handle is also a
  //    taxonomy child (digital-transformation) is found, not duplicated.
  for (const [i, section] of BOOK_TAXONOMY.entries()) {
    const s = await ensure(section, null, i);
    for (const [j, child] of section.children.entries()) {
      await ensure(child, s.id, j);
    }
  }

  // 2. Legacy categories.
  for (const move of LEGACY_CATEGORY_MOVES) {
    const old = byHandle.get(move.handle);
    if (!old) continue;
    if (move.action === "merge") {
      const target = byHandle.get(move.into)!;
      if (old.id === target.id) continue;
      for (const productId of await deps.listProductIdsInCategory(old.id)) {
        const ids = await deps.getProductCategoryIds(productId);
        const next = [...new Set([...ids.filter((id) => id !== old.id), target.id])];
        await deps.setProductCategoryIds(productId, next);
      }
      await deps.deleteCategory(old.id);
      byHandle.delete(old.handle);
      report.mergedCategories++;
      deps.log(`merged category ${move.handle} into ${move.into}`);
    } else {
      const parent = byHandle.get(move.under)!;
      if (old.parent_category_id === parent.id) continue;
      const taxonomyNode = BOOK_TAXONOMY.flatMap((s) => s.children).find((c) => c.handle === move.handle);
      await deps.updateCategory(old.id, {
        parent_category_id: parent.id,
        metadata: {
          ...(old.metadata ?? {}),
          darnozom: "book",
          ...(taxonomyNode && !old.metadata?.name_ar ? { name_ar: taxonomyNode.name_ar } : {}),
        },
      });
      old.parent_category_id = parent.id;
      report.reparentedCategories++;
      deps.log(`moved category ${move.handle} under ${move.under}`);
    }
  }

  // 3. Profiles for books that don't have one yet, from legacy metadata.
  for (const product of await deps.listBookProducts()) {
    if (await deps.hasProfile(product.id)) continue;
    const meta = product.metadata ?? {};
    const isbn = typeof meta.isbn === "string" && isValidIsbn(meta.isbn) ? normalizeIsbn(meta.isbn) : null;
    const language = meta.language === "en" || meta.language === "both" ? meta.language : "ar";
    await deps.upsertProfile(product.id, {
      authors: splitAuthors(meta.author),
      editors: [],
      translators: [],
      publisher: null,
      isbn,
      external_id: null,
      publication_year: null,
      edition_number: null,
      pages: typeof meta.pages === "number" && meta.pages > 0 ? meta.pages : null,
      volumes: 1,
      language,
      primary_category_id: product.category_ids[0] ?? null,
      keywords: [],
      target_audience: null,
      table_of_contents: null,
      // An existing digital edition means the store already sells it digitally.
      digital_rights: product.has_digital,
    });
    report.createdProfiles++;
  }

  return report;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/medusa && npx vitest run src/lib/seed-book-catalog.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Wire the exec script to real Medusa workflows**

```ts
// apps/medusa/src/scripts/seed-book-catalog.ts
import type { MedusaContainer } from "@medusajs/framework/types";
import {
  createProductCategoriesWorkflow,
  deleteProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import { BOOK_CATALOG_MODULE, BookProfileConflictError, upsertBookProfile } from "../modules/book-catalog";
import type BookCatalogModuleService from "../modules/book-catalog/service";
import { seedBookCatalog, type CategoryRow } from "../lib/seed-book-catalog";

// Run: cd apps/medusa && npx medusa exec ./src/scripts/seed-book-catalog.ts
// Idempotent — safe to re-run (see seed-book-catalog.test.ts).
export default async function ({ container }: { container: MedusaContainer }) {
  const query = container.resolve("query");
  const profiles = container.resolve<BookCatalogModuleService>(BOOK_CATALOG_MODULE);
  const bookTypeId = process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID?.trim();

  const report = await seedBookCatalog({
    async listCategories() {
      const { data } = await query.graph({
        entity: "product_category",
        fields: ["id", "handle", "name", "parent_category_id", "metadata"],
      });
      return data as CategoryRow[];
    },
    async createCategory(input) {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: { product_categories: [{ ...input, is_active: true, is_internal: false }] },
      });
      return result[0] as unknown as CategoryRow;
    },
    async updateCategory(id, update) {
      await updateProductCategoriesWorkflow(container).run({ input: { selector: { id }, update } });
    },
    async deleteCategory(id) {
      await deleteProductCategoriesWorkflow(container).run({ input: [id] });
    },
    async listProductIdsInCategory(categoryId) {
      const { data } = await query.graph({
        entity: "product_category",
        fields: ["id", "products.id"],
        filters: { id: categoryId },
      });
      return ((data[0]?.products ?? []) as { id: string }[]).map((p) => p.id);
    },
    async getProductCategoryIds(productId) {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id", "categories.id"],
        filters: { id: productId },
      });
      return ((data[0]?.categories ?? []) as { id: string }[]).map((c) => c.id);
    },
    async setProductCategoryIds(productId, ids) {
      await updateProductsWorkflow(container).run({
        input: { products: [{ id: productId, category_ids: ids }] },
      });
    },
    async listBookProducts() {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id", "metadata", "categories.id", "variants.metadata"],
        ...(bookTypeId ? { filters: { type_id: bookTypeId } } : {}),
      });
      return (data as Array<{
        id: string;
        metadata: Record<string, unknown> | null;
        categories?: { id: string }[];
        variants?: { metadata?: Record<string, unknown> | null }[];
      }>).map((p) => ({
        id: p.id,
        metadata: p.metadata,
        category_ids: (p.categories ?? []).map((c) => c.id),
        has_digital: (p.variants ?? []).some((v) => v.metadata?.kind === "digital"),
      }));
    },
    async hasProfile(productId) {
      const rows = await profiles.listBookProfiles({ product_id: productId });
      return rows.length > 0;
    },
    async upsertProfile(productId, input) {
      try {
        await upsertBookProfile(profiles as never, productId, input);
      } catch (err) {
        // Two legacy books with the same ISBN: keep the second without it.
        if (!(err instanceof BookProfileConflictError)) throw err;
        console.warn(`seed-book-catalog: ${productId}: ${err.message} — saved without ISBN`);
        await upsertBookProfile(profiles as never, productId, { ...input, isbn: null });
      }
    },
    log: (m) => console.log(m),
  });

  console.log("seed-book-catalog:", JSON.stringify(report));
}
```

- [ ] **Step 7: Run the seed against the local database**

Run: `cd apps/medusa && npx medusa exec ./src/scripts/seed-book-catalog.ts`
Expected: log lines "merged category shariah into islamic-law-thought", "merged category management into management-leadership", "moved category digital-transformation under public-administration", then `seed-book-catalog: {"createdCategories":<n>,...}`. Run it a second time and expect `"createdCategories":0,"mergedCategories":0,"reparentedCategories":0,"createdProfiles":0`.

- [ ] **Step 8: Commit**

```bash
git add apps/medusa/src/lib/book-taxonomy.ts apps/medusa/src/lib/seed-book-catalog.ts apps/medusa/src/lib/seed-book-catalog.test.ts apps/medusa/src/scripts/seed-book-catalog.ts
git commit -m "feat(books): seed the 8-section classification and backfill profiles"
```

---

### Task 5: Save a book profile from Medusa Admin

**Files:**
- Create: `apps/medusa/src/lib/save-book-profile.ts`
- Create: `apps/medusa/src/api/admin/books/[id]/profile/route.ts`
- Test: `apps/medusa/src/lib/save-book-profile.test.ts`
- Test: `apps/medusa/src/api/admin/books/[id]/profile/route.test.ts`

**Interfaces:**
- Consumes: `parseBookProfile`, `BookProfileInput` (Task 2); `BookProfileRepo`, `BookProfileRow`, `upsertBookProfile`, `BookProfileConflictError`, `BOOK_CATALOG_MODULE` (Task 3)
- Produces:
  - `type SaveProfileDeps = { repo: BookProfileRepo; getProduct(id: string): Promise<{ id: string; metadata: Record<string, unknown> | null; category_ids: string[] } | null>; updateProduct(id: string, update: { metadata?: Record<string, unknown>; category_ids?: string[] }): Promise<void> }`
  - `saveBookProfile(deps: SaveProfileDeps, productId: string, input: BookProfileInput): Promise<BookProfileRow>` — throws `BookNotFoundError` (exported) when the product is missing
  - `makeSaveProfileDeps(container: MedusaContainer): SaveProfileDeps`
  - `GET /admin/books/:id/profile` → `{ profile: BookProfileRow | null }`; `POST /admin/books/:id/profile` body = profile JSON → `200 { profile }` | `400 { errors }` | `404` | `409 { message }`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/medusa/src/lib/save-book-profile.test.ts
import { describe, it, expect, vi } from "vitest";
import { BookNotFoundError, saveBookProfile, type SaveProfileDeps } from "./save-book-profile";
import type { BookProfileInput } from "./book-input";

const input: BookProfileInput = {
  authors: ["أحمد يوسف", "Omar Ali"], editors: [], translators: [], publisher: "دار نظم",
  isbn: null, external_id: null, publication_year: 2024, edition_number: 1, pages: 300,
  volumes: 1, language: "ar", primary_category_id: "pcat_fiqh", keywords: [], target_audience: null,
  table_of_contents: null, digital_rights: false,
};

function deps(product: { id: string; metadata: Record<string, unknown> | null; category_ids: string[] } | null) {
  const d: SaveProfileDeps = {
    repo: {
      listBookProfiles: vi.fn(async () => []),
      createBookProfiles: vi.fn(async (x) => ({ id: "bp_1", ...x }) as never),
      updateBookProfiles: vi.fn(),
    },
    getProduct: vi.fn(async () => product),
    updateProduct: vi.fn(async () => undefined),
  };
  return d;
}

describe("saveBookProfile", () => {
  it("stores the profile, mirrors authors into metadata.author and adds the primary category", async () => {
    const d = deps({ id: "prod_1", metadata: { isFeatured: true }, category_ids: ["pcat_extra"] });
    const row = await saveBookProfile(d, "prod_1", input);
    expect(row.product_id).toBe("prod_1");
    expect(d.updateProduct).toHaveBeenCalledWith("prod_1", {
      metadata: { isFeatured: true, author: "أحمد يوسف، Omar Ali" },
      category_ids: ["pcat_extra", "pcat_fiqh"],
    });
  });

  it("does not touch categories when the primary one is already assigned", async () => {
    const d = deps({ id: "prod_1", metadata: null, category_ids: ["pcat_fiqh"] });
    await saveBookProfile(d, "prod_1", input);
    expect(d.updateProduct).toHaveBeenCalledWith("prod_1", {
      metadata: { author: "أحمد يوسف، Omar Ali" },
    });
  });

  it("throws BookNotFoundError for an unknown product", async () => {
    await expect(saveBookProfile(deps(null), "prod_x", input)).rejects.toBeInstanceOf(BookNotFoundError);
  });
});
```

```ts
// apps/medusa/src/api/admin/books/[id]/profile/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn() }));
vi.mock("../../../../../lib/save-book-profile", async (orig) => ({
  ...(await orig<typeof import("../../../../../lib/save-book-profile")>()),
  saveBookProfile: saveMock,
  makeSaveProfileDeps: () => ({}),
}));

import { GET, POST } from "./route";
import { BookProfileConflictError } from "../../../../../modules/book-catalog";
import { BookNotFoundError } from "../../../../../lib/save-book-profile";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}
const profileRow = { id: "bp_1", product_id: "prod_1", authors: ["A"] };
function fakeReq(body: unknown = {}) {
  const svc = { listBookProfiles: vi.fn(async () => [profileRow]) };
  return { params: { id: "prod_1" }, body, scope: { resolve: () => svc } } as any;
}

describe("/admin/books/:id/profile", () => {
  beforeEach(() => saveMock.mockReset());

  it("GET returns the stored profile", async () => {
    const res = fakeRes();
    await GET(fakeReq(), res);
    expect(res.json).toHaveBeenCalledWith({ profile: profileRow });
  });

  it("POST validates before saving", async () => {
    const res = fakeRes();
    await POST(fakeReq({ authors: [], language: "ar" }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("POST saves a valid profile", async () => {
    saveMock.mockResolvedValue(profileRow);
    const res = fakeRes();
    await POST(fakeReq({ authors: ["A"], language: "ar" }), res);
    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("POST maps conflicts to 409 and missing books to 404", async () => {
    saveMock.mockRejectedValueOnce(new BookProfileConflictError("isbn taken"));
    const r1 = fakeRes();
    await POST(fakeReq({ authors: ["A"], language: "ar" }), r1);
    expect(r1.status).toHaveBeenCalledWith(409);
    saveMock.mockRejectedValueOnce(new BookNotFoundError("prod_1"));
    const r2 = fakeRes();
    await POST(fakeReq({ authors: ["A"], language: "ar" }), r2);
    expect(r2.status).toHaveBeenCalledWith(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/medusa && npx vitest run src/lib/save-book-profile.test.ts "src/api/admin/books/[id]/profile"`
Expected: FAIL — modules not found

- [ ] **Step 3: Write the implementation**

```ts
// apps/medusa/src/lib/save-book-profile.ts
import type { MedusaContainer } from "@medusajs/framework/types";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";
import type { BookProfileInput } from "./book-input";
import {
  BOOK_CATALOG_MODULE,
  upsertBookProfile,
  type BookProfileRepo,
  type BookProfileRow,
} from "../modules/book-catalog";

export class BookNotFoundError extends Error {
  constructor(productId: string) {
    super(`Book ${productId} not found`);
  }
}

export type SaveProfileDeps = {
  repo: BookProfileRepo;
  getProduct(id: string): Promise<{ id: string; metadata: Record<string, unknown> | null; category_ids: string[] } | null>;
  updateProduct(id: string, update: { metadata?: Record<string, unknown>; category_ids?: string[] }): Promise<void>;
};

/**
 * Saves the profile and keeps two product fields in step with it:
 * `metadata.author` (read by product cards and the storefront admin list)
 * and the product's categories (the primary category is always assigned, so
 * category filters find the book).
 */
export async function saveBookProfile(
  deps: SaveProfileDeps,
  productId: string,
  input: BookProfileInput,
): Promise<BookProfileRow> {
  const product = await deps.getProduct(productId);
  if (!product) throw new BookNotFoundError(productId);
  const row = await upsertBookProfile(deps.repo, productId, input);

  const update: { metadata?: Record<string, unknown>; category_ids?: string[] } = {
    metadata: { ...(product.metadata ?? {}), author: input.authors.join("، ") },
  };
  if (input.primary_category_id && !product.category_ids.includes(input.primary_category_id)) {
    update.category_ids = [...product.category_ids, input.primary_category_id];
  }
  await deps.updateProduct(productId, update);
  return row;
}

export function makeSaveProfileDeps(container: MedusaContainer): SaveProfileDeps {
  const query = container.resolve("query");
  return {
    repo: container.resolve(BOOK_CATALOG_MODULE) as unknown as BookProfileRepo,
    async getProduct(id) {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id", "metadata", "categories.id"],
        filters: { id },
      });
      const p = data[0] as { id: string; metadata: Record<string, unknown> | null; categories?: { id: string }[] } | undefined;
      return p ? { id: p.id, metadata: p.metadata, category_ids: (p.categories ?? []).map((c) => c.id) } : null;
    },
    async updateProduct(id, update) {
      await updateProductsWorkflow(container).run({ input: { products: [{ id, ...update }] } });
    },
  };
}
```

```ts
// apps/medusa/src/api/admin/books/[id]/profile/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { parseBookProfile } from "../../../../../lib/book-input";
import { BOOK_CATALOG_MODULE, BookProfileConflictError } from "../../../../../modules/book-catalog";
import type BookCatalogModuleService from "../../../../../modules/book-catalog/service";
import {
  BookNotFoundError,
  makeSaveProfileDeps,
  saveBookProfile,
} from "../../../../../lib/save-book-profile";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<BookCatalogModuleService>(BOOK_CATALOG_MODULE);
  const [profile] = await svc.listBookProfiles({ product_id: req.params.id });
  return res.json({ profile: profile ?? null });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = parseBookProfile(req.body);
  if (!parsed.ok) return res.status(400).json({ errors: parsed.errors });
  try {
    const profile = await saveBookProfile(makeSaveProfileDeps(req.scope), req.params.id, parsed.value);
    return res.status(200).json({ profile });
  } catch (err) {
    if (err instanceof BookProfileConflictError) return res.status(409).json({ message: err.message });
    if (err instanceof BookNotFoundError) return res.status(404).json({ message: err.message });
    throw err;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/medusa && npx vitest run src/lib/save-book-profile.test.ts "src/api/admin/books/[id]/profile"`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/lib/save-book-profile.ts apps/medusa/src/lib/save-book-profile.test.ts "apps/medusa/src/api/admin/books/[id]/profile"
git commit -m "feat(books): admin API to read and save a book profile"
```

---

# Phase 2 — Print and digital editions

### Task 6: Create print-only, digital-only or both, with the full profile

**Files:**
- Modify: `apps/medusa/src/lib/create-book-product.ts`
- Modify: `apps/medusa/src/lib/create-book-product.test.ts`
- Create: `apps/medusa/src/lib/create-book.ts`
- Test: `apps/medusa/src/lib/create-book.test.ts`
- Modify (rewrite POST): `apps/medusa/src/api/admin/books/route.ts`
- Modify: `apps/medusa/src/api/admin/books/route.test.ts`

**Interfaces:**
- Consumes: `CreateBookInput`, `parseCreateBook` (Task 2); `findProfileByIdentity`, `BookProfileConflictError`, `BookProfileRepo` (Task 3); `saveBookProfile`, `SaveProfileDeps`, `makeSaveProfileDeps` (Task 5)
- Produces:
  - `CreateBookProductInput` gains `hasPaper?: boolean` (default true) and `subtitle?: string | null`; the Format option is always created with values `["Paper", "Digital"]` so an edition can be added later; `setPaperInventory` becomes exported.
  - `type CreateBookDeps = { profileRepo: BookProfileRepo; createProduct(input: CreateBookProductInput): Promise<CreateBookProductResult>; saveProfile: SaveProfileDeps }`
  - `createBook(deps: CreateBookDeps, input: CreateBookInput): Promise<{ product: { id: string }; paperVariantId: string | null; digitalVariantId: string | null; profile: BookProfileRow }>`
  - `makeCreateBookDeps(container: MedusaContainer): CreateBookDeps`
  - `POST /admin/books` body = `CreateBookInput` JSON → `201 { product, paperVariantId, digitalVariantId, profile }` | `400 { errors }` | `409 { message }`

- [ ] **Step 1: Update the existing product tests (they now fail)**

In `apps/medusa/src/lib/create-book-product.test.ts`:
- In "creates a paper-only book when hasDigital is false", change the options expectation to `[{ title: "Format", values: ["Paper", "Digital"], is_exclusive: true }]` (the option always carries both values; only the variants differ).
- In "rejects non-positive prices", change `.rejects.toThrow(/paperPrice and digitalPrice/)` to `.rejects.toThrow(/paperPrice must be a positive number/)` (a zero paper price is now reported on its own).
- Add:

```ts
  it("creates a digital-only book when hasPaper is false (no paper price needed)", async () => {
    const run = vi.fn().mockResolvedValue({
      result: [{ id: "prod_3", variants: [{ id: "var_d", title: "Digital", metadata: { kind: "digital" } }] }],
    });
    const result = await createBookProduct({} as any, {
      title: "Digital only",
      salesChannelId: "sc_1",
      paperPrice: Number.NaN,
      digitalPrice: 40,
      hasPaper: false,
      hasDigital: true,
      __testCreateProductsWorkflow: () => ({ run }),
      __testQuery: { graph: vi.fn().mockResolvedValue({ data: [] }) },
    });
    const productInput = run.mock.calls[0][0].input.products[0];
    expect(productInput.variants).toHaveLength(1);
    expect(productInput.variants[0].metadata).toEqual({ kind: "digital" });
    expect(result.paperVariantId).toBeNull();
    expect(result.digitalVariantId).toBe("var_d");
  });

  it("refuses a book with neither edition", async () => {
    await expect(
      createBookProduct({} as any, {
        title: "X", salesChannelId: "sc_1", paperPrice: 1, digitalPrice: 1,
        hasPaper: false, hasDigital: false,
      }),
    ).rejects.toThrow(/at least one edition/);
  });
```

Run: `cd apps/medusa && npx vitest run src/lib/create-book-product.test.ts`
Expected: FAIL (4 failing: option values, zero paper price message, digital-only, no-edition)

- [ ] **Step 2: Change `createBookProduct`**

In `apps/medusa/src/lib/create-book-product.ts`:

1. In `CreateBookProductInput` add below `hasDigital?: boolean;`:

```ts
  /** false → digital-only book: no Paper variant (paperPrice ignored). Default true. */
  hasPaper?: boolean;
  subtitle?: string | null;
```

2. Replace the price validation block (the `const hasDigital = …` line through its `throw`) with:

```ts
  const hasDigital = input.hasDigital !== false;
  const hasPaper = input.hasPaper !== false;
  if (!hasPaper && !hasDigital) {
    throw new Error("a book needs at least one edition (paper or digital)");
  }
  if (hasPaper && !(input.paperPrice > 0)) {
    throw new Error("paperPrice must be a positive number");
  }
  if (hasDigital && !(input.digitalPrice > 0)) {
    throw new Error(
      hasPaper
        ? "paperPrice and digitalPrice must be positive numbers"
        : "digitalPrice must be a positive number",
    );
  }
```

3. In the product payload add `subtitle: input.subtitle?.trim() || undefined,` after `title`.

4. Replace the option values line with `values: [PAPER_VALUE, DIGITAL_VALUE],` and add a comment above `options:`:

```ts
          // Both values always exist so staff can add the other edition later
          // (Editions widget) without editing the option.
```

5. Wrap the Paper variant object in the same spread pattern as Digital:

```ts
          variants: [
            ...(hasPaper
              ? [
                  {
                    title: PAPER_VALUE,
                    sku: slugSku(input.title, "paper"),
                    options: { [FORMAT_OPTION_TITLE]: PAPER_VALUE },
                    prices: [{ amount: input.paperPrice, currency_code: currency }],
                    metadata: { kind: "paper" },
                    manage_inventory: true,
                    allow_backorder: false,
                  },
                ]
              : []),
            ...(hasDigital
              ? [
                  {
                    title: DIGITAL_VALUE,
                    sku: slugSku(input.title, "digital"),
                    options: { [FORMAT_OPTION_TITLE]: DIGITAL_VALUE },
                    prices: [{ amount: input.digitalPrice, currency_code: currency }],
                    metadata: { kind: "digital" },
                    manage_inventory: false,
                    allow_backorder: true,
                  },
                ]
              : []),
          ],
```

6. Change `async function setPaperInventory(` to `export async function setPaperInventory(`.

Run: `cd apps/medusa && npx vitest run src/lib/create-book-product.test.ts`
Expected: PASS

- [ ] **Step 3: Write the failing test for `createBook`**

```ts
// apps/medusa/src/lib/create-book.test.ts
import { describe, it, expect, vi } from "vitest";
import { createBook, type CreateBookDeps } from "./create-book";
import { BookProfileConflictError } from "../modules/book-catalog";
import type { CreateBookInput } from "./book-input";

const input: CreateBookInput = {
  title: "السياسة الشرعية",
  subtitle: null,
  description: "نص احترافي",
  status: "draft",
  sales_channel_id: "sc_1",
  image_urls: ["https://cdn/x/cover.jpg", "https://cdn/x/back.jpg"],
  additional_category_ids: ["pcat_gov"],
  print: { price: 120, stock: 7 },
  digital: null,
  profile: {
    authors: ["أحمد"], editors: [], translators: [], publisher: "دار نظم", isbn: "9780306406157",
    external_id: null, publication_year: 2024, edition_number: 2, pages: 320, volumes: 1,
    language: "ar", primary_category_id: "pcat_siyasa", keywords: ["سياسة"], target_audience: null,
    table_of_contents: null, digital_rights: false,
  },
};

function deps(existingProfile: unknown = null): CreateBookDeps & { saved: unknown[] } {
  const saved: unknown[] = [];
  return {
    saved,
    profileRepo: {
      listBookProfiles: vi.fn(async (f) => (existingProfile && "isbn" in f ? [existingProfile] : [])) as never,
      createBookProfiles: vi.fn(),
      updateBookProfiles: vi.fn(),
    },
    createProduct: vi.fn(async () => ({ product: { id: "prod_9" }, paperVariantId: "var_p", digitalVariantId: null })),
    saveProfile: {
      repo: { listBookProfiles: vi.fn(async () => []), createBookProfiles: vi.fn(async (x) => { saved.push(x); return { id: "bp", ...x }; }), updateBookProfiles: vi.fn() } as never,
      getProduct: vi.fn(async () => ({ id: "prod_9", metadata: null, category_ids: ["pcat_siyasa", "pcat_gov"] })),
      updateProduct: vi.fn(async () => undefined),
    },
  };
}

describe("createBook", () => {
  it("creates the product with the right editions, categories and images, then the profile", async () => {
    const d = deps();
    const out = await createBook(d, input);
    expect(d.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "السياسة الشرعية",
        status: "draft",
        salesChannelId: "sc_1",
        thumbnailUrl: "https://cdn/x/cover.jpg",
        imageUrls: ["https://cdn/x/cover.jpg", "https://cdn/x/back.jpg"],
        hasPaper: true,
        paperPrice: 120,
        paperInventoryQty: 7,
        hasDigital: false,
        categoryIds: ["pcat_siyasa", "pcat_gov"],
        author: "أحمد",
        language: "ar",
      }),
    );
    expect(out.product.id).toBe("prod_9");
    expect(d.saved[0]).toMatchObject({ product_id: "prod_9", isbn: "9780306406157" });
  });

  it("refuses a duplicate ISBN before creating anything", async () => {
    const d = deps({ id: "bp_old", product_id: "prod_old", isbn: "9780306406157" });
    await expect(createBook(d, input)).rejects.toBeInstanceOf(BookProfileConflictError);
    expect(d.createProduct).not.toHaveBeenCalled();
  });
});
```

Run: `cd apps/medusa && npx vitest run src/lib/create-book.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write `createBook`**

```ts
// apps/medusa/src/lib/create-book.ts
import type { MedusaContainer } from "@medusajs/framework/types";
import type { CreateBookInput } from "./book-input";
import {
  createBookProduct,
  type CreateBookProductInput,
  type CreateBookProductResult,
} from "./create-book-product";
import { makeSaveProfileDeps, saveBookProfile, type SaveProfileDeps } from "./save-book-profile";
import {
  BOOK_CATALOG_MODULE,
  BookProfileConflictError,
  findProfileByIdentity,
  type BookProfileRepo,
  type BookProfileRow,
} from "../modules/book-catalog";

export type CreateBookDeps = {
  profileRepo: BookProfileRepo;
  createProduct(input: CreateBookProductInput): Promise<CreateBookProductResult>;
  saveProfile: SaveProfileDeps;
};

/** Creates a book product and its profile. Shared by Medusa Admin and the partner API. */
export async function createBook(
  deps: CreateBookDeps,
  input: CreateBookInput,
): Promise<{ product: { id: string }; paperVariantId: string | null; digitalVariantId: string | null; profile: BookProfileRow }> {
  // Check identity first so a duplicate never leaves an orphan product behind.
  const clash = await findProfileByIdentity(deps.profileRepo, {
    isbn: input.profile.isbn,
    external_id: input.profile.external_id,
  });
  if (clash) {
    throw new BookProfileConflictError(`this book already exists as product ${clash.product_id}`);
  }

  const categoryIds = [
    ...new Set([input.profile.primary_category_id, ...input.additional_category_ids].filter((x): x is string => !!x)),
  ];
  const created = await deps.createProduct({
    title: input.title,
    subtitle: input.subtitle,
    description: input.description ?? undefined,
    status: input.status,
    salesChannelId: input.sales_channel_id,
    thumbnailUrl: input.image_urls[0],
    imageUrls: input.image_urls,
    hasPaper: !!input.print,
    paperPrice: input.print?.price ?? Number.NaN,
    paperInventoryQty: input.print?.stock,
    hasDigital: !!input.digital,
    digitalPrice: input.digital?.price ?? Number.NaN,
    categoryIds,
    author: input.profile.authors.join("، "),
    language: input.profile.language,
  });
  const profile = await saveBookProfile(deps.saveProfile, created.product.id, input.profile);
  return {
    product: created.product,
    paperVariantId: created.paperVariantId,
    digitalVariantId: created.digitalVariantId,
    profile,
  };
}

export function makeCreateBookDeps(container: MedusaContainer): CreateBookDeps {
  return {
    profileRepo: container.resolve(BOOK_CATALOG_MODULE) as unknown as BookProfileRepo,
    createProduct: (input) => createBookProduct(container, input),
    saveProfile: makeSaveProfileDeps(container),
  };
}
```

- [ ] **Step 5: Rewrite `POST /admin/books` and its test**

Replace the whole of `apps/medusa/src/api/admin/books/route.ts` with:

```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { parseCreateBook } from "../../../lib/book-input";
import { createBook, makeCreateBookDeps } from "../../../lib/create-book";
import { BookProfileConflictError } from "../../../modules/book-catalog";

/** Create Book (Medusa Admin → Products → Create Book). Body: CreateBookInput. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = parseCreateBook(req.body);
  if (!parsed.ok) return res.status(400).json({ errors: parsed.errors, message: parsed.errors.join("; ") });
  try {
    const out = await createBook(makeCreateBookDeps(req.scope), parsed.value);
    return res.status(201).json(out);
  } catch (err) {
    if (err instanceof BookProfileConflictError) return res.status(409).json({ message: err.message });
    const message = err instanceof Error ? err.message : String(err);
    const status = /required|must be (a )?positive|at least one edition|MEDUSA_BOOK_PRODUCT_TYPE_ID/i.test(message) ? 400 : 500;
    return res.status(status).json({ message });
  }
}
```

Replace the whole of `apps/medusa/src/api/admin/books/route.test.ts` with:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const { createBookMock } = vi.hoisted(() => ({ createBookMock: vi.fn() }));
vi.mock("../../../lib/create-book", () => ({
  createBook: createBookMock,
  makeCreateBookDeps: () => ({}),
}));

import { POST } from "./route";
import { BookProfileConflictError } from "../../../modules/book-catalog";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}
const valid = {
  title: "Book",
  sales_channel_id: "sc_1",
  print: { price: 100, stock: 5 },
  profile: { authors: ["A"], language: "ar" },
};

describe("POST /admin/books", () => {
  beforeEach(() => createBookMock.mockReset());

  it("returns 201 with the created book", async () => {
    createBookMock.mockResolvedValue({ product: { id: "prod_1" }, paperVariantId: "v", digitalVariantId: null, profile: {} });
    const res = fakeRes();
    await POST({ body: valid, scope: {} } as any, res);
    expect(createBookMock.mock.calls[0][1]).toMatchObject({ title: "Book", print: { price: 100, stock: 5 } });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 400 with field errors for an invalid body", async () => {
    const res = fakeRes();
    await POST({ body: { title: "" }, scope: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(createBookMock).not.toHaveBeenCalled();
  });

  it("returns 409 for a duplicate ISBN", async () => {
    createBookMock.mockRejectedValue(new BookProfileConflictError("exists"));
    const res = fakeRes();
    await POST({ body: valid, scope: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/medusa && npx vitest run src/lib/create-book-product.test.ts src/lib/create-book.test.ts src/api/admin/books/route.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/medusa/src/lib/create-book-product.ts apps/medusa/src/lib/create-book-product.test.ts apps/medusa/src/lib/create-book.ts apps/medusa/src/lib/create-book.test.ts apps/medusa/src/api/admin/books/route.ts apps/medusa/src/api/admin/books/route.test.ts
git commit -m "feat(books): create print-only, digital-only or both, with full profile"
```

---

### Task 7: Stop auto-creating a digital edition

**Files:**
- Modify: `apps/medusa/src/subscribers/auto-add-book-editions.ts`
- Modify: `apps/medusa/src/subscribers/auto-add-book-editions.test.ts`

**Interfaces:**
- Produces: for a hand-made Book-type product, the subscriber still adds the `Format` option (values Paper + Digital) but creates **only the Paper variant**.

- [ ] **Step 1: Update the test expectation (it now fails)**

In `auto-add-book-editions.test.ts`:

1. In the first happy-path test (the one asserting `createOptionsRunMock` was called with `add: [{ title: "Format", values: ["Paper", "Digital"], is_exclusive: true }]`), keep that options assertion and replace the `createVariantsRunMock` assertion with:

```ts
    expect(createVariantsRunMock).toHaveBeenCalledWith({
      input: {
        product_variants: [
          {
            product_id: "prod_1",
            title: "Paper",
            sku: "prod_1-paper",
            options: { Format: "Paper" },
            metadata: { kind: "paper" },
          },
        ],
      },
    });
```

2. In "carries every other existing option's value onto the new variants", replace the `product_variants` array with a single entry:

```ts
        product_variants: [
          expect.objectContaining({
            options: { "Default option": "Default option value", Format: "Paper" },
          }),
        ],
```

Run: `cd apps/medusa && npx vitest run src/subscribers/auto-add-book-editions.test.ts`
Expected: FAIL (two variants created)

- [ ] **Step 2: Remove the Digital variant**

In `auto-add-book-editions.ts`, delete the second object (`title: "Digital"` … `metadata: { kind: "digital" }`) from `product_variants`, and replace the doc comment's first paragraph with:

```ts
/**
 * Any product assigned the "Book" product type automatically gets a
 * "Format" option (values "Paper" and "Digital") and a Paper variant. A
 * digital edition is never created automatically — staff add it from the
 * product's Editions panel, and only when the book has digital rights.
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd apps/medusa && npx vitest run src/subscribers/auto-add-book-editions.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/medusa/src/subscribers/auto-add-book-editions.ts apps/medusa/src/subscribers/auto-add-book-editions.test.ts
git commit -m "fix(books): never auto-create a digital edition"
```

---

### Task 8: Editions API — add an edition, take an edition off sale

**Files:**
- Create: `apps/medusa/src/lib/book-editions.ts`
- Create: `apps/medusa/src/api/admin/books/[id]/editions/route.ts`
- Create: `apps/medusa/src/api/admin/books/[id]/editions/[variantId]/route.ts`
- Test: `apps/medusa/src/lib/book-editions.test.ts`

**Interfaces:**
- Consumes: `BookProfileRepo` (Task 3); `setPaperInventory` (Task 6)
- Produces:
  - `type Edition = { variant_id: string; kind: "paper" | "digital"; title: string; price: number | null; sale_enabled: boolean; manage_inventory: boolean }`
  - `type EditionDeps = { getProduct(id: string): Promise<EditionProduct | null>; getProfile(productId: string): Promise<{ digital_rights: boolean } | null>; createVariant(input: Record<string, unknown>): Promise<{ id: string }>; setStock(variantId: string, qty: number): Promise<void>; updateVariantMetadata(variantId: string, metadata: Record<string, unknown>): Promise<void> }` where `EditionProduct = { id: string; options: { title: string; values: { value: string }[] }[]; variants: { id: string; title: string; metadata: Record<string, unknown> | null; manage_inventory: boolean; prices: { amount: number; currency_code: string }[] }[] }`
  - `listEditions(product: EditionProduct): Edition[]`
  - `addEdition(deps, productId, input: { kind: "paper" | "digital"; price: number; stock?: number }): Promise<{ variant_id: string }>`
  - `setEditionSaleEnabled(deps, productId, variantId, saleEnabled: boolean): Promise<void>`
  - `class EditionError extends Error { status: 400 | 404 | 409 }`
  - `makeEditionDeps(container): EditionDeps`
  - `GET /admin/books/:id/editions` → `{ editions: Edition[] }`; `POST /admin/books/:id/editions` `{ kind, price, stock? }` → `201 { variant_id }`; `POST /admin/books/:id/editions/:variantId` `{ sale_enabled: boolean }` → `200 { ok: true }`

- [ ] **Step 1: Write the failing test**

```ts
// apps/medusa/src/lib/book-editions.test.ts
import { describe, it, expect, vi } from "vitest";
import { addEdition, EditionError, listEditions, setEditionSaleEnabled, type EditionDeps, type EditionProduct } from "./book-editions";

const product = (variants: EditionProduct["variants"]): EditionProduct => ({
  id: "prod_1",
  options: [{ title: "Format", values: [{ value: "Paper" }, { value: "Digital" }] }],
  variants,
});
const paper = { id: "var_p", title: "Paper", metadata: { kind: "paper" }, manage_inventory: true, prices: [{ amount: 120, currency_code: "egp" }] };

function deps(p: EditionProduct | null, digitalRights = false): EditionDeps {
  return {
    getProduct: vi.fn(async () => p),
    getProfile: vi.fn(async () => ({ digital_rights: digitalRights })),
    createVariant: vi.fn(async () => ({ id: "var_new" })),
    setStock: vi.fn(async () => undefined),
    updateVariantMetadata: vi.fn(async () => undefined),
  };
}

describe("listEditions", () => {
  it("lists paper/digital variants with EGP price and sale flag", () => {
    const eds = listEditions(product([paper, { ...paper, id: "var_d", title: "Digital", metadata: { kind: "digital", sale_enabled: false }, manage_inventory: false, prices: [] }]));
    expect(eds).toEqual([
      { variant_id: "var_p", kind: "paper", title: "Paper", price: 120, sale_enabled: true, manage_inventory: true },
      { variant_id: "var_d", kind: "digital", title: "Digital", price: null, sale_enabled: false, manage_inventory: false },
    ]);
  });
});

describe("addEdition", () => {
  it("adds a digital edition to a print-only book that has digital rights", async () => {
    const d = deps(product([paper]), true);
    await addEdition(d, "prod_1", { kind: "digital", price: 40 });
    expect(d.createVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: "prod_1",
        title: "Digital",
        options: { Format: "Digital" },
        prices: [{ amount: 40, currency_code: "egp" }],
        manage_inventory: false,
        allow_backorder: true,
        metadata: { kind: "digital" },
      }),
    );
    expect(d.setStock).not.toHaveBeenCalled();
  });

  it("refuses a digital edition without digital rights", async () => {
    await expect(addEdition(deps(product([paper]), false), "prod_1", { kind: "digital", price: 40 })).rejects.toMatchObject({ status: 409 });
  });

  it("refuses a second edition of the same kind", async () => {
    await expect(addEdition(deps(product([paper])), "prod_1", { kind: "paper", price: 10 })).rejects.toBeInstanceOf(EditionError);
  });

  it("adds a print edition with stock", async () => {
    const d = deps(product([]));
    await addEdition(d, "prod_1", { kind: "paper", price: 90, stock: 12 });
    expect(d.createVariant).toHaveBeenCalledWith(expect.objectContaining({ manage_inventory: true, metadata: { kind: "paper" } }));
    expect(d.setStock).toHaveBeenCalledWith("var_new", 12);
  });

  it("explains when the product has no Format option", async () => {
    const p = { ...product([]), options: [{ title: "الحالة", values: [{ value: "ورقي" }] }] };
    await expect(addEdition(deps(p, true), "prod_1", { kind: "digital", price: 5 })).rejects.toThrow(/Format/);
  });
});

describe("setEditionSaleEnabled", () => {
  it("merges sale_enabled into the variant's metadata", async () => {
    const d = deps(product([paper]));
    await setEditionSaleEnabled(d, "prod_1", "var_p", false);
    expect(d.updateVariantMetadata).toHaveBeenCalledWith("var_p", { kind: "paper", sale_enabled: false });
  });

  it("404s for a variant that isn't an edition of this book", async () => {
    await expect(setEditionSaleEnabled(deps(product([paper])), "prod_1", "var_x", false)).rejects.toMatchObject({ status: 404 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/medusa && npx vitest run src/lib/book-editions.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation and routes**

```ts
// apps/medusa/src/lib/book-editions.ts
import type { MedusaContainer } from "@medusajs/framework/types";
import { createProductVariantsWorkflow, updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";
import { BOOK_CATALOG_MODULE, type BookProfileRepo } from "../modules/book-catalog";
import { setPaperInventory } from "./create-book-product";

type Kind = "paper" | "digital";
const VALUE: Record<Kind, string> = { paper: "Paper", digital: "Digital" };

export type EditionProduct = {
  id: string;
  options: { title: string; values: { value: string }[] }[];
  variants: {
    id: string;
    title: string;
    metadata: Record<string, unknown> | null;
    manage_inventory: boolean;
    prices: { amount: number; currency_code: string }[];
  }[];
};

export type Edition = {
  variant_id: string;
  kind: Kind;
  title: string;
  price: number | null;
  sale_enabled: boolean;
  manage_inventory: boolean;
};

export type EditionDeps = {
  getProduct(id: string): Promise<EditionProduct | null>;
  getProfile(productId: string): Promise<{ digital_rights: boolean } | null>;
  createVariant(input: Record<string, unknown>): Promise<{ id: string }>;
  setStock(variantId: string, qty: number): Promise<void>;
  updateVariantMetadata(variantId: string, metadata: Record<string, unknown>): Promise<void>;
};

export class EditionError extends Error {
  constructor(public status: 400 | 404 | 409, message: string) {
    super(message);
  }
}

function kindOf(v: EditionProduct["variants"][number]): Kind | null {
  const k = v.metadata?.kind;
  return k === "paper" || k === "digital" ? k : null;
}

export function listEditions(product: EditionProduct): Edition[] {
  return product.variants.flatMap((v) => {
    const kind = kindOf(v);
    if (!kind) return [];
    const egp = v.prices.find((p) => p.currency_code.toLowerCase() === "egp");
    return [{
      variant_id: v.id,
      kind,
      title: v.title,
      price: egp ? egp.amount : null,
      sale_enabled: v.metadata?.sale_enabled !== false,
      manage_inventory: v.manage_inventory,
    }];
  });
}

async function loadProduct(deps: EditionDeps, productId: string): Promise<EditionProduct> {
  const product = await deps.getProduct(productId);
  if (!product) throw new EditionError(404, "Book not found");
  return product;
}

export async function addEdition(
  deps: EditionDeps,
  productId: string,
  input: { kind: Kind; price: number; stock?: number },
): Promise<{ variant_id: string }> {
  if (!(input.price > 0)) throw new EditionError(400, "price must be a positive number");
  const product = await loadProduct(deps, productId);
  if (product.variants.some((v) => kindOf(v) === input.kind)) {
    throw new EditionError(409, `This book already has a ${input.kind} edition`);
  }
  if (input.kind === "digital") {
    const profile = await deps.getProfile(productId);
    if (!profile?.digital_rights) {
      throw new EditionError(409, "Turn on 'Digital distribution rights' in Book details before adding a digital edition");
    }
  }
  const format = product.options.find(
    (o) => o.title.trim().toLowerCase() === "format" && o.values.some((v) => v.value === VALUE[input.kind]),
  );
  if (!format) {
    throw new EditionError(409, `This product has no "Format" option with the value "${VALUE[input.kind]}" — add it in the product's Options first`);
  }
  // Every other option needs a value too (e.g. Medusa's "Default option").
  const otherOptions = Object.fromEntries(
    product.options.filter((o) => o !== format && o.values[0]).map((o) => [o.title, o.values[0].value]),
  );
  const variant = await deps.createVariant({
    product_id: productId,
    title: VALUE[input.kind],
    sku: `${productId}-${input.kind}`,
    options: { ...otherOptions, [format.title]: VALUE[input.kind] },
    prices: [{ amount: input.price, currency_code: "egp" }],
    manage_inventory: input.kind === "paper",
    allow_backorder: input.kind === "digital",
    metadata: { kind: input.kind },
  });
  if (input.kind === "paper" && typeof input.stock === "number" && input.stock >= 0) {
    await deps.setStock(variant.id, input.stock);
  }
  return { variant_id: variant.id };
}

export async function setEditionSaleEnabled(
  deps: EditionDeps,
  productId: string,
  variantId: string,
  saleEnabled: boolean,
): Promise<void> {
  const product = await loadProduct(deps, productId);
  const variant = product.variants.find((v) => v.id === variantId && kindOf(v));
  if (!variant) throw new EditionError(404, "Edition not found on this book");
  await deps.updateVariantMetadata(variantId, { ...(variant.metadata ?? {}), sale_enabled: saleEnabled });
}

export function makeEditionDeps(container: MedusaContainer): EditionDeps {
  const query = container.resolve("query");
  const profiles = container.resolve(BOOK_CATALOG_MODULE) as unknown as BookProfileRepo;
  return {
    async getProduct(id) {
      const { data } = await query.graph({
        entity: "product",
        fields: [
          "id", "options.title", "options.values.value",
          "variants.id", "variants.title", "variants.metadata", "variants.manage_inventory",
          "variants.prices.amount", "variants.prices.currency_code",
        ],
        filters: { id },
      });
      return (data[0] as unknown as EditionProduct) ?? null;
    },
    async getProfile(productId) {
      const [row] = await profiles.listBookProfiles({ product_id: productId });
      return row ?? null;
    },
    async createVariant(input) {
      const { result } = await createProductVariantsWorkflow(container).run({
        input: { product_variants: [input as never] },
      });
      return { id: (result[0] as { id: string }).id };
    },
    async setStock(variantId, qty) {
      await setPaperInventory(container, query as never, variantId, qty, {} as never);
    },
    async updateVariantMetadata(variantId, metadata) {
      await updateProductVariantsWorkflow(container).run({
        input: { selector: { id: variantId }, update: { metadata } },
      });
    },
  };
}
```

```ts
// apps/medusa/src/api/admin/books/[id]/editions/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { addEdition, EditionError, listEditions, makeEditionDeps } from "../../../../../lib/book-editions";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const product = await makeEditionDeps(req.scope).getProduct(req.params.id);
  if (!product) return res.status(404).json({ message: "Book not found" });
  return res.json({ editions: listEditions(product) });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { kind?: unknown; price?: unknown; stock?: unknown };
  if (body.kind !== "paper" && body.kind !== "digital") {
    return res.status(400).json({ message: "kind must be 'paper' or 'digital'" });
  }
  try {
    const out = await addEdition(makeEditionDeps(req.scope), req.params.id, {
      kind: body.kind,
      price: Number(body.price),
      stock: body.stock === undefined ? undefined : Number(body.stock),
    });
    return res.status(201).json(out);
  } catch (err) {
    if (err instanceof EditionError) return res.status(err.status).json({ message: err.message });
    throw err;
  }
}
```

```ts
// apps/medusa/src/api/admin/books/[id]/editions/[variantId]/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { EditionError, makeEditionDeps, setEditionSaleEnabled } from "../../../../../../lib/book-editions";

/** Put an edition on sale or take it off sale: body { sale_enabled: boolean }. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const saleEnabled = (req.body as { sale_enabled?: unknown } | undefined)?.sale_enabled;
  if (typeof saleEnabled !== "boolean") {
    return res.status(400).json({ message: "sale_enabled must be true or false" });
  }
  try {
    await setEditionSaleEnabled(makeEditionDeps(req.scope), req.params.id, req.params.variantId, saleEnabled);
    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof EditionError) return res.status(err.status).json({ message: err.message });
    throw err;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/medusa && npx vitest run src/lib/book-editions.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/lib/book-editions.ts apps/medusa/src/lib/book-editions.test.ts "apps/medusa/src/api/admin/books/[id]/editions"
git commit -m "feat(books): add editions and toggle each edition's availability"
```

---

### Task 9: Respect "off sale" in the storefront and at checkout

**Files:**
- Modify: `apps/client/src/lib/book-variants.ts` (`isInStock`)
- Modify: `apps/client/src/lib/book-variants.test.ts`
- Modify: `apps/api/src/lib/medusa-book-variants.ts` (`variantInStock`, `MedusaAdminVariant` type)
- Test: `apps/api/src/lib/medusa-book-variants.test.ts` (create if absent)

**Interfaces:**
- Produces: a variant with `metadata.sale_enabled === false` is "not available" everywhere (`inStock: false` in `getBookVariantInfo`; `variantInStock` false in Express, so `POST /api/store/orders` answers `"<title>" is out of stock`).

- [ ] **Step 1: Write the failing tests**

Append to `apps/client/src/lib/book-variants.test.ts`:

```ts
describe("off-sale editions", () => {
  it("treats an edition with sale_enabled false as unavailable even with stock", () => {
    const info = getBookVariantInfo({
      id: "p",
      variants: [
        { id: "v_d", metadata: { kind: "digital", sale_enabled: false }, manage_inventory: false, calculated_price: { calculated_amount: 40 } },
        { id: "v_p", metadata: { kind: "paper" }, manage_inventory: true, inventory_quantity: 3, calculated_price: { calculated_amount: 90 } },
      ],
    } as any);
    expect(info.digitalInStock).toBe(false);
    expect(info.digitalEditions[0].inStock).toBe(false);
    expect(info.paperInStock).toBe(true);
  });
});
```

Create/append `apps/api/src/lib/medusa-book-variants.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { variantInStock } from "./medusa-book-variants";

describe("variantInStock", () => {
  it("is false for an edition staff took off sale", () => {
    expect(variantInStock({ manage_inventory: false, metadata: { kind: "digital", sale_enabled: false } } as any)).toBe(false);
    expect(variantInStock({ manage_inventory: false, metadata: { kind: "digital" } } as any)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/client && npx vitest run src/lib/book-variants.test.ts` → FAIL
Run: `cd apps/api && node --env-file=../../.env ./node_modules/vitest/vitest.mjs run src/lib/medusa-book-variants.test.ts` → FAIL

- [ ] **Step 3: Implement**

In `apps/client/src/lib/book-variants.ts`, change `isInStock` to start with:

```ts
function isInStock(variant: StoreProductVariant | undefined): boolean {
  if (!variant) return false;
  // Staff can take an edition off sale (Medusa Admin → Editions) without
  // deleting it; buyers who already own it keep their access.
  if ((variant.metadata as Record<string, unknown> | null | undefined)?.sale_enabled === false) return false;
```

and update its doc comment's first line to "An edition taken off sale is never purchasable. Otherwise, a variant with…".

In `apps/api/src/lib/medusa-book-variants.ts`: make sure `MedusaAdminVariant` has `metadata?: Record<string, unknown> | null;` (add the field to the type if it is missing), then change `variantInStock` to:

```ts
/** Same rule as apps/client/src/lib/book-variants.ts: an edition taken off
 * sale is never purchasable; otherwise a variant with inventory management
 * off, or backorders allowed, is always purchasable; otherwise it needs a
 * positive inventory_quantity. */
export function variantInStock(variant: MedusaAdminVariant | undefined): boolean {
  if (!variant) return false;
  if (variant.metadata?.sale_enabled === false) return false;
  if (variant.manage_inventory === false) return true;
  if (variant.allow_backorder) return true;
  if (variant.inventory_quantity == null) return true;
  return variant.inventory_quantity > 0;
}
```

If `fetchBookProduct` (same file) requests variant fields explicitly, add `variants.metadata` to that field list.

- [ ] **Step 4: Run tests to verify they pass**

Run the two commands from Step 2. Expected: PASS. Also run `cd apps/api && pnpm -s typecheck` (expected: no output).

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/lib/book-variants.ts apps/client/src/lib/book-variants.test.ts apps/api/src/lib/medusa-book-variants.ts apps/api/src/lib/medusa-book-variants.test.ts
git commit -m "feat(books): editions taken off sale can't be bought"
```

---

### Task 10: Medusa Admin — Create Book form, Book details panel, Editions panel

**Files:**
- Create: `apps/medusa/src/admin/lib/book-profile-form.ts`
- Create: `apps/medusa/src/admin/lib/category-tree.ts`
- Test: `apps/medusa/src/admin/lib/book-profile-form.test.ts`
- Test: `apps/medusa/src/admin/lib/category-tree.test.ts`
- Create: `apps/medusa/src/admin/components/book-profile-fields.tsx`
- Create: `apps/medusa/src/admin/components/category-picker.tsx`
- Create: `apps/medusa/src/admin/widgets/book-profile.tsx`
- Create: `apps/medusa/src/admin/widgets/book-editions.tsx`
- Modify (rewrite): `apps/medusa/src/admin/routes/create-book/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /admin/books/:id/profile` (Task 5); `POST /admin/books` (Task 6); `GET/POST /admin/books/:id/editions`, `POST /admin/books/:id/editions/:variantId` (Task 8); `uploadDigitalFiles`, `DIGITAL_FILES_HINT`, `formatSize` from `src/admin/components/digital-files.tsx` (existing)
- Produces:
  - `type BookProfileFormValue = { authors: string; editors: string; translators: string; publisher: string; isbn: string; external_id: string; publication_year: string; edition_number: string; pages: string; volumes: string; language: "ar" | "en" | "both"; primary_category_id: string; keywords: string; target_audience: string; table_of_contents: string; digital_rights: boolean }`
  - `EMPTY_PROFILE_FORM: BookProfileFormValue`, `splitPeople(text: string): string[]`, `splitKeywords(text: string): string[]`, `toProfilePayload(v: BookProfileFormValue): Record<string, unknown>`, `fromProfile(p: Record<string, unknown> | null): BookProfileFormValue`
  - `type AdminCategory = { id: string; name: string; handle: string; parent_category_id: string | null; metadata: Record<string, unknown> | null }`, `type CategorySection = { id: string; label: string; children: { id: string; label: string }[] }`, `buildCategorySections(categories: AdminCategory[]): CategorySection[]`
  - `<BookProfileFields value onChange />`, `<CategoryPicker primaryId additionalIds onPrimaryChange onAdditionalChange />`

- [ ] **Step 1: Write the failing tests for the pure helpers**

```ts
// apps/medusa/src/admin/lib/book-profile-form.test.ts
import { describe, it, expect } from "vitest";
import { EMPTY_PROFILE_FORM, fromProfile, splitKeywords, splitPeople, toProfilePayload } from "./book-profile-form";

describe("book profile form helpers", () => {
  it("splits people one per line (or Arabic comma), keeping 'Last, First' intact", () => {
    expect(splitPeople("أحمد يوسف\nSmith, John\n\n")).toEqual(["أحمد يوسف", "Smith, John"]);
    expect(splitPeople("أحمد، محمد")).toEqual(["أحمد", "محمد"]);
  });

  it("splits keywords on commas, Arabic commas and new lines", () => {
    expect(splitKeywords("waqf, الوقف،  zakat\nالزكاة")).toEqual(["waqf", "الوقف", "zakat", "الزكاة"]);
  });

  it("converts the form to the API payload with numbers and nulls", () => {
    const payload = toProfilePayload({
      ...EMPTY_PROFILE_FORM,
      authors: "أحمد",
      pages: "320",
      publication_year: "",
      isbn: "978-0-306-40615-7",
      digital_rights: true,
    });
    expect(payload).toMatchObject({
      authors: ["أحمد"], pages: 320, publication_year: null, volumes: 1,
      isbn: "978-0-306-40615-7", digital_rights: true, primary_category_id: null,
    });
  });

  it("round-trips a stored profile", () => {
    const form = fromProfile({ authors: ["A", "B"], keywords: ["x", "y"], pages: 10, volumes: 2, language: "en", digital_rights: true });
    expect(form).toMatchObject({ authors: "A\nB", keywords: "x، y", pages: "10", volumes: "2", language: "en", digital_rights: true });
    expect(fromProfile(null)).toEqual(EMPTY_PROFILE_FORM);
  });
});
```

```ts
// apps/medusa/src/admin/lib/category-tree.test.ts
import { describe, it, expect } from "vitest";
import { buildCategorySections } from "./category-tree";

describe("buildCategorySections", () => {
  it("groups book subcategories under their sections, labelled Arabic / English", () => {
    const sections = buildCategorySections([
      { id: "s1", name: "Islamic Sciences", handle: "islamic-sciences", parent_category_id: null, metadata: { darnozom: "book", name_ar: "العلوم الإسلامية" } },
      { id: "c1", name: "Hadith", handle: "hadith", parent_category_id: "s1", metadata: { darnozom: "book", name_ar: "الحديث" } },
      { id: "x1", name: "Shirts", handle: "shirts", parent_category_id: null, metadata: null },
    ]);
    expect(sections).toEqual([
      { id: "s1", label: "العلوم الإسلامية / Islamic Sciences", children: [{ id: "c1", label: "الحديث / Hadith" }] },
    ]);
  });
});
```

Run: `cd apps/medusa && npx vitest run src/admin/lib`
Expected: FAIL — modules not found

- [ ] **Step 2: Write the helpers**

```ts
// apps/medusa/src/admin/lib/book-profile-form.ts
export type BookProfileFormValue = {
  authors: string;
  editors: string;
  translators: string;
  publisher: string;
  isbn: string;
  external_id: string;
  publication_year: string;
  edition_number: string;
  pages: string;
  volumes: string;
  language: "ar" | "en" | "both";
  primary_category_id: string;
  keywords: string;
  target_audience: string;
  table_of_contents: string;
  digital_rights: boolean;
};

export const EMPTY_PROFILE_FORM: BookProfileFormValue = {
  authors: "", editors: "", translators: "", publisher: "", isbn: "", external_id: "",
  publication_year: "", edition_number: "", pages: "", volumes: "1", language: "ar",
  primary_category_id: "", keywords: "", target_audience: "", table_of_contents: "",
  digital_rights: false,
};

/** One name per line; the Arabic comma also separates. ("Smith, John" stays one name.) */
export function splitPeople(text: string): string[] {
  return text.split(/[\n،]/).map((s) => s.trim()).filter(Boolean);
}

export function splitKeywords(text: string): string[] {
  return text.split(/[\n,،]/).map((s) => s.trim()).filter(Boolean);
}

const num = (s: string) => (s.trim() ? Number(s.trim()) : null);
const text = (s: string) => (s.trim() ? s.trim() : null);

export function toProfilePayload(v: BookProfileFormValue): Record<string, unknown> {
  return {
    authors: splitPeople(v.authors),
    editors: splitPeople(v.editors),
    translators: splitPeople(v.translators),
    publisher: text(v.publisher),
    isbn: text(v.isbn),
    external_id: text(v.external_id),
    publication_year: num(v.publication_year),
    edition_number: num(v.edition_number),
    pages: num(v.pages),
    volumes: num(v.volumes) ?? 1,
    language: v.language,
    primary_category_id: text(v.primary_category_id),
    keywords: splitKeywords(v.keywords),
    target_audience: text(v.target_audience),
    table_of_contents: text(v.table_of_contents),
    digital_rights: v.digital_rights,
  };
}

const list = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : []);
const str = (x: unknown) => (typeof x === "string" ? x : typeof x === "number" ? String(x) : "");

export function fromProfile(p: Record<string, unknown> | null): BookProfileFormValue {
  if (!p) return { ...EMPTY_PROFILE_FORM };
  const language = p.language === "en" || p.language === "both" ? p.language : "ar";
  return {
    authors: list(p.authors).join("\n"),
    editors: list(p.editors).join("\n"),
    translators: list(p.translators).join("\n"),
    publisher: str(p.publisher),
    isbn: str(p.isbn),
    external_id: str(p.external_id),
    publication_year: str(p.publication_year),
    edition_number: str(p.edition_number),
    pages: str(p.pages),
    volumes: str(p.volumes) || "1",
    language,
    primary_category_id: str(p.primary_category_id),
    keywords: list(p.keywords).join("، "),
    target_audience: str(p.target_audience),
    table_of_contents: str(p.table_of_contents),
    digital_rights: p.digital_rights === true,
  };
}
```

```ts
// apps/medusa/src/admin/lib/category-tree.ts
export type AdminCategory = {
  id: string;
  name: string;
  handle: string;
  parent_category_id: string | null;
  metadata: Record<string, unknown> | null;
};
export type CategorySection = { id: string; label: string; children: { id: string; label: string }[] };

function label(c: AdminCategory): string {
  const ar = typeof c.metadata?.name_ar === "string" ? c.metadata.name_ar : "";
  return ar ? `${ar} / ${c.name}` : c.name;
}

/** Book sections (top-level categories marked darnozom=book) with their children. */
export function buildCategorySections(categories: AdminCategory[]): CategorySection[] {
  return categories
    .filter((c) => c.parent_category_id === null && c.metadata?.darnozom === "book")
    .map((s) => ({
      id: s.id,
      label: label(s),
      children: categories.filter((c) => c.parent_category_id === s.id).map((c) => ({ id: c.id, label: label(c) })),
    }));
}
```

Run: `cd apps/medusa && npx vitest run src/admin/lib`
Expected: PASS (5 tests)

- [ ] **Step 3: Write the shared form components**

```tsx
// apps/medusa/src/admin/components/category-picker.tsx
import { Checkbox, Label, Select, Text } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { buildCategorySections, type AdminCategory, type CategorySection } from "../lib/category-tree";

export function useBookCategories(): CategorySection[] {
  const [sections, setSections] = useState<CategorySection[]>([]);
  useEffect(() => {
    fetch("/admin/product-categories?limit=500&fields=id,name,handle,parent_category_id,metadata", { credentials: "include" })
      .then((r) => r.json())
      .then((b: { product_categories?: AdminCategory[] }) => setSections(buildCategorySections(b.product_categories ?? [])))
      .catch(() => setSections([]));
  }, []);
  return sections;
}

export function CategoryPicker(props: {
  primaryId: string;
  additionalIds: string[];
  onPrimaryChange(id: string): void;
  onAdditionalChange(ids: string[]): void;
  showAdditional?: boolean;
}) {
  const sections = useBookCategories();
  const toggle = (id: string, on: boolean) =>
    props.onAdditionalChange(on ? [...props.additionalIds, id] : props.additionalIds.filter((x) => x !== id));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label>Main section and subcategory</Label>
        <Select value={props.primaryId} onValueChange={props.onPrimaryChange}>
          <Select.Trigger>
            <Select.Value placeholder="Choose a subcategory (or a section)" />
          </Select.Trigger>
          <Select.Content>
            {sections.map((s) => (
              <Select.Group key={s.id}>
                <Select.Label>{s.label}</Select.Label>
                <Select.Item value={s.id}>{s.label} — (whole section)</Select.Item>
                {s.children.map((c) => (
                  <Select.Item key={c.id} value={c.id}>{c.label}</Select.Item>
                ))}
              </Select.Group>
            ))}
          </Select.Content>
        </Select>
        <Text size="small" className="text-ui-fg-subtle">
          Sections and subcategories are managed in Products → Categories.
        </Text>
      </div>
      {props.showAdditional !== false && (
        <div className="flex flex-col gap-2">
          <Label>Additional subject categories</Label>
          <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded border p-2">
            {sections.flatMap((s) => [{ id: s.id, label: s.label }, ...s.children]).map((c) =>
              c.id === props.primaryId ? null : (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={props.additionalIds.includes(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} />
                  {c.label}
                </label>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

```tsx
// apps/medusa/src/admin/components/book-profile-fields.tsx
import { Checkbox, Input, Label, Select, Text, Textarea } from "@medusajs/ui";
import type { BookProfileFormValue } from "../lib/book-profile-form";

type Props = { value: BookProfileFormValue; onChange(next: BookProfileFormValue): void };

export function BookProfileFields({ value, onChange }: Props) {
  const set = <K extends keyof BookProfileFormValue>(k: K, v: BookProfileFormValue[K]) => onChange({ ...value, [k]: v });
  const field = (k: keyof BookProfileFormValue, label: string, opts: { type?: string; hint?: string; multiline?: boolean; dir?: "ltr" } = {}) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`bp-${k}`}>{label}</Label>
      {opts.multiline ? (
        <Textarea id={`bp-${k}`} value={value[k] as string} onChange={(e) => set(k, e.target.value as never)} />
      ) : (
        <Input id={`bp-${k}`} type={opts.type ?? "text"} dir={opts.dir} value={value[k] as string} onChange={(e) => set(k, e.target.value as never)} />
      )}
      {opts.hint && <Text size="small" className="text-ui-fg-subtle">{opts.hint}</Text>}
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      {field("authors", "Author(s)", { multiline: true, hint: "One per line. Required." })}
      <div className="grid grid-cols-2 gap-4">
        {field("editors", "Editor(s)", { multiline: true, hint: "One per line, if any." })}
        {field("translators", "Translator(s)", { multiline: true, hint: "One per line, if any." })}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field("publisher", "Publisher")}
        {field("isbn", "ISBN", { dir: "ltr", hint: "ISBN-10 or ISBN-13; hyphens are fine." })}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {field("publication_year", "Year", { type: "number" })}
        {field("edition_number", "Edition no.", { type: "number" })}
        {field("pages", "Pages", { type: "number" })}
        {field("volumes", "Volumes", { type: "number" })}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Language of the book</Label>
        <Select value={value.language} onValueChange={(v) => set("language", v as BookProfileFormValue["language"])}>
          <Select.Trigger><Select.Value /></Select.Trigger>
          <Select.Content>
            <Select.Item value="ar">Arabic — العربية</Select.Item>
            <Select.Item value="en">English — الإنجليزية</Select.Item>
            <Select.Item value="both">Arabic and English</Select.Item>
          </Select.Content>
        </Select>
      </div>
      {field("keywords", "Keywords", { hint: "Separate with commas." })}
      {field("target_audience", "Target audience", { hint: "e.g. researchers, graduate students, policymakers." })}
      {field("table_of_contents", "Table of contents", { multiline: true, hint: "Optional. One chapter per line." })}
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={value.digital_rights} onCheckedChange={(v) => set("digital_rights", v === true)} />
        Digital distribution rights are available (allows a digital edition)
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Write the Book details widget**

```tsx
// apps/medusa/src/admin/widgets/book-profile.tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types";
import { Button, Container, Heading, Text, toast } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { BookProfileFields } from "../components/book-profile-fields";
import { CategoryPicker } from "../components/category-picker";
import { EMPTY_PROFILE_FORM, fromProfile, toProfilePayload, type BookProfileFormValue } from "../lib/book-profile-form";

/** Book-type products, or products that already have a paper/digital edition. */
export function isBookProduct(product: AdminProduct): boolean {
  if (/book|كتاب/i.test(product.type?.value ?? "")) return true;
  return (product.variants ?? []).some((v) => {
    const kind = (v.metadata as { kind?: unknown } | null)?.kind;
    return kind === "paper" || kind === "digital";
  });
}

const BookProfileWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [form, setForm] = useState<BookProfileFormValue>(EMPTY_PROFILE_FORM);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/admin/books/${product.id}/profile`, { credentials: "include" })
      .then((r) => r.json())
      .then((b: { profile: Record<string, unknown> | null }) => setForm(fromProfile(b.profile)))
      .finally(() => setLoaded(true));
  }, [product.id]);

  if (!isBookProduct(product)) return null;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/admin/books/${product.id}/profile`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toProfilePayload(form)),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body.errors as string[] | undefined)?.join("\n") || body.message || `Save failed (${res.status})`);
      setForm(fromProfile(body.profile));
      toast.success("Book details saved");
    } catch (e) {
      toast.error("Could not save", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Book details</Heading>
          <Text size="small" className="text-ui-fg-subtle">Authors, publisher, ISBN, classification and more — shown on the book page and used by search.</Text>
        </div>
        <Button size="small" onClick={save} isLoading={saving} disabled={!loaded}>Save</Button>
      </div>
      <div className="flex flex-col gap-6 px-6 py-4">
        <CategoryPicker
          primaryId={form.primary_category_id}
          additionalIds={[]}
          onPrimaryChange={(id) => setForm({ ...form, primary_category_id: id })}
          onAdditionalChange={() => undefined}
          showAdditional={false}
        />
        <Text size="small" className="text-ui-fg-subtle">Additional subject categories: use the product's own "Categories" field above.</Text>
        <BookProfileFields value={form} onChange={setForm} />
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({ zone: "product.details.after" });
export default BookProfileWidget;
```

- [ ] **Step 5: Write the Editions widget**

```tsx
// apps/medusa/src/admin/widgets/book-editions.tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types";
import { Badge, Button, Container, Heading, Input, Label, Switch, Text, toast } from "@medusajs/ui";
import { useCallback, useEffect, useState } from "react";
import { isBookProduct } from "./book-profile";

type Edition = { variant_id: string; kind: "paper" | "digital"; title: string; price: number | null; sale_enabled: boolean };

const BookEditionsWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [editions, setEditions] = useState<Edition[] | null>(null);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");

  const load = useCallback(async () => {
    const r = await fetch(`/admin/books/${product.id}/editions`, { credentials: "include" });
    const b = await r.json();
    setEditions(b.editions ?? []);
  }, [product.id]);
  useEffect(() => { void load(); }, [load]);

  const call = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.message || `Failed (${r.status})`);
  };

  const add = async (kind: "paper" | "digital") => {
    try {
      await call(`/admin/books/${product.id}/editions`, { kind, price: Number(price), ...(kind === "paper" ? { stock: Number(stock) } : {}) });
      toast.success(`${kind === "paper" ? "Print" : "Digital"} edition added`);
      setPrice("");
      await load();
    } catch (e) {
      toast.error("Could not add edition", { description: (e as Error).message });
    }
  };

  const toggle = async (e: Edition, on: boolean) => {
    try {
      await call(`/admin/books/${product.id}/editions/${e.variant_id}`, { sale_enabled: on });
      await load();
    } catch (err) {
      toast.error("Could not update", { description: (err as Error).message });
    }
  };

  if (!editions || !isBookProduct(product)) return null;
  const has = (k: Edition["kind"]) => editions.some((e) => e.kind === k);

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Editions</Heading>
        <Text size="small" className="text-ui-fg-subtle">Print and digital are sold separately. Edit prices and stock on each variant.</Text>
      </div>
      {editions.map((e) => (
        <div key={e.variant_id} className="flex items-center justify-between gap-2 px-6 py-3">
          <div className="flex items-center gap-2">
            <Badge size="2xsmall" color={e.kind === "digital" ? "purple" : "blue"}>{e.kind === "digital" ? "Digital" : "Print"}</Badge>
            <Text size="small">{e.price != null ? `${e.price.toFixed(2)} EGP` : "No EGP price"}</Text>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={e.sale_enabled} onCheckedChange={(on) => toggle(e, on)} />
            {e.sale_enabled ? "On sale" : "Off sale"}
          </label>
        </div>
      ))}
      {(!has("paper") || !has("digital")) && (
        <div className="flex flex-col gap-2 px-6 py-4">
          <Label>Add an edition</Label>
          <div className="flex gap-2">
            <Input type="number" min="0.01" step="0.01" placeholder="Price (EGP)" value={price} onChange={(ev) => setPrice(ev.target.value)} />
            {!has("paper") && <Input type="number" min="0" step="1" placeholder="Stock" value={stock} onChange={(ev) => setStock(ev.target.value)} />}
          </div>
          <div className="flex gap-2">
            {!has("paper") && <Button size="small" variant="secondary" onClick={() => add("paper")}>Add print edition</Button>}
            {!has("digital") && <Button size="small" variant="secondary" onClick={() => add("digital")}>Add digital edition</Button>}
          </div>
        </div>
      )}
    </Container>
  );
};

export const config = defineWidgetConfig({ zone: "product.details.side.after" });
export default BookEditionsWidget;
```

- [ ] **Step 6: Rewrite the Create Book page**

Replace `apps/medusa/src/admin/routes/create-book/page.tsx`. Keep from the current file, unchanged: the imports of `defineRouteConfig`, `@medusajs/ui` components, `useNavigate`, the `DIGITAL_FILES_HINT/formatSize/uploadDigitalFiles` import, the `SalesChannel` type, the image state/previews/`makeCover`/`uploadImages` logic and the images JSX block, the digital files JSX block, and `config`. Remove `ensureBookCategories`, `BOOK_CATEGORY_SEEDS`, the `author`/`categoryId` state and the category `<Select>` (Task 4 seeds categories now). Add these pieces:

```tsx
import { BookProfileFields } from "../../components/book-profile-fields";
import { CategoryPicker } from "../../components/category-picker";
import { EMPTY_PROFILE_FORM, toProfilePayload, type BookProfileFormValue } from "../../lib/book-profile-form";

// inside CreateBookPage, alongside the existing state:
const [subtitle, setSubtitle] = useState("");
const [profile, setProfile] = useState<BookProfileFormValue>(EMPTY_PROFILE_FORM);
const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([]);
const [hasPrint, setHasPrint] = useState(true);
// hasDigital, paperPrice, paperInventoryQty, digitalPrice, digitalFiles: keep the existing state.
```

The request body in `onSubmit` becomes:

```tsx
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          description: description.trim() || null,
          status,
          sales_channel_id: salesChannelId,
          image_urls: imageUrls,
          additional_category_ids: additionalCategoryIds,
          print: hasPrint ? { price: Number(paperPrice), stock: Number(paperInventoryQty) } : null,
          digital: hasDigital ? { price: Number(digitalPrice) } : null,
          profile: toProfilePayload(profile),
        }),
```

and the error line becomes `throw new Error((body.errors as string[] | undefined)?.join("\n") || body.message || \`Create failed (${res.status})\`);`.

Description field hint (below the `<Textarea id="description">`):

```tsx
          <Text size="small" className="text-ui-fg-subtle">
            A professional text: the book's subject, main themes, scholarly
            significance and who it is for.
          </Text>
```

Form order: Title, Subtitle (`<Input id="subtitle">`), Description (+hint), `<CategoryPicker primaryId={profile.primary_category_id} additionalIds={additionalCategoryIds} onPrimaryChange={(id) => setProfile({ ...profile, primary_category_id: id })} onAdditionalChange={setAdditionalCategoryIds} />`, `<BookProfileFields value={profile} onChange={setProfile} />`, Status, Sales channel, Images, then the editions block:

```tsx
        <div className="flex items-center gap-x-3">
          <Switch id="hasPrint" checked={hasPrint} onCheckedChange={setHasPrint} />
          <Label htmlFor="hasPrint">Sell a print edition</Label>
        </div>
        {hasPrint && (
          <div className="grid grid-cols-2 gap-4 rounded border p-4">
            {/* existing Paper price + Paper inventory inputs, unchanged */}
          </div>
        )}
        <div className="flex items-center gap-x-3">
          <Switch
            id="hasDigital"
            checked={hasDigital}
            disabled={!profile.digital_rights}
            onCheckedChange={setHasDigital}
          />
          <Label htmlFor="hasDigital">Sell a digital edition</Label>
        </div>
        {!profile.digital_rights && (
          <Text size="small" className="text-ui-fg-subtle">
            Tick "Digital distribution rights are available" above to sell a digital edition.
          </Text>
        )}
        {hasDigital && profile.digital_rights && (
          /* existing digital price + digital files block, unchanged */
        )}
```

Change the `hasDigital` initial state to `useState(false)` (no digital edition by default). In the submit guard, keep uploading digital files only when `hasDigital && digitalFiles.length && body.digitalVariantId`. The page's intro text becomes: "Creates a Book-type product: print, digital or both — each with its own price and availability."

- [ ] **Step 7: Build and check it in the browser**

Run: `cd apps/medusa && npx vitest run src/admin/lib && npx medusa build`
Expected: tests PASS; "Backend build completed successfully" and "Frontend build completed successfully".
Then, with `pnpm dev` running: open `http://localhost:9010/app/create-book`, create a print-only book with two authors, a subcategory, an ISBN and two images; confirm the product page shows the "Book details" panel filled in and the "Editions" panel with one Print edition; tick digital rights, save, add a digital edition from the Editions panel, toggle it off sale.

- [ ] **Step 8: Commit**

```bash
git add apps/medusa/src/admin
git commit -m "feat(books): admin form for full book details, classification and editions"
```

---

# Phase 3 — Storefront

### Task 11: Search and related-books engine

**Files:**
- Create: `apps/medusa/src/lib/book-search.ts`
- Test: `apps/medusa/src/lib/book-search.test.ts`

**Interfaces:**
- Consumes: `normalizeSearchText`, `searchTokens`, `normalizeIsbn` (Task 1); `BookProfileRow` (Task 3)
- Produces:
  - `type CategoryNode = { id: string; parent_category_id: string | null; name: string; name_ar: string | null; handle: string }`
  - `type BookSearchEntry = { product_id: string; title: string; subtitle: string | null; created_at: string; category_ids: string[]; formats: ("paper" | "digital")[]; profile: BookProfileRow | null }`
  - `type Facet = { value: string; count: number }`
  - `type BookSearchFilters = { q?: string; category_id?: string; author?: string; publisher?: string; language?: "ar" | "en" | "both"; format?: "paper" | "digital"; limit: number; offset: number }`
  - `type BookSearchResult = { product_ids: string[]; count: number; facets: { authors: Facet[]; publishers: Facet[]; languages: Facet[] } }`
  - `descendantIds(categories: CategoryNode[], rootId: string): Set<string>`
  - `searchBooks(entries: BookSearchEntry[], categories: CategoryNode[], filters: BookSearchFilters): BookSearchResult`
  - `relatedBooks(entries: BookSearchEntry[], productId: string, limit?: number): string[]`

- [ ] **Step 1: Write the failing test**

```ts
// apps/medusa/src/lib/book-search.test.ts
import { describe, it, expect } from "vitest";
import { descendantIds, relatedBooks, searchBooks, type BookSearchEntry, type CategoryNode } from "./book-search";

const categories: CategoryNode[] = [
  { id: "s_law", parent_category_id: null, name: "Islamic Law and Thought", name_ar: "الشريعة والفكر الإسلامي", handle: "islamic-law-thought" },
  { id: "c_fiqh", parent_category_id: "s_law", name: "Fiqh and Its Principles", name_ar: "الفقه وأصوله", handle: "fiqh-usul" },
  { id: "s_admin", parent_category_id: null, name: "Public Administration", name_ar: "الإدارة العامة", handle: "public-administration" },
];

function entry(id: string, over: Partial<BookSearchEntry> & { profile?: Partial<NonNullable<BookSearchEntry["profile"]>> }): BookSearchEntry {
  const { profile, ...rest } = over;
  return {
    product_id: id,
    title: id,
    subtitle: null,
    created_at: "2026-01-01T00:00:00Z",
    category_ids: [],
    formats: ["paper"],
    ...rest,
    profile: {
      id: `bp_${id}`, product_id: id, authors: [], editors: [], translators: [], publisher: null,
      isbn: null, external_id: null, publication_year: null, edition_number: null, pages: null,
      volumes: 1, language: "ar", primary_category_id: null, keywords: [], target_audience: null,
      table_of_contents: null, digital_rights: false, ...profile,
    },
  };
}

const books = [
  entry("usul", { title: "أصول الفقه الإسلامي", category_ids: ["c_fiqh"], created_at: "2026-03-01T00:00:00Z", profile: { authors: ["وهبة الزحيلي"], publisher: "دار الفكر", keywords: ["أصول", "اجتهاد"], isbn: "9780306406157" } }),
  entry("maqasid", { title: "مقاصد الشريعة", category_ids: ["s_law"], formats: ["paper", "digital"], created_at: "2026-02-01T00:00:00Z", profile: { authors: ["ابن عاشور"], publisher: "دار نظم", keywords: ["اجتهاد"], language: "both" } }),
  entry("gov", { title: "Public Governance", category_ids: ["s_admin"], formats: ["digital"], created_at: "2026-01-15T00:00:00Z", profile: { authors: ["John Smith"], publisher: "دار نظم", language: "en" } }),
];

describe("searchBooks", () => {
  const all = { limit: 24, offset: 0 };

  it("matches Arabic spelling variants in the title", () => {
    expect(searchBooks(books, categories, { ...all, q: "اصول الفقة" }).product_ids).toEqual(["usul"]);
  });

  it("finds books by author, publisher, keyword, ISBN and section name", () => {
    expect(searchBooks(books, categories, { ...all, q: "الزحيلي" }).product_ids).toEqual(["usul"]);
    expect(searchBooks(books, categories, { ...all, q: "دار نظم" }).product_ids).toEqual(["maqasid", "gov"]);
    expect(searchBooks(books, categories, { ...all, q: "اجتهاد" }).product_ids).toEqual(["usul", "maqasid"]);
    expect(searchBooks(books, categories, { ...all, q: "978-0-306-40615-7" }).product_ids).toEqual(["usul"]);
    expect(searchBooks(books, categories, { ...all, q: "الإدارة العامة" }).product_ids).toEqual(["gov"]);
  });

  it("filters a section including its subcategories", () => {
    expect(searchBooks(books, categories, { ...all, category_id: "s_law" }).product_ids).toEqual(["usul", "maqasid"]);
    expect(searchBooks(books, categories, { ...all, category_id: "c_fiqh" }).product_ids).toEqual(["usul"]);
  });

  it("filters by author, publisher, language and format", () => {
    expect(searchBooks(books, categories, { ...all, author: "ابن عاشور" }).product_ids).toEqual(["maqasid"]);
    expect(searchBooks(books, categories, { ...all, publisher: "دار نظم", format: "digital" }).product_ids).toEqual(["maqasid", "gov"]);
    expect(searchBooks(books, categories, { ...all, language: "en" }).product_ids).toEqual(["gov"]);
  });

  it("returns facets from the searched set, and paginates newest first", () => {
    const r = searchBooks(books, categories, { ...all, category_id: "s_law", limit: 1 });
    expect(r.count).toBe(2);
    expect(r.product_ids).toEqual(["usul"]);
    expect(r.facets.authors).toEqual([{ value: "ابن عاشور", count: 1 }, { value: "وهبة الزحيلي", count: 1 }]);
    expect(r.facets.publishers).toEqual([{ value: "دار الفكر", count: 1 }, { value: "دار نظم", count: 1 }]);
    const page2 = searchBooks(books, categories, { ...all, category_id: "s_law", limit: 1, offset: 1 });
    expect(page2.product_ids).toEqual(["maqasid"]);
  });

  it("ranks title matches above other matches", () => {
    const extra = entry("other", { title: "Something else", created_at: "2027-01-01T00:00:00Z", profile: { keywords: ["مقاصد"] } });
    expect(searchBooks([...books, extra], categories, { ...all, q: "مقاصد" }).product_ids).toEqual(["maqasid", "other"]);
  });
});

describe("descendantIds", () => {
  it("includes the root and all levels below it", () => {
    expect([...descendantIds(categories, "s_law")].sort()).toEqual(["c_fiqh", "s_law"]);
  });
});

describe("relatedBooks", () => {
  it("relates books by shared category, author or keyword — never the book itself, never by publisher alone", () => {
    expect(relatedBooks(books, "usul")).toEqual(["maqasid"]); // shared keyword "اجتهاد"
    expect(relatedBooks(books, "gov")).toEqual([]); // only the publisher in common
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/medusa && npx vitest run src/lib/book-search.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```ts
// apps/medusa/src/lib/book-search.ts
import type { BookProfileRow } from "../modules/book-catalog";
import { normalizeIsbn, normalizeSearchText, searchTokens } from "./book-text";

export type CategoryNode = { id: string; parent_category_id: string | null; name: string; name_ar: string | null; handle: string };
export type BookSearchEntry = {
  product_id: string;
  title: string;
  subtitle: string | null;
  created_at: string;
  category_ids: string[];
  formats: ("paper" | "digital")[];
  profile: BookProfileRow | null;
};
export type Facet = { value: string; count: number };
export type BookSearchFilters = {
  q?: string;
  category_id?: string;
  author?: string;
  publisher?: string;
  language?: "ar" | "en" | "both";
  format?: "paper" | "digital";
  limit: number;
  offset: number;
};
export type BookSearchResult = {
  product_ids: string[];
  count: number;
  facets: { authors: Facet[]; publishers: Facet[]; languages: Facet[] };
};

export function descendantIds(categories: CategoryNode[], rootId: string): Set<string> {
  const out = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parent_category_id && out.has(c.parent_category_id) && !out.has(c.id)) {
        out.add(c.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Category names (and their parents' names), both languages. */
function categoryTrailText(categories: CategoryNode[], ids: string[]): string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const parts: string[] = [];
  for (const id of ids) {
    let c = byId.get(id);
    while (c) {
      parts.push(c.name, c.name_ar ?? "");
      c = c.parent_category_id ? byId.get(c.parent_category_id) : undefined;
    }
  }
  return parts.join(" ");
}

const people = (p: BookProfileRow | null) => [...(p?.authors ?? []), ...(p?.editors ?? []), ...(p?.translators ?? [])];

function haystack(e: BookSearchEntry, categories: CategoryNode[]): string {
  const p = e.profile;
  return normalizeSearchText(
    [
      e.title,
      e.subtitle ?? "",
      ...people(p),
      p?.publisher ?? "",
      ...(p?.keywords ?? []),
      p?.target_audience ?? "",
      categoryTrailText(categories, e.category_ids),
    ].join(" "),
  );
}

function facet(values: string[]): Facet[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "ar"));
}

const newestFirst = (a: BookSearchEntry, b: BookSearchEntry) => b.created_at.localeCompare(a.created_at);

export function searchBooks(entries: BookSearchEntry[], categories: CategoryNode[], f: BookSearchFilters): BookSearchResult {
  const tokens = searchTokens(f.q);
  const isbnQuery = normalizeIsbn(f.q);
  const inCategory = f.category_id ? descendantIds(categories, f.category_id) : null;

  // Base set: search text, category, format. Facets describe this set.
  const scored: { e: BookSearchEntry; score: number }[] = [];
  for (const e of entries) {
    if (inCategory && !e.category_ids.some((id) => inCategory.has(id))) continue;
    if (f.format && !e.formats.includes(f.format)) continue;
    let score = 1;
    if (tokens.length) {
      const isbnHit = !!isbnQuery && isbnQuery.length >= 10 && e.profile?.isbn === isbnQuery;
      const text = haystack(e, categories);
      if (!isbnHit && !tokens.every((t) => text.includes(t))) continue;
      const title = normalizeSearchText(`${e.title} ${e.subtitle ?? ""}`);
      score = isbnHit || tokens.every((t) => title.includes(t)) ? 2 : 1;
    }
    scored.push({ e, score });
  }

  const facets = {
    authors: facet(scored.flatMap(({ e }) => e.profile?.authors ?? [])),
    publishers: facet(scored.flatMap(({ e }) => (e.profile?.publisher ? [e.profile.publisher] : []))),
    languages: facet(scored.map(({ e }) => e.profile?.language ?? "ar")),
  };

  const author = normalizeSearchText(f.author);
  const publisher = normalizeSearchText(f.publisher);
  const results = scored
    .filter(({ e }) => !author || people(e.profile).some((n) => normalizeSearchText(n) === author))
    .filter(({ e }) => !publisher || normalizeSearchText(e.profile?.publisher) === publisher)
    .filter(({ e }) => !f.language || (e.profile?.language ?? "ar") === f.language)
    .sort((a, b) => b.score - a.score || newestFirst(a.e, b.e));

  return {
    product_ids: results.slice(f.offset, f.offset + f.limit).map(({ e }) => e.product_id),
    count: results.length,
    facets,
  };
}

/** Up to `limit` books that share a category, an author or a keyword. */
export function relatedBooks(entries: BookSearchEntry[], productId: string, limit = 8): string[] {
  const target = entries.find((e) => e.product_id === productId);
  if (!target) return [];
  const tAuthors = new Set((target.profile?.authors ?? []).map(normalizeSearchText));
  const tKeywords = new Set((target.profile?.keywords ?? []).map(normalizeSearchText));
  const tPrimary = target.profile?.primary_category_id;
  return entries
    .filter((e) => e.product_id !== productId)
    .map((e) => {
      let score = 0;
      if (tPrimary && e.category_ids.includes(tPrimary)) score += 3;
      score += e.category_ids.filter((id) => target.category_ids.includes(id)).length;
      score += 2 * (e.profile?.authors ?? []).filter((a) => tAuthors.has(normalizeSearchText(a))).length;
      score += (e.profile?.keywords ?? []).filter((k) => tKeywords.has(normalizeSearchText(k))).length;
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || newestFirst(a.e, b.e))
    .slice(0, limit)
    .map((x) => x.e.product_id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/medusa && npx vitest run src/lib/book-search.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/lib/book-search.ts apps/medusa/src/lib/book-search.test.ts
git commit -m "feat(books): Arabic-aware book search, facets and related books"
```

---

### Task 12: Store API — `/store/books/search` and `/store/books/:id`

**Files:**
- Create: `apps/medusa/src/lib/book-catalog-loader.ts`
- Test: `apps/medusa/src/lib/book-catalog-loader.test.ts`
- Create: `apps/medusa/src/api/store/books/search/route.ts`
- Create: `apps/medusa/src/api/store/books/[id]/route.ts`
- Test: `apps/medusa/src/api/store/books/search/route.test.ts`

**Interfaces:**
- Consumes: `BookSearchEntry`, `CategoryNode`, `searchBooks`, `relatedBooks` (Task 11); `BOOK_CATALOG_MODULE`, `BookProfileRow` (Task 3)
- Produces:
  - `loadBookCatalog(deps: { graph(args: unknown): Promise<{ data: unknown[] }>; listProfiles(productIds: string[]): Promise<BookProfileRow[]> }, opts: { salesChannelIds: string[]; bookTypeId?: string }): Promise<{ entries: BookSearchEntry[]; categories: CategoryNode[] }>`
  - `GET /store/books/search?q&category_id&author&publisher&language&format&limit&offset` → `BookSearchResult`
  - `GET /store/books/:id` → `{ profile: BookProfileRow | null; categories: Array<{ id: string; name: string; name_ar: string | null; handle: string; parent: { id: string; name: string; name_ar: string | null; handle: string } | null }>; related_product_ids: string[] }` or 404

- [ ] **Step 1: Write the failing tests**

```ts
// apps/medusa/src/lib/book-catalog-loader.test.ts
import { describe, it, expect, vi } from "vitest";
import { loadBookCatalog } from "./book-catalog-loader";

describe("loadBookCatalog", () => {
  const products = [
    {
      id: "p1", title: "A", subtitle: null, created_at: "2026-01-01", sales_channels: [{ id: "sc_web" }],
      categories: [{ id: "c1" }],
      variants: [
        { metadata: { kind: "paper" } },
        { metadata: { kind: "digital", sale_enabled: false } },
      ],
    },
    { id: "p2", title: "B", subtitle: null, created_at: "2026-01-02", sales_channels: [{ id: "sc_other" }], categories: [], variants: [{ title: "Digital", metadata: null }] },
  ];
  const graph = vi.fn(async ({ entity }: { entity: string }) =>
    entity === "product"
      ? { data: products }
      : { data: [{ id: "c1", name: "Fiqh", handle: "fiqh", parent_category_id: null, metadata: { name_ar: "الفقه" } }] },
  );

  it("keeps books in the shopper's sales channel, with only on-sale formats", async () => {
    const { entries, categories } = await loadBookCatalog(
      { graph, listProfiles: vi.fn(async () => [{ product_id: "p1", authors: ["X"] } as never]) },
      { salesChannelIds: ["sc_web"], bookTypeId: "ptyp_book" },
    );
    expect(entries.map((e) => e.product_id)).toEqual(["p1"]);
    expect(entries[0].formats).toEqual(["paper"]);
    expect(entries[0].profile).toMatchObject({ authors: ["X"] });
    expect(categories[0]).toEqual({ id: "c1", name: "Fiqh", name_ar: "الفقه", handle: "fiqh", parent_category_id: null });
    expect(graph.mock.calls[0][0]).toMatchObject({ filters: { status: "published", type_id: "ptyp_book" } });
  });

  it("detects the edition from the variant title when metadata.kind is missing", async () => {
    const { entries } = await loadBookCatalog({ graph, listProfiles: vi.fn(async () => []) }, { salesChannelIds: [] });
    expect(entries.find((e) => e.product_id === "p2")?.formats).toEqual(["digital"]);
  });
});
```

```ts
// apps/medusa/src/api/store/books/search/route.test.ts
import { describe, it, expect, vi } from "vitest";

const { loadMock } = vi.hoisted(() => ({ loadMock: vi.fn() }));
vi.mock("../../../../lib/book-catalog-loader", () => ({ loadBookCatalog: loadMock, makeCatalogDeps: () => ({}) }));

import { GET } from "./route";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("GET /store/books/search", () => {
  it("clamps paging, passes filters and the shopper's sales channels", async () => {
    loadMock.mockResolvedValue({ entries: [], categories: [] });
    const res = fakeRes();
    await GET({ query: { q: "فقه", limit: "500", offset: "-3", format: "digital", language: "xx" }, publishable_key_context: { sales_channel_ids: ["sc_web"] }, scope: {} } as any, res);
    expect(loadMock.mock.calls[0][1]).toMatchObject({ salesChannelIds: ["sc_web"] });
    expect(res.json).toHaveBeenCalledWith({ product_ids: [], count: 0, facets: { authors: [], publishers: [], languages: [] } });
  });
});
```

Run: `cd apps/medusa && npx vitest run src/lib/book-catalog-loader.test.ts src/api/store/books`
Expected: FAIL — modules not found

- [ ] **Step 2: Write the loader and routes**

```ts
// apps/medusa/src/lib/book-catalog-loader.ts
import type { MedusaContainer } from "@medusajs/framework/types";
import { BOOK_CATALOG_MODULE, type BookProfileRepo, type BookProfileRow } from "../modules/book-catalog";
import type { BookSearchEntry, CategoryNode } from "./book-search";

type Graph = (args: unknown) => Promise<{ data: unknown[] }>;
type RawVariant = { title?: string | null; metadata?: Record<string, unknown> | null };
type RawProduct = {
  id: string;
  title: string;
  subtitle: string | null;
  created_at: string | Date;
  sales_channels?: { id: string }[];
  categories?: { id: string }[];
  variants?: RawVariant[];
};

function editionOf(v: RawVariant): "paper" | "digital" | null {
  const k = v.metadata?.kind;
  if (k === "paper" || k === "digital") return k;
  const t = (v.title ?? "").trim().toLowerCase();
  if (["paper", "ورقي", "print"].includes(t)) return "paper";
  if (["digital", "رقمي", "الكتروني", "إلكتروني", "pdf"].includes(t)) return "digital";
  return null;
}

/** The published book catalog visible to one storefront (sales channel). */
export async function loadBookCatalog(
  deps: { graph: Graph; listProfiles(productIds: string[]): Promise<BookProfileRow[]> },
  opts: { salesChannelIds: string[]; bookTypeId?: string },
): Promise<{ entries: BookSearchEntry[]; categories: CategoryNode[] }> {
  const [{ data: products }, { data: cats }] = await Promise.all([
    deps.graph({
      entity: "product",
      fields: ["id", "title", "subtitle", "created_at", "sales_channels.id", "categories.id", "variants.title", "variants.metadata"],
      filters: { status: "published", ...(opts.bookTypeId ? { type_id: opts.bookTypeId } : {}) },
    }),
    deps.graph({ entity: "product_category", fields: ["id", "name", "handle", "parent_category_id", "metadata"] }),
  ]);

  const visible = (products as RawProduct[]).filter(
    (p) => !opts.salesChannelIds.length || (p.sales_channels ?? []).some((s) => opts.salesChannelIds.includes(s.id)),
  );
  const profiles = new Map((await deps.listProfiles(visible.map((p) => p.id))).map((r) => [r.product_id, r]));

  const entries: BookSearchEntry[] = visible.map((p) => ({
    product_id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    created_at: new Date(p.created_at).toISOString(),
    category_ids: (p.categories ?? []).map((c) => c.id),
    formats: [...new Set((p.variants ?? []).filter((v) => v.metadata?.sale_enabled !== false).map(editionOf).filter((k): k is "paper" | "digital" => !!k))],
    profile: profiles.get(p.id) ?? null,
  }));

  const categories: CategoryNode[] = (cats as Array<{ id: string; name: string; handle: string; parent_category_id: string | null; metadata: Record<string, unknown> | null }>).map((c) => ({
    id: c.id,
    name: c.name,
    name_ar: typeof c.metadata?.name_ar === "string" ? c.metadata.name_ar : null,
    handle: c.handle,
    parent_category_id: c.parent_category_id,
  }));

  return { entries, categories };
}

export function makeCatalogDeps(container: MedusaContainer) {
  const query = container.resolve("query");
  const repo = container.resolve(BOOK_CATALOG_MODULE) as unknown as BookProfileRepo;
  return {
    graph: (args: unknown) => query.graph(args as never) as Promise<{ data: unknown[] }>,
    listProfiles: (ids: string[]) => (ids.length ? repo.listBookProfiles({ product_id: ids }) : Promise.resolve([])),
  };
}
```

```ts
// apps/medusa/src/api/store/books/search/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { loadBookCatalog, makeCatalogDeps } from "../../../../lib/book-catalog-loader";
import { searchBooks, type BookSearchFilters } from "../../../../lib/book-search";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : undefined);

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = (req.query ?? {}) as Record<string, unknown>;
  const limit = Math.min(Math.max(Number(q.limit) || 24, 1), 48);
  const offset = Math.max(Number(q.offset) || 0, 0);
  const language = q.language === "ar" || q.language === "en" || q.language === "both" ? q.language : undefined;
  const format = q.format === "paper" || q.format === "digital" ? q.format : undefined;
  const filters: BookSearchFilters = {
    q: str(q.q), category_id: str(q.category_id), author: str(q.author), publisher: str(q.publisher),
    language, format, limit, offset,
  };
  const salesChannelIds =
    ((req as unknown as { publishable_key_context?: { sales_channel_ids?: string[] } }).publishable_key_context?.sales_channel_ids) ?? [];
  const { entries, categories } = await loadBookCatalog(makeCatalogDeps(req.scope), {
    salesChannelIds,
    bookTypeId: process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID?.trim() || undefined,
  });
  return res.json(searchBooks(entries, categories, filters));
}
```

```ts
// apps/medusa/src/api/store/books/[id]/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { loadBookCatalog, makeCatalogDeps } from "../../../../lib/book-catalog-loader";
import { relatedBooks } from "../../../../lib/book-search";

/** Book page extras: profile, category trail (with section), related books. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const salesChannelIds =
    ((req as unknown as { publishable_key_context?: { sales_channel_ids?: string[] } }).publishable_key_context?.sales_channel_ids) ?? [];
  const { entries, categories } = await loadBookCatalog(makeCatalogDeps(req.scope), {
    salesChannelIds,
    bookTypeId: process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID?.trim() || undefined,
  });
  const entry = entries.find((e) => e.product_id === req.params.id);
  if (!entry) return res.status(404).json({ message: "Book not found" });

  const byId = new Map(categories.map((c) => [c.id, c]));
  const pick = (c: { id: string; name: string; name_ar: string | null; handle: string }) => ({ id: c.id, name: c.name, name_ar: c.name_ar, handle: c.handle });
  const primary = entry.profile?.primary_category_id;
  const orderedIds = [...new Set([...(primary ? [primary] : []), ...entry.category_ids])];
  const trail = orderedIds.flatMap((id) => {
    const c = byId.get(id);
    if (!c) return [];
    const parent = c.parent_category_id ? byId.get(c.parent_category_id) : undefined;
    return [{ ...pick(c), parent: parent ? pick(parent) : null }];
  });

  return res.json({
    profile: entry.profile,
    categories: trail,
    related_product_ids: relatedBooks(entries, entry.product_id),
  });
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd apps/medusa && npx vitest run src/lib/book-catalog-loader.test.ts src/api/store/books`
Expected: PASS (3 tests)

- [ ] **Step 4: Check against the running server**

With `pnpm dev` running and the seed from Task 4 applied:
Run: `curl -s -H "x-publishable-api-key: $VITE_MEDUSA_PUBLISHABLE_KEY" "http://localhost:9010/store/books/search?q=فقه"`
Expected: JSON with `product_ids`, `count`, `facets`.

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/lib/book-catalog-loader.ts apps/medusa/src/lib/book-catalog-loader.test.ts apps/medusa/src/api/store/books
git commit -m "feat(books): store search and book-page APIs"
```

---

### Task 13: Storefront data layer — search, book details, category tree, URL filters

**Files:**
- Create: `apps/client/src/lib/book-catalog.ts`
- Create: `apps/client/src/lib/book-filters.ts`
- Test: `apps/client/src/lib/book-catalog.test.ts`
- Test: `apps/client/src/lib/book-filters.test.ts`

**Interfaces:**
- Consumes: `/store/books/search`, `/store/books/:id` (Task 12); `getMedusaClient`, `getStoreRegionId` (`lib/medusa-client.ts`); `STORE_BOOK_PRODUCT_FIELDS` (`lib/list-store-books.ts`)
- Produces:
  - `type BookFacet = { value: string; count: number }`
  - `type BookSearchParams = { q?: string; category_id?: string; author?: string; publisher?: string; language?: "ar" | "en" | "both"; format?: "paper" | "digital"; limit?: number; offset?: number }`
  - `searchStoreBooks(params: BookSearchParams): Promise<{ products: HttpTypes.StoreProduct[]; total: number; facets: { authors: BookFacet[]; publishers: BookFacet[]; languages: BookFacet[] } }>`
  - `type BookProfile = { authors: string[]; editors: string[]; translators: string[]; publisher: string | null; isbn: string | null; publication_year: number | null; edition_number: number | null; pages: number | null; volumes: number; language: "ar" | "en" | "both"; keywords: string[]; target_audience: string | null; table_of_contents: string | null }`
  - `type BookCategoryRef = { id: string; name: string; name_ar: string | null; handle: string; parent: Omit<BookCategoryRef, "parent"> | null }`
  - `fetchBookDetails(productId: string): Promise<{ profile: BookProfile | null; categories: BookCategoryRef[]; related_product_ids: string[] } | null>`
  - `listProductsByIds(ids: string[]): Promise<HttpTypes.StoreProduct[]>` (keeps the given order)
  - `type CategoryTreeNode = { id: string; name: string; nameAr: string | null; children: CategoryTreeNode[] }`, `listBookCategoryTree(): Promise<CategoryTreeNode[]>`
  - `type BookFilters = { q: string; category: string; author: string; publisher: string; language: "" | "ar" | "en" | "both"; format: "all" | "paper" | "digital" }`, `readBookFilters(search: string): BookFilters`, `bookFiltersToQuery(f: BookFilters): string`, `EMPTY_BOOK_FILTERS: BookFilters`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/client/src/lib/book-filters.test.ts
import { describe, it, expect } from "vitest";
import { bookFiltersToQuery, EMPTY_BOOK_FILTERS, readBookFilters } from "./book-filters";

describe("book filters in the URL", () => {
  it("reads all filters and maps legacy format names", () => {
    expect(readBookFilters("?q=فقه&category=pcat_1&author=ابن%20عاشور&publisher=دار&language=en&format=online")).toEqual({
      q: "فقه", category: "pcat_1", author: "ابن عاشور", publisher: "دار", language: "en", format: "digital",
    });
    expect(readBookFilters("")).toEqual(EMPTY_BOOK_FILTERS);
    expect(readBookFilters("?language=fr&format=weird").language).toBe("");
  });

  it("writes only non-default filters", () => {
    expect(bookFiltersToQuery({ ...EMPTY_BOOK_FILTERS, q: " فقه ", format: "paper" })).toBe("q=%D9%81%D9%82%D9%87&format=paper");
    expect(bookFiltersToQuery(EMPTY_BOOK_FILTERS)).toBe("");
  });
});
```

```ts
// apps/client/src/lib/book-catalog.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
const listProducts = vi.fn();
const listCategories = vi.fn();
vi.mock("./medusa-client", () => ({
  getMedusaClient: () => ({ client: { fetch: fetchMock }, store: { product: { list: listProducts }, category: { list: listCategories } } }),
  getStoreRegionId: async () => "reg_eg",
}));

import { fetchBookDetails, listBookCategoryTree, searchStoreBooks } from "./book-catalog";

beforeEach(() => {
  fetchMock.mockReset();
  listProducts.mockReset();
  listCategories.mockReset();
});

describe("searchStoreBooks", () => {
  it("asks the search API, then loads priced products in the same order", async () => {
    fetchMock.mockResolvedValue({ product_ids: ["p2", "p1"], count: 7, facets: { authors: [], publishers: [], languages: [] } });
    listProducts.mockResolvedValue({ products: [{ id: "p1" }, { id: "p2" }] });
    const r = await searchStoreBooks({ q: "فقه", format: "digital" });
    expect(fetchMock).toHaveBeenCalledWith("/store/books/search", { query: { q: "فقه", format: "digital", limit: 24, offset: 0 } });
    expect(listProducts.mock.calls[0][0]).toMatchObject({ id: ["p2", "p1"], region_id: "reg_eg" });
    expect(r.products.map((p) => p.id)).toEqual(["p2", "p1"]);
    expect(r.total).toBe(7);
  });

  it("skips the product call when nothing matched", async () => {
    fetchMock.mockResolvedValue({ product_ids: [], count: 0, facets: { authors: [], publishers: [], languages: [] } });
    const r = await searchStoreBooks({});
    expect(listProducts).not.toHaveBeenCalled();
    expect(r.products).toEqual([]);
  });
});

describe("fetchBookDetails", () => {
  it("returns null for a book the search catalog doesn't know", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("nf"), { status: 404 }));
    expect(await fetchBookDetails("p9")).toBeNull();
  });
});

describe("listBookCategoryTree", () => {
  it("builds sections with subcategories from book categories only", async () => {
    listCategories.mockResolvedValue({
      product_categories: [
        { id: "s1", name: "Islamic Sciences", parent_category_id: null, rank: 1, metadata: { darnozom: "book", name_ar: "العلوم الإسلامية" } },
        { id: "c1", name: "Hadith", parent_category_id: "s1", rank: 0, metadata: { darnozom: "book", name_ar: "الحديث" } },
        { id: "s0", name: "Islamic Law", parent_category_id: null, rank: 0, metadata: { darnozom: "book" } },
        { id: "x", name: "Shirts", parent_category_id: null, rank: 0, metadata: null },
      ],
    });
    expect(await listBookCategoryTree()).toEqual([
      { id: "s0", name: "Islamic Law", nameAr: null, children: [] },
      { id: "s1", name: "Islamic Sciences", nameAr: "العلوم الإسلامية", children: [{ id: "c1", name: "Hadith", nameAr: "الحديث", children: [] }] },
    ]);
  });
});
```

Run: `cd apps/client && npx vitest run src/lib/book-filters.test.ts src/lib/book-catalog.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 2: Write the implementation**

```ts
// apps/client/src/lib/book-filters.ts
export type BookFilters = {
  q: string;
  category: string;
  author: string;
  publisher: string;
  language: "" | "ar" | "en" | "both";
  format: "all" | "paper" | "digital";
};

export const EMPTY_BOOK_FILTERS: BookFilters = { q: "", category: "", author: "", publisher: "", language: "", format: "all" };

const FORMAT_ALIASES: Record<string, BookFilters["format"]> = {
  paper: "paper", hardcopy: "paper", digital: "digital", online: "digital",
};

export function readBookFilters(search: string): BookFilters {
  const p = new URLSearchParams(search);
  const language = p.get("language");
  return {
    q: p.get("q") ?? "",
    category: p.get("category") && p.get("category") !== "all" ? p.get("category")! : "",
    author: p.get("author") ?? "",
    publisher: p.get("publisher") ?? "",
    language: language === "ar" || language === "en" || language === "both" ? language : "",
    format: FORMAT_ALIASES[p.get("format") ?? ""] ?? "all",
  };
}

export function bookFiltersToQuery(f: BookFilters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.category) p.set("category", f.category);
  if (f.author) p.set("author", f.author);
  if (f.publisher) p.set("publisher", f.publisher);
  if (f.language) p.set("language", f.language);
  if (f.format !== "all") p.set("format", f.format);
  return p.toString();
}
```

```ts
// apps/client/src/lib/book-catalog.ts
import type { HttpTypes } from "@medusajs/types";
import { getMedusaClient, getStoreRegionId } from "./medusa-client";
import { STORE_BOOK_PRODUCT_FIELDS } from "./list-store-books";

export type BookFacet = { value: string; count: number };
export type BookFacets = { authors: BookFacet[]; publishers: BookFacet[]; languages: BookFacet[] };
export type BookSearchParams = {
  q?: string;
  category_id?: string;
  author?: string;
  publisher?: string;
  language?: "ar" | "en" | "both";
  format?: "paper" | "digital";
  limit?: number;
  offset?: number;
};
export type BookProfile = {
  authors: string[];
  editors: string[];
  translators: string[];
  publisher: string | null;
  isbn: string | null;
  publication_year: number | null;
  edition_number: number | null;
  pages: number | null;
  volumes: number;
  language: "ar" | "en" | "both";
  keywords: string[];
  target_audience: string | null;
  table_of_contents: string | null;
};
type CategoryRefBase = { id: string; name: string; name_ar: string | null; handle: string };
export type BookCategoryRef = CategoryRefBase & { parent: CategoryRefBase | null };
export type BookDetails = { profile: BookProfile | null; categories: BookCategoryRef[]; related_product_ids: string[] };
export type CategoryTreeNode = { id: string; name: string; nameAr: string | null; children: CategoryTreeNode[] };

export async function listProductsByIds(ids: string[]): Promise<HttpTypes.StoreProduct[]> {
  if (!ids.length) return [];
  const sdk = getMedusaClient();
  const { products } = await sdk.store.product.list({
    id: ids,
    region_id: await getStoreRegionId(),
    fields: STORE_BOOK_PRODUCT_FIELDS,
    limit: ids.length,
  });
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is HttpTypes.StoreProduct => !!p);
}

export async function searchStoreBooks(
  params: BookSearchParams,
): Promise<{ products: HttpTypes.StoreProduct[]; total: number; facets: BookFacets }> {
  const query = Object.fromEntries(
    Object.entries({ ...params, limit: params.limit ?? 24, offset: params.offset ?? 0 }).filter(
      ([, v]) => v !== undefined && v !== "",
    ),
  );
  const res = await getMedusaClient().client.fetch<{ product_ids: string[]; count: number; facets: BookFacets }>(
    "/store/books/search",
    { query },
  );
  return { products: await listProductsByIds(res.product_ids), total: res.count, facets: res.facets };
}

export async function fetchBookDetails(productId: string): Promise<BookDetails | null> {
  try {
    return await getMedusaClient().client.fetch<BookDetails>(`/store/books/${encodeURIComponent(productId)}`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

type RawCategory = { id: string; name: string; parent_category_id: string | null; rank?: number | null; metadata?: Record<string, unknown> | null };

export async function listBookCategoryTree(): Promise<CategoryTreeNode[]> {
  const { product_categories } = await getMedusaClient().store.category.list({
    limit: 500,
    fields: "id,name,parent_category_id,rank,metadata",
  });
  const all = (product_categories ?? []) as unknown as RawCategory[];
  const isBook = (c: RawCategory) => c.metadata?.darnozom === "book";
  const node = (c: RawCategory): CategoryTreeNode => ({
    id: c.id,
    name: c.name,
    nameAr: typeof c.metadata?.name_ar === "string" ? c.metadata.name_ar : null,
    children: all
      .filter((x) => x.parent_category_id === c.id)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      .map(node),
  });
  return all
    .filter((c) => c.parent_category_id === null && isBook(c))
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map(node);
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd apps/client && npx vitest run src/lib/book-filters.test.ts src/lib/book-catalog.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 4: Commit**

```bash
git add apps/client/src/lib/book-catalog.ts apps/client/src/lib/book-catalog.test.ts apps/client/src/lib/book-filters.ts apps/client/src/lib/book-filters.test.ts
git commit -m "feat(store): client for book search, details and category tree"
```

---

### Task 14: Books listing page — search, section tree, author/publisher/language filters

**Files:**
- Create: `apps/client/src/components/store/category-filter.tsx`
- Create: `apps/client/src/components/store/facet-select.tsx`
- Test: `apps/client/src/components/store/category-filter.test.tsx`
- Modify: `apps/client/src/pages/store-books.tsx`
- Modify: `apps/client/src/pages/store-books.test.tsx`

**Interfaces:**
- Consumes: `searchStoreBooks`, `listBookCategoryTree`, `CategoryTreeNode`, `BookFacet` (Task 13); `readBookFilters`, `bookFiltersToQuery`, `BookFilters`, `EMPTY_BOOK_FILTERS` (Task 13)
- Produces: `<CategoryFilter tree selectedId onSelect isArabic />`, `<FacetSelect label allLabel value options onChange />`

- [ ] **Step 1: Write the failing component test**

```tsx
// apps/client/src/components/store/category-filter.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryFilter from "./category-filter";

const tree = [
  { id: "s1", name: "Islamic Sciences", nameAr: "العلوم الإسلامية", children: [{ id: "c1", name: "Hadith", nameAr: "الحديث", children: [] }] },
  { id: "s2", name: "Public Policies", nameAr: "السياسات العامة", children: [] },
];

describe("CategoryFilter", () => {
  it("shows sections in the shopper's language and opens the selected section's subcategories", () => {
    const onSelect = vi.fn();
    render(<CategoryFilter tree={tree} selectedId="c1" onSelect={onSelect} isArabic allLabel="الكل" />);
    expect(screen.getByText("العلوم الإسلامية")).toBeTruthy();
    expect(screen.getByText("الحديث").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByText("السياسات العامة"));
    expect(onSelect).toHaveBeenCalledWith("s2");
    fireEvent.click(screen.getByText("الكل"));
    expect(onSelect).toHaveBeenCalledWith("");
  });

  it("hides subcategories of sections that aren't selected", () => {
    render(<CategoryFilter tree={tree} selectedId="s2" onSelect={() => {}} isArabic={false} allLabel="All" />);
    expect(screen.queryByText("Hadith")).toBeNull();
  });
});
```

Run: `cd apps/client && npx vitest run src/components/store/category-filter.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 2: Write the components**

```tsx
// apps/client/src/components/store/category-filter.tsx
import type { CategoryTreeNode } from "@/lib/book-catalog";

type Props = {
  tree: CategoryTreeNode[];
  selectedId: string;
  onSelect(id: string): void;
  isArabic: boolean;
  allLabel: string;
};

const label = (n: CategoryTreeNode, isArabic: boolean) => (isArabic && n.nameAr ? n.nameAr : n.name);

/** Sections with their subcategories; a section's children show when it (or one of them) is selected. */
export default function CategoryFilter({ tree, selectedId, onSelect, isArabic, allLabel }: Props) {
  const btn = (id: string, text: string, depth: 0 | 1) => (
    <button
      key={id || "all"}
      type="button"
      aria-pressed={selectedId === id}
      onClick={() => onSelect(id)}
      className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${depth ? "ps-6 text-[13px]" : "font-bold"} ${
        selectedId === id ? "bg-secondary/15 text-primary" : "text-foreground/80 hover:bg-muted/60"
      }`}
    >
      {text}
    </button>
  );
  return (
    <nav className="flex flex-col" aria-label={allLabel}>
      {btn("", allLabel, 0)}
      {tree.map((s) => {
        const open = selectedId === s.id || s.children.some((c) => c.id === selectedId);
        return (
          <div key={s.id}>
            {btn(s.id, label(s, isArabic), 0)}
            {open && s.children.map((c) => btn(c.id, label(c, isArabic), 1))}
          </div>
        );
      })}
    </nav>
  );
}
```

```tsx
// apps/client/src/components/store/facet-select.tsx
import type { BookFacet } from "@/lib/book-catalog";

type Props = {
  label: string;
  allLabel: string;
  value: string;
  options: BookFacet[];
  onChange(value: string): void;
  format?(value: string): string;
};

/** A filter dropdown listing the values found in the current results, with counts. */
export default function FacetSelect({ label, allLabel, value, options, onChange, format }: Props) {
  const withCurrent = value && !options.some((o) => o.value === value) ? [{ value, count: 0 }, ...options] : options;
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-input bg-background px-3 py-2 text-sm font-normal text-foreground rounded-none"
      >
        <option value="">{allLabel}</option>
        {withCurrent.map((o) => (
          <option key={o.value} value={o.value}>
            {(format ? format(o.value) : o.value) + (o.count ? ` (${o.count})` : "")}
          </option>
        ))}
      </select>
    </label>
  );
}
```

Run: `cd apps/client && npx vitest run src/components/store/category-filter.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 3: Rewire the listing page to the search API**

In `apps/client/src/pages/store-books.tsx`:

1. Imports — replace the `list-store-books` import block with:

```tsx
import { listBookCategoryTree, searchStoreBooks, type BookFacets, type CategoryTreeNode } from "@/lib/book-catalog";
import { bookFiltersToQuery, EMPTY_BOOK_FILTERS, readBookFilters, type BookFilters } from "@/lib/book-filters";
import CategoryFilter from "@/components/store/category-filter";
import FacetSelect from "@/components/store/facet-select";
```

2. Delete `readFiltersFromSearch`, `writeFiltersToUrl`, `categoryLabel`, and the `BookFormat` type.

3. Add to both `T.ar` and `T.en`: `searchPlaceholder` becomes `"ابحث بالعنوان أو المؤلف أو الناشر أو الموضوع أو الكلمات المفتاحية..."` / `"Search by title, author, publisher, subject or keyword..."`, plus
   - ar: `filterAuthor: "المؤلف", filterPublisher: "الناشر", filterLanguage: "لغة الكتاب", languages: { ar: "العربية", en: "الإنجليزية", both: "العربية والإنجليزية" }, loadMore: "عرض المزيد", filterSection: "الأقسام العلمية"`
   - en: `filterAuthor: "Author", filterPublisher: "Publisher", filterLanguage: "Book language", languages: { ar: "Arabic", en: "English", both: "Arabic & English" }, loadMore: "Load more", filterSection: "Sections"`

4. Replace the state + effects block (from `const [products, setProducts]` through the "Fetch books from Medusa" effect) with:

```tsx
  const PAGE = 24;
  const [filters, setFilters] = useState<BookFilters>(() => readBookFilters(searchString));
  const [search, setSearch] = useState(filters.q);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<BookFacets>({ authors: [], publishers: [], languages: [] });
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Debounce typing into filters.q.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim() })), 280);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const qs = bookFiltersToQuery(filters);
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    listBookCategoryTree()
      .then((t) => !cancelled && setTree(t))
      .catch(() => !cancelled && setTree([]));
    return () => { cancelled = true; };
  }, []);

  const params = (offset: number) => ({
    q: filters.q.length >= 2 ? filters.q : undefined,
    category_id: filters.category || undefined,
    author: filters.author || undefined,
    publisher: filters.publisher || undefined,
    language: filters.language || undefined,
    format: filters.format === "all" ? undefined : filters.format,
    limit: PAGE,
    offset,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    searchStoreBooks(params(0))
      .then((r) => {
        if (cancelled) return;
        setProducts(r.products);
        setTotal(r.total);
        setFacets(r.facets);
      })
      .catch(() => {
        if (!cancelled) { setError(true); setProducts([]); setTotal(0); }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, reloadKey]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const r = await searchStoreBooks(params(products.length));
      setProducts((prev) => [...prev, ...r.products]);
    } finally {
      setLoadingMore(false);
    }
  }
```

5. Replace the `const filtered = products.filter(...)` block with `const filtered = products;` (the server already filtered).

6. Replace `clearAll`, `hasActiveFilters` and `categoryOptions` with:

```tsx
  function clearAll() {
    setSearch("");
    setFilters(EMPTY_BOOK_FILTERS);
  }
  const set = (patch: Partial<BookFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const hasActiveFilters = bookFiltersToQuery(filters) !== "";
```

7. In the JSX: every `setFormat(x)` becomes `set({ format: x })` and every `format ===` read becomes `filters.format ===`; the category pill row is replaced by a sidebar block

```tsx
          {tree.length > 0 && (
            <div className="bg-background border border-border p-2">
              <div className="text-xs font-bold text-muted-foreground px-3 py-1">{t.filterSection}</div>
              <CategoryFilter tree={tree} selectedId={filters.category} onSelect={(id) => set({ category: id })} isArabic={isArabic} allLabel={t.all} />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FacetSelect label={t.filterAuthor} allLabel={t.all} value={filters.author} options={facets.authors} onChange={(v) => set({ author: v })} />
            <FacetSelect label={t.filterPublisher} allLabel={t.all} value={filters.publisher} options={facets.publishers} onChange={(v) => set({ publisher: v })} />
            <FacetSelect
              label={t.filterLanguage}
              allLabel={t.all}
              value={filters.language}
              options={facets.languages}
              onChange={(v) => set({ language: v as BookFilters["language"] })}
              format={(v) => t.languages[v as keyof typeof t.languages] ?? v}
            />
          </div>
```

   the results count uses `t.countLabel(total)`, and below the grid add:

```tsx
            {products.length < total && (
              <div className="flex justify-center pt-6">
                <button type="button" onClick={loadMore} disabled={loadingMore} className="px-6 py-2 border border-border font-bold text-sm hover:bg-muted/60 disabled:opacity-50">
                  {t.loadMore}
                </button>
              </div>
            )}
```

8. Update `apps/client/src/pages/store-books.test.tsx`: replace the `list-store-books` spies with

```tsx
import * as bookCatalog from "../lib/book-catalog";
// …
vi.spyOn(bookCatalog, "searchStoreBooks").mockImplementation(async (p) => ({
  products: (p.format === "paper" ? [paperOnly] : [sampleBook, paperOnly]) as any,
  total: p.format === "paper" ? 1 : 2,
  facets: { authors: [{ value: "Omar", count: 1 }], publishers: [], languages: [] },
}));
vi.spyOn(bookCatalog, "listBookCategoryTree").mockResolvedValue([]);
```

and change the format-filter assertion to check `searchStoreBooks` was last called with `expect.objectContaining({ format: "paper" })` after clicking the paper filter.

- [ ] **Step 4: Run tests and typecheck**

Run: `cd apps/client && npx vitest run src/pages/store-books.test.tsx src/components/store && pnpm -s typecheck`
Expected: PASS; typecheck prints nothing

- [ ] **Step 5: Check in the browser**

With `pnpm dev` running, open `http://localhost:5173/services/store/books`: type an author's name → the book appears; choose a section → its subcategories open; pick a publisher in the dropdown → results narrow; switch the site to English → section names switch.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/components/store/category-filter.tsx apps/client/src/components/store/category-filter.test.tsx apps/client/src/components/store/facet-select.tsx apps/client/src/pages/store-books.tsx apps/client/src/pages/store-books.test.tsx
git commit -m "feat(store): book search with sections, author, publisher and language filters"
```

---

### Task 15: Book page — organized details, table of contents, related books, correct text direction

**Files:**
- Create: `apps/client/src/components/store/book-profile-panel.tsx`
- Create: `apps/client/src/components/store/related-books.tsx`
- Test: `apps/client/src/components/store/book-profile-panel.test.tsx`
- Modify: `apps/client/src/pages/store-book-detail.tsx`

**Interfaces:**
- Consumes: `fetchBookDetails`, `listProductsByIds`, `BookProfile`, `BookCategoryRef` (Task 13); `ProductCard`, `getBookVariantInfo` (existing)
- Produces: `<BookProfilePanel profile categories isArabic />`, `<RelatedBooks productIds isArabic />`, `bookTextDir(language: "ar" | "en" | "both" | undefined): { dir: "rtl" | "ltr" | "auto"; lang: string | undefined }`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/client/src/components/store/book-profile-panel.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BookProfilePanel, { bookTextDir } from "./book-profile-panel";

const profile = {
  authors: ["وهبة الزحيلي"], editors: [], translators: ["John Doe"], publisher: "دار الفكر",
  isbn: "9780306406157", publication_year: 2020, edition_number: 3, pages: 540, volumes: 2,
  language: "ar" as const, keywords: ["أصول", "اجتهاد"], target_audience: "طلاب الدراسات العليا",
  table_of_contents: "المقدمة\nالباب الأول",
};
const categories = [
  { id: "c1", name: "Fiqh", name_ar: "الفقه وأصوله", handle: "fiqh-usul", parent: { id: "s1", name: "Islamic Law", name_ar: "الشريعة والفكر الإسلامي", handle: "islamic-law-thought" } },
];

describe("BookProfilePanel", () => {
  it("shows every filled field and hides empty ones", () => {
    render(<BookProfilePanel profile={profile} categories={categories} isArabic />);
    expect(screen.getByText("وهبة الزحيلي")).toBeTruthy();
    expect(screen.getByText("John Doe")).toBeTruthy();
    expect(screen.getByText("دار الفكر")).toBeTruthy();
    expect(screen.getByText("978-0-306-40615-7")).toBeTruthy();
    expect(screen.getByText("540")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("الشريعة والفكر الإسلامي › الفقه وأصوله")).toBeTruthy();
    expect(screen.getByText("اجتهاد")).toBeTruthy();
    expect(screen.queryByText("المحرر")).toBeNull(); // no editors
    expect(screen.getByText("الباب الأول", { exact: false })).toBeTruthy();
  });

  it("links a section to the filtered book list", () => {
    render(<BookProfilePanel profile={profile} categories={categories} isArabic />);
    expect(screen.getByText("الشريعة والفكر الإسلامي › الفقه وأصوله").closest("a")?.getAttribute("href")).toBe("/services/store/books?category=c1");
  });
});

describe("bookTextDir", () => {
  it("sets text direction from the book's language", () => {
    expect(bookTextDir("en")).toEqual({ dir: "ltr", lang: "en" });
    expect(bookTextDir("ar")).toEqual({ dir: "rtl", lang: "ar" });
    expect(bookTextDir("both")).toEqual({ dir: "auto", lang: undefined });
  });
});
```

Run: `cd apps/client && npx vitest run src/components/store/book-profile-panel.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 2: Write the components**

```tsx
// apps/client/src/components/store/book-profile-panel.tsx
import type { ReactNode } from "react";
import { Link } from "wouter";
import type { BookCategoryRef, BookProfile } from "@/lib/book-catalog";

const L = {
  ar: { authors: "المؤلف", editors: "المحرر", translators: "المترجم", publisher: "الناشر", isbn: "ردمك (ISBN)", year: "سنة النشر", edition: "الطبعة", pages: "عدد الصفحات", volumes: "عدد المجلدات", language: "لغة الكتاب", section: "القسم العلمي", keywords: "الكلمات المفتاحية", audience: "الفئة المستهدفة", toc: "فهرس المحتويات", languages: { ar: "العربية", en: "الإنجليزية", both: "العربية والإنجليزية" } },
  en: { authors: "Author", editors: "Editor", translators: "Translator", publisher: "Publisher", isbn: "ISBN", year: "Year", edition: "Edition", pages: "Pages", volumes: "Volumes", language: "Language", section: "Section", keywords: "Keywords", audience: "Target audience", toc: "Table of contents", languages: { ar: "Arabic", en: "English", both: "Arabic & English" } },
} as const;

export function bookTextDir(language: BookProfile["language"] | undefined): { dir: "rtl" | "ltr" | "auto"; lang: string | undefined } {
  if (language === "en") return { dir: "ltr", lang: "en" };
  if (language === "ar") return { dir: "rtl", lang: "ar" };
  return { dir: "auto", lang: undefined };
}

function formatIsbn(isbn: string): string {
  return isbn.length === 13 ? `${isbn.slice(0, 3)}-${isbn.slice(3, 4)}-${isbn.slice(4, 7)}-${isbn.slice(7, 12)}-${isbn.slice(12)}` : isbn;
}

export default function BookProfilePanel({ profile, categories, isArabic }: { profile: BookProfile; categories: BookCategoryRef[]; isArabic: boolean }) {
  const t = isArabic ? L.ar : L.en;
  const name = (c: { name: string; name_ar: string | null }) => (isArabic && c.name_ar ? c.name_ar : c.name);
  const rows: [string, ReactNode][] = [];
  const people = (label: string, list: string[]) => list.length && rows.push([label, <span className="flex flex-col">{list.map((p) => <span key={p}>{p}</span>)}</span>]);
  people(t.authors, profile.authors);
  people(t.editors, profile.editors);
  people(t.translators, profile.translators);
  if (profile.publisher) rows.push([t.publisher, profile.publisher]);
  if (profile.isbn) rows.push([t.isbn, <span dir="ltr">{formatIsbn(profile.isbn)}</span>]);
  if (profile.publication_year) rows.push([t.year, String(profile.publication_year)]);
  if (profile.edition_number) rows.push([t.edition, String(profile.edition_number)]);
  if (profile.pages) rows.push([t.pages, String(profile.pages)]);
  if (profile.volumes > 1) rows.push([t.volumes, String(profile.volumes)]);
  rows.push([t.language, t.languages[profile.language]]);
  if (categories.length) {
    rows.push([
      t.section,
      <span className="flex flex-col">
        {categories.map((c) => (
          <Link key={c.id} href={`/services/store/books?category=${c.id}`} className="text-secondary hover:underline">
            {c.parent ? `${name(c.parent)} › ${name(c)}` : name(c)}
          </Link>
        ))}
      </span>,
    ]);
  }
  if (profile.target_audience) rows.push([t.audience, profile.target_audience]);

  return (
    <div className="space-y-4">
      <dl className="divide-y divide-border border border-border text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground/90">{value}</dd>
          </div>
        ))}
      </dl>
      {profile.keywords.length > 0 && (
        <div>
          <div className="text-xs font-bold text-muted-foreground mb-2">{t.keywords}</div>
          <div className="flex flex-wrap gap-1.5">
            {profile.keywords.map((k) => (
              <Link key={k} href={`/services/store/books?q=${encodeURIComponent(k)}`} className="text-xs px-2 py-1 border border-border hover:border-secondary">
                {k}
              </Link>
            ))}
          </div>
        </div>
      )}
      {profile.table_of_contents && (
        <details className="border border-border">
          <summary className="px-4 py-2.5 cursor-pointer text-sm font-bold">{t.toc}</summary>
          <ol className="px-8 py-3 list-decimal space-y-1 text-sm" {...bookTextDir(profile.language)}>
            {profile.table_of_contents.split("\n").filter((l) => l.trim()).map((line, i) => <li key={i}>{line.trim()}</li>)}
          </ol>
        </details>
      )}
    </div>
  );
}
```

```tsx
// apps/client/src/components/store/related-books.tsx
import { useEffect, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import ProductCard from "@/components/store/product-card";
import { listProductsByIds } from "@/lib/book-catalog";
import { getBookVariantInfo } from "@/lib/book-variants";

export default function RelatedBooks({ productIds, isArabic }: { productIds: string[]; isArabic: boolean }) {
  const [products, setProducts] = useState<HttpTypes.StoreProduct[]>([]);
  useEffect(() => {
    let cancelled = false;
    listProductsByIds(productIds).then((p) => !cancelled && setProducts(p)).catch(() => undefined);
    return () => { cancelled = true; };
  }, [productIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!products.length) return null;
  return (
    <section className="mt-12">
      <h2 className="text-xl font-black text-primary mb-4">{isArabic ? "كتب ذات صلة" : "Related books"}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => {
          const info = getBookVariantInfo(p);
          const prices = [...info.paperEditions, ...info.digitalEditions].filter((e) => e.inStock).map((e) => e.price);
          const meta = (p.metadata ?? {}) as Record<string, unknown>;
          return (
            <ProductCard
              key={p.id}
              item={{
                id: p.id,
                type: "book",
                title: p.title ?? "",
                subtitle: (meta.author as string) || undefined,
                imageUrl: p.thumbnail,
                price: prices.length ? String(Math.min(...prices)) : null,
                currency: "EGP",
                detailUrl: `/services/store/books/${p.id}`,
                paperAvailable: info.paperEditions.some((e) => e.inStock),
                digitalAvailable: info.digitalEditions.some((e) => e.inStock),
                pricePrefix: prices.length > 1 ? (isArabic ? "يبدأ من" : "from") : null,
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
```

Run: `cd apps/client && npx vitest run src/components/store/book-profile-panel.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 3: Use them on the book page**

In `apps/client/src/pages/store-book-detail.tsx`:

1. Add imports: `import { fetchBookDetails, type BookDetails } from "@/lib/book-catalog";`, `import BookProfilePanel, { bookTextDir } from "@/components/store/book-profile-panel";`, `import RelatedBooks from "@/components/store/related-books";`.
2. Add state `const [details, setDetails] = useState<BookDetails | null>(null);` and, next to the product load effect, a second effect:

```tsx
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setDetails(null);
    fetchBookDetails(id).then((d) => !cancelled && setDetails(d)).catch(() => undefined);
    return () => { cancelled = true; };
  }, [id]);
  const textDir = bookTextDir(details?.profile?.language);
```

3. Put `{...textDir}` on the `<h1>` title element and on the description block wrapper, so an English book reads left-to-right inside the Arabic site (and vice versa).
4. Replace the author line (the `meta.author` block) with the authors from `details?.profile?.authors` joined by `isArabic ? "، " : ", "`, falling back to `meta.author` when there is no profile.
5. Replace the metadata-based detail rows (language / pages / ISBN `DetailRow`s and the `meta.category` badge) with:

```tsx
                  {details?.profile && (
                    <BookProfilePanel profile={details.profile} categories={details.categories} isArabic={isArabic} />
                  )}
```

6. After the main content container, add `{details && <RelatedBooks productIds={details.related_product_ids} isArabic={isArabic} />}`.
7. Remove now-unused imports/constants (`t.cats`, `t.languages`, `DetailRow` if unused) so typecheck passes.

- [ ] **Step 4: Run tests and typecheck**

Run: `cd apps/client && npx vitest run && pnpm -s typecheck`
Expected: all PASS; typecheck prints nothing

- [ ] **Step 5: Check in the browser**

Open a book page: the details table shows authors, publisher, ISBN, section › subcategory (clickable), keywords (clickable), a collapsible table of contents; "Related books" shows books from the same section; an English book's title/description read left-to-right in the Arabic site.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/components/store/book-profile-panel.tsx apps/client/src/components/store/book-profile-panel.test.tsx apps/client/src/components/store/related-books.tsx apps/client/src/pages/store-book-detail.tsx
git commit -m "feat(store): organized book page with classification, contents and related books"
```

---

### Task 16: Storefront admin books list uses the new sections

**Files:**
- Modify: `apps/client/src/pages/admin/store/books.tsx`

**Interfaces:**
- Consumes: `listBookCategoryTree`, `CategoryTreeNode` (Task 13)

- [ ] **Step 1: Replace the legacy category model**

1. Delete `type BookCategory`, `CATEGORY_LABELS`, `BOOK_CATEGORIES`.
2. In `interface Book` replace `category: BookCategory;` with `categoryIds: string[];`.
3. In `mapMedusaProduct` replace the `rawCategory`/`category` lines with `const categoryIds = (product.categories ?? []).map((c) => c.id);` and return `categoryIds` instead of `category`.
4. Add `import { listBookCategoryTree, type CategoryTreeNode } from "@/lib/book-catalog";`, state `const [tree, setTree] = useState<CategoryTreeNode[]>([]);`, and in the existing `useEffect` also call `listBookCategoryTree().then(setTree).catch(() => setTree([]));`.
5. Build a lookup and filter:

```tsx
  const flat = tree.flatMap((s) => [
    { id: s.id, label: s.nameAr ?? s.name, sectionId: s.id },
    ...s.children.map((c) => ({ id: c.id, label: `${s.nameAr ?? s.name} › ${c.nameAr ?? c.name}`, sectionId: s.id })),
  ]);
  const labelOf = (b: Book) => flat.filter((f) => b.categoryIds.includes(f.id)).map((f) => f.label).join("، ") || "—";
  const inCategory = (b: Book, id: string) =>
    b.categoryIds.some((cid) => cid === id || flat.find((f) => f.id === cid)?.sectionId === id);
```

   and in `filtered` replace the category line with `if (filterCategory !== "all" && !inCategory(b, filterCategory)) return false;`.
6. The `<select>` options become `{flat.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}` and the category cell renders `{labelOf(b)}`.

- [ ] **Step 2: Typecheck and test**

Run: `cd apps/client && pnpm -s typecheck && npx vitest run`
Expected: no typecheck output; all tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/client/src/pages/admin/store/books.tsx
git commit -m "feat(admin): storefront books list filters by the new sections"
```

---

# Phase 4 — ChatGPT integration

### Task 17: Partner API key check and rate limit

**Files:**
- Create: `apps/medusa/src/lib/partner-auth.ts`
- Test: `apps/medusa/src/lib/partner-auth.test.ts`

**Interfaces:**
- Produces:
  - `checkPartnerKey(header: string | undefined, configured: string | undefined): "ok" | "not_configured" | "unauthorized"`
  - `takeRateLimitToken(key: string, now?: number): boolean` (60 requests / minute per key), `resetPartnerRateLimit(): void`
  - `requirePartnerKey(req: MedusaRequest, res: MedusaResponse): boolean` — sends 503 / 401 / 429 and returns false when the request must stop

- [ ] **Step 1: Write the failing test**

```ts
// apps/medusa/src/lib/partner-auth.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkPartnerKey, requirePartnerKey, resetPartnerRateLimit, takeRateLimitToken } from "./partner-auth";

const KEY = "k_" + "x".repeat(40);

describe("checkPartnerKey", () => {
  it("accepts only the configured key", () => {
    expect(checkPartnerKey(KEY, KEY)).toBe("ok");
    expect(checkPartnerKey("wrong", KEY)).toBe("unauthorized");
    expect(checkPartnerKey(undefined, KEY)).toBe("unauthorized");
  });

  it("is off when no key (or a too-short key) is configured", () => {
    expect(checkPartnerKey(KEY, undefined)).toBe("not_configured");
    expect(checkPartnerKey("short", "short")).toBe("not_configured");
  });
});

describe("rate limit", () => {
  beforeEach(() => resetPartnerRateLimit());

  it("allows 60 requests a minute, then refills", () => {
    for (let i = 0; i < 60; i++) expect(takeRateLimitToken("k", 0)).toBe(true);
    expect(takeRateLimitToken("k", 0)).toBe(false);
    expect(takeRateLimitToken("k", 61_000)).toBe(true);
  });
});

describe("requirePartnerKey", () => {
  beforeEach(() => resetPartnerRateLimit());
  const res = () => {
    const r: any = {};
    r.status = vi.fn().mockReturnValue(r);
    r.json = vi.fn().mockReturnValue(r);
    return r;
  };

  it("stops unauthenticated requests with 401", () => {
    process.env.BOOKS_API_KEY = KEY;
    const r = res();
    expect(requirePartnerKey({ headers: {} } as any, r)).toBe(false);
    expect(r.status).toHaveBeenCalledWith(401);
  });

  it("lets a request with the key through", () => {
    process.env.BOOKS_API_KEY = KEY;
    expect(requirePartnerKey({ headers: { "x-api-key": KEY } } as any, res())).toBe(true);
  });
});
```

Run: `cd apps/medusa && npx vitest run src/lib/partner-auth.test.ts`
Expected: FAIL — module not found

- [ ] **Step 2: Write the implementation**

```ts
// apps/medusa/src/lib/partner-auth.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { createHash, timingSafeEqual } from "crypto";

// Auth for the ChatGPT "partner" API (/partner/*): one secret key in
// BOOKS_API_KEY, sent by the Custom GPT Action as the x-api-key header.
const MIN_KEY_LENGTH = 32;
const LIMIT = 60;
const WINDOW_MS = 60_000;

const digest = (s: string) => createHash("sha256").update(s).digest();

export function checkPartnerKey(header: string | undefined, configured: string | undefined): "ok" | "not_configured" | "unauthorized" {
  if (!configured || configured.length < MIN_KEY_LENGTH) return "not_configured";
  if (!header) return "unauthorized";
  return timingSafeEqual(digest(header), digest(configured)) ? "ok" : "unauthorized";
}

const buckets = new Map<string, { tokens: number; at: number }>();

export function takeRateLimitToken(key: string, now = Date.now()): boolean {
  const b = buckets.get(key) ?? { tokens: LIMIT, at: now };
  const refill = Math.floor(((now - b.at) / WINDOW_MS) * LIMIT);
  if (refill > 0) {
    b.tokens = Math.min(LIMIT, b.tokens + refill);
    b.at = now;
  }
  if (b.tokens <= 0) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

export function resetPartnerRateLimit(): void {
  buckets.clear();
}

export function requirePartnerKey(req: MedusaRequest, res: MedusaResponse): boolean {
  const header = req.headers["x-api-key"];
  const given = Array.isArray(header) ? header[0] : header;
  const state = checkPartnerKey(given, process.env.BOOKS_API_KEY?.trim());
  if (state === "not_configured") {
    res.status(503).json({ message: "The books API is not enabled on this server (BOOKS_API_KEY is not set)." });
    return false;
  }
  if (state === "unauthorized") {
    res.status(401).json({ message: "Missing or invalid x-api-key" });
    return false;
  }
  if (!takeRateLimitToken(given!)) {
    res.status(429).json({ message: "Too many requests — at most 60 per minute. Wait a minute and retry." });
    return false;
  }
  return true;
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd apps/medusa && npx vitest run src/lib/partner-auth.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 4: Commit**

```bash
git add apps/medusa/src/lib/partner-auth.ts apps/medusa/src/lib/partner-auth.test.ts
git commit -m "feat(partner): API key check and rate limit for the books API"
```

---

### Task 18: Import images from a URL safely

**Files:**
- Create: `apps/medusa/src/lib/safe-image-fetch.ts`
- Test: `apps/medusa/src/lib/safe-image-fetch.test.ts`

**Interfaces:**
- Produces:
  - `isPrivateAddress(ip: string): boolean`
  - `class ImageFetchError extends Error`
  - `fetchPublicImage(url: string, deps?: { lookup?(host: string): Promise<string[]>; fetchImpl?: typeof fetch; maxBytes?: number }): Promise<{ filename: string; mimeType: string; base64: string }>` — https only, public IPs only, no redirects, image/jpeg|png|webp|gif, ≤ 5 MB, 10 s timeout.

- [ ] **Step 1: Write the failing test**

```ts
// apps/medusa/src/lib/safe-image-fetch.test.ts
import { describe, it, expect, vi } from "vitest";
import { fetchPublicImage, ImageFetchError, isPrivateAddress } from "./safe-image-fetch";

describe("isPrivateAddress", () => {
  it("flags loopback, private, link-local and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    expect(isPrivateAddress("2606:4700::1111")).toBe(false);
  });
});

const png = new Uint8Array([137, 80, 78, 71]);
const okFetch = vi.fn(async () => new Response(png, { status: 200, headers: { "content-type": "image/png" } }));
const publicLookup = async () => ["93.184.216.34"];

describe("fetchPublicImage", () => {
  it("downloads a public https image as base64", async () => {
    const out = await fetchPublicImage("https://cdn.example.com/covers/book.png", { lookup: publicLookup, fetchImpl: okFetch as never });
    expect(out).toEqual({ filename: "book.png", mimeType: "image/png", base64: Buffer.from(png).toString("base64") });
    expect((okFetch.mock.calls[0] as unknown[])[1]).toMatchObject({ redirect: "manual" });
  });

  it("refuses http, internal hosts and non-images", async () => {
    await expect(fetchPublicImage("http://cdn.example.com/a.png", { lookup: publicLookup, fetchImpl: okFetch as never })).rejects.toBeInstanceOf(ImageFetchError);
    await expect(fetchPublicImage("https://internal.example/a.png", { lookup: async () => ["169.254.169.254"], fetchImpl: okFetch as never })).rejects.toThrow(/not a public/);
    const html = vi.fn(async () => new Response("<html>", { headers: { "content-type": "text/html" } }));
    await expect(fetchPublicImage("https://cdn.example.com/a", { lookup: publicLookup, fetchImpl: html as never })).rejects.toThrow(/not an image/);
  });

  it("refuses redirects and files over the size limit", async () => {
    const redirect = vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/" } }));
    await expect(fetchPublicImage("https://cdn.example.com/a.png", { lookup: publicLookup, fetchImpl: redirect as never })).rejects.toThrow(/redirect/);
    await expect(fetchPublicImage("https://cdn.example.com/a.png", { lookup: publicLookup, fetchImpl: okFetch as never, maxBytes: 2 })).rejects.toThrow(/too large/);
  });
});
```

Run: `cd apps/medusa && npx vitest run src/lib/safe-image-fetch.test.ts`
Expected: FAIL — module not found

- [ ] **Step 2: Write the implementation**

```ts
// apps/medusa/src/lib/safe-image-fetch.ts
import { lookup as dnsLookup } from "dns/promises";
import { isIP } from "net";
import path from "path";

// Downloads a cover/extra image for the partner (ChatGPT) API. The URL comes
// from outside, so it must never reach internal services (SSRF): https only,
// every resolved address must be public, redirects are refused.
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const TYPES: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

export class ImageFetchError extends Error {}

function v4Private(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
  );
}

export function isPrivateAddress(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (isIP(lower) === 4) return v4Private(lower);
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return v4Private(mapped[1]);
  return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
}

async function defaultLookup(host: string): Promise<string[]> {
  return (await dnsLookup(host, { all: true })).map((a) => a.address);
}

export async function fetchPublicImage(
  url: string,
  deps: { lookup?(host: string): Promise<string[]>; fetchImpl?: typeof fetch; maxBytes?: number } = {},
): Promise<{ filename: string; mimeType: string; base64: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImageFetchError(`${url}: not a valid URL`);
  }
  if (parsed.protocol !== "https:") throw new ImageFetchError(`${url}: only https:// image URLs are accepted`);
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : await (deps.lookup ?? defaultLookup)(host);
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new ImageFetchError(`${url}: not a public address`);
  }

  const res = await (deps.fetchImpl ?? fetch)(parsed, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status >= 300 && res.status < 400) throw new ImageFetchError(`${url}: redirects are not followed — give the final image URL`);
  if (!res.ok) throw new ImageFetchError(`${url}: download failed (${res.status})`);
  const mimeType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!TYPES[mimeType]) throw new ImageFetchError(`${url}: not an image (JPEG, PNG, WebP or GIF)`);

  const max = deps.maxBytes ?? MAX_BYTES;
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > max) throw new ImageFetchError(`${url}: image too large (max ${max} bytes)`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > max) throw new ImageFetchError(`${url}: image too large (max ${max} bytes)`);

  const base = path.basename(parsed.pathname).replace(/[^\w.-]+/g, "-").slice(0, 80) || "image";
  const filename = path.extname(base) ? base : `${base}${TYPES[mimeType]}`;
  return { filename, mimeType, base64: Buffer.from(bytes).toString("base64") };
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd apps/medusa && npx vitest run src/lib/safe-image-fetch.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 4: Commit**

```bash
git add apps/medusa/src/lib/safe-image-fetch.ts apps/medusa/src/lib/safe-image-fetch.test.ts
git commit -m "feat(partner): SSRF-safe image download for the books API"
```

---

### Task 19: Partner endpoints — categories, lookup, create/update draft, bulk

**Files:**
- Create: `apps/medusa/src/lib/partner-books.ts`
- Test: `apps/medusa/src/lib/partner-books.test.ts`
- Create: `apps/medusa/src/api/partner/categories/route.ts`
- Create: `apps/medusa/src/api/partner/books/route.ts`
- Create: `apps/medusa/src/api/partner/books/bulk/route.ts`
- Test: `apps/medusa/src/api/partner/books/route.test.ts`

**Interfaces:**
- Consumes: `bookProfileSchema`, `CreateBookInput` (Task 2); `findProfileByIdentity`, `BookProfileConflictError`, `BookProfileRepo`, `BOOK_CATALOG_MODULE` (Task 3); `saveBookProfile`, `makeSaveProfileDeps` (Task 5); `createBook`, `makeCreateBookDeps` (Task 6); `requirePartnerKey` (Task 17); `fetchPublicImage`, `ImageFetchError` (Task 18); `BOOK_TAXONOMY` handles (Task 4)
- Produces:
  - `partnerBookSchema` (zod) — body: `{ title, subtitle?, description (required, 80–20000 chars), primary_category_handle, additional_category_handles?, print?: { price, stock }, digital?: { price }, images?: { url: string }[], openaiFileIdRefs?: { name?: string; mime_type?: string; download_link: string }[], profile: BookProfileInput (isbn or external_id required) }`
  - `type PartnerDeps = { profileRepo: BookProfileRepo; categoryIdsByHandle(handles: string[]): Promise<Map<string, string>>; defaultSalesChannelId(): Promise<string>; productStatus(productId: string): Promise<string | null>; importImage(url: string): Promise<string>; createBook(input: CreateBookInput): Promise<{ product: { id: string } }>; updateBook(productId: string, input: CreateBookInput): Promise<void> }`
  - `upsertPartnerBook(deps: PartnerDeps, raw: unknown): Promise<{ status: "created" | "updated"; product_id: string }>`
  - `class PartnerError extends Error { status: 400 | 404 | 409 | 422 }`
  - `makePartnerDeps(container: MedusaContainer): PartnerDeps`
  - `GET /partner/categories` → `{ sections: [{ handle, name, name_ar, subcategories: [{ handle, name, name_ar }] }] }`
  - `GET /partner/books?isbn=|external_id=` → `{ book: { product_id, status } | null }`
  - `POST /partner/books` → `201 { status: "created", product_id }` | `200 { status: "updated", product_id }` | `400/409/422 { message, errors? }`
  - `POST /partner/books/bulk` body `{ books: [...] }` (max 20) → `200 { results: [{ index, ok, status?, product_id?, message? }] }`

- [ ] **Step 1: Write the failing test**

```ts
// apps/medusa/src/lib/partner-books.test.ts
import { describe, it, expect, vi } from "vitest";
import { PartnerError, upsertPartnerBook, type PartnerDeps } from "./partner-books";

const DESCRIPTION = "يتناول هذا الكتاب أصول السياسة الشرعية ومقاصدها، ويعرض أهميتها العلمية في بناء النظم الحديثة، ويخاطب الباحثين وطلاب الدراسات العليا.";
const body = {
  title: "السياسة الشرعية",
  description: DESCRIPTION,
  primary_category_handle: "siyasa-shariyya",
  additional_category_handles: ["governance"],
  print: { price: 150, stock: 10 },
  images: [{ url: "https://cdn.example.com/cover.jpg" }],
  profile: { authors: ["ابن تيمية"], language: "ar", isbn: "978-0-306-40615-7", publisher: "دار نظم" },
};

function deps(over: Partial<PartnerDeps> = {}): PartnerDeps {
  return {
    profileRepo: { listBookProfiles: vi.fn(async () => []), createBookProfiles: vi.fn(), updateBookProfiles: vi.fn() },
    categoryIdsByHandle: vi.fn(async (hs: string[]) => new Map(hs.filter((h) => h !== "nope").map((h) => [h, `pcat_${h}`]))),
    defaultSalesChannelId: vi.fn(async () => "sc_web"),
    productStatus: vi.fn(async () => "draft"),
    importImage: vi.fn(async (url: string) => `https://store/static/${url.split("/").pop()}`),
    createBook: vi.fn(async () => ({ product: { id: "prod_new" } })),
    updateBook: vi.fn(async () => undefined),
    ...over,
  };
}

describe("upsertPartnerBook", () => {
  it("creates a draft with resolved categories and imported images", async () => {
    const d = deps();
    const out = await upsertPartnerBook(d, body);
    expect(out).toEqual({ status: "created", product_id: "prod_new" });
    expect(d.createBook).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "draft",
        sales_channel_id: "sc_web",
        image_urls: ["https://store/static/cover.jpg"],
        additional_category_ids: ["pcat_governance"],
        print: { price: 150, stock: 10 },
        digital: null,
        profile: expect.objectContaining({ isbn: "9780306406157", primary_category_id: "pcat_siyasa-shariyya" }),
      }),
    );
  });

  it("updates the same draft when the ISBN already exists (retry-safe)", async () => {
    const d = deps({
      profileRepo: { listBookProfiles: vi.fn(async () => [{ product_id: "prod_old" } as never]), createBookProfiles: vi.fn(), updateBookProfiles: vi.fn() },
    });
    expect(await upsertPartnerBook(d, body)).toEqual({ status: "updated", product_id: "prod_old" });
    expect(d.createBook).not.toHaveBeenCalled();
    expect(d.updateBook).toHaveBeenCalledWith("prod_old", expect.objectContaining({ title: "السياسة الشرعية" }));
  });

  it("refuses to change a book staff already published", async () => {
    const d = deps({
      profileRepo: { listBookProfiles: vi.fn(async () => [{ product_id: "prod_old" } as never]), createBookProfiles: vi.fn(), updateBookProfiles: vi.fn() },
      productStatus: vi.fn(async () => "published"),
    });
    await expect(upsertPartnerBook(d, body)).rejects.toMatchObject({ status: 409 });
  });

  it("needs an ISBN or external_id so retries can't duplicate", async () => {
    const { isbn, ...profile } = body.profile;
    await expect(upsertPartnerBook(deps(), { ...body, profile })).rejects.toMatchObject({ status: 400 });
  });

  it("lists valid handles when a category handle is unknown", async () => {
    await expect(upsertPartnerBook(deps(), { ...body, primary_category_handle: "nope" })).rejects.toThrow(/Unknown category handle.*nope.*GET \/partner\/categories/);
  });

  it("rejects a too-short description and a digital edition without rights", async () => {
    await expect(upsertPartnerBook(deps(), { ...body, description: "short" })).rejects.toBeInstanceOf(PartnerError);
    await expect(upsertPartnerBook(deps(), { ...body, digital: { price: 50 } })).rejects.toThrow(/digital distribution rights/);
  });

  it("accepts ChatGPT file attachments (openaiFileIdRefs) as images", async () => {
    const d = deps();
    await upsertPartnerBook(d, { ...body, images: [], openaiFileIdRefs: [{ name: "cover.png", download_link: "https://files.oaiusercontent.com/abc" }] });
    expect(d.importImage).toHaveBeenCalledWith("https://files.oaiusercontent.com/abc");
  });

  it("reports an image that can't be imported as 422", async () => {
    const d = deps({ importImage: vi.fn(async () => { throw new Error("https://x: not a public address"); }) });
    await expect(upsertPartnerBook(d, body)).rejects.toMatchObject({ status: 422 });
  });
});
```

Run: `cd apps/medusa && npx vitest run src/lib/partner-books.test.ts`
Expected: FAIL — module not found

- [ ] **Step 2: Write `partner-books.ts`**

```ts
// apps/medusa/src/lib/partner-books.ts
import type { MedusaContainer } from "@medusajs/framework/types";
import { updateProductsWorkflow, uploadFilesWorkflow } from "@medusajs/medusa/core-flows";
import { z } from "zod";
import { bookProfileSchema, type CreateBookInput } from "./book-input";
import { createBook, makeCreateBookDeps } from "./create-book";
import { makeSaveProfileDeps, saveBookProfile } from "./save-book-profile";
import { fetchPublicImage } from "./safe-image-fetch";
import { BOOK_CATALOG_MODULE, findProfileByIdentity, type BookProfileRepo } from "../modules/book-catalog";

export class PartnerError extends Error {
  constructor(public status: 400 | 404 | 409 | 422, message: string, public errors?: string[]) {
    super(message);
  }
}

const price = z.number().positive().max(1_000_000);
export const partnerBookSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    subtitle: z.string().trim().max(300).nullish(),
    description: z.string().trim().min(80, "description must be a full professional text (at least 80 characters)").max(20_000),
    primary_category_handle: z.string().trim().min(1),
    additional_category_handles: z.array(z.string().trim().min(1)).max(20).default([]),
    print: z.object({ price, stock: z.number().int().min(0).max(1_000_000).default(0) }).nullish(),
    digital: z.object({ price }).nullish(),
    images: z.array(z.object({ url: z.string() })).max(10).default([]),
    openaiFileIdRefs: z
      .array(z.object({ name: z.string().optional(), mime_type: z.string().optional(), download_link: z.string() }))
      .max(10)
      .default([]),
    profile: bookProfileSchema.omit({ primary_category_id: true }),
  })
  .superRefine((v, ctx) => {
    if (!v.profile.isbn && !v.profile.external_id) {
      ctx.addIssue({ code: "custom", path: ["profile", "isbn"], message: "send an isbn, or an external_id if the book has no ISBN" });
    }
    if (!v.print && !v.digital) {
      ctx.addIssue({ code: "custom", path: ["print"], message: "a book needs a print edition, a digital edition, or both" });
    }
    if (v.digital && !v.profile.digital_rights) {
      ctx.addIssue({ code: "custom", path: ["digital"], message: "a digital edition needs digital distribution rights (profile.digital_rights: true)" });
    }
  });

export type PartnerDeps = {
  profileRepo: BookProfileRepo;
  categoryIdsByHandle(handles: string[]): Promise<Map<string, string>>;
  defaultSalesChannelId(): Promise<string>;
  productStatus(productId: string): Promise<string | null>;
  importImage(url: string): Promise<string>;
  createBook(input: CreateBookInput): Promise<{ product: { id: string } }>;
  updateBook(productId: string, input: CreateBookInput): Promise<void>;
};

export async function upsertPartnerBook(
  deps: PartnerDeps,
  raw: unknown,
): Promise<{ status: "created" | "updated"; product_id: string }> {
  const parsed = partnerBookSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
    throw new PartnerError(400, errors.join("; "), errors);
  }
  const b = parsed.data;

  const handles = [b.primary_category_handle, ...b.additional_category_handles];
  const ids = await deps.categoryIdsByHandle(handles);
  const unknown = handles.filter((h) => !ids.has(h));
  if (unknown.length) {
    throw new PartnerError(400, `Unknown category handle(s): ${unknown.join(", ")}. Use a handle from GET /partner/categories.`);
  }

  const existing = await findProfileByIdentity(deps.profileRepo, { isbn: b.profile.isbn, external_id: b.profile.external_id });
  if (existing) {
    const status = await deps.productStatus(existing.product_id);
    if (status !== "draft") {
      throw new PartnerError(409, `Book ${existing.product_id} is already ${status ?? "gone"}; published books are edited by staff in Medusa Admin.`);
    }
  }

  const imageUrls: string[] = [];
  for (const src of [...b.images.map((i) => i.url), ...b.openaiFileIdRefs.map((f) => f.download_link)]) {
    try {
      imageUrls.push(await deps.importImage(src));
    } catch (err) {
      throw new PartnerError(422, `Image could not be imported — ${(err as Error).message}`);
    }
  }

  const input: CreateBookInput = {
    title: b.title,
    subtitle: b.subtitle ?? null,
    description: b.description,
    status: "draft",
    sales_channel_id: await deps.defaultSalesChannelId(),
    image_urls: imageUrls,
    additional_category_ids: b.additional_category_handles.map((h) => ids.get(h)!),
    print: b.print ?? null,
    digital: b.digital ?? null,
    profile: { ...b.profile, primary_category_id: ids.get(b.primary_category_handle)! },
  };

  if (existing) {
    await deps.updateBook(existing.product_id, input);
    return { status: "updated", product_id: existing.product_id };
  }
  const created = await deps.createBook(input);
  return { status: "created", product_id: created.product.id };
}

export function makePartnerDeps(container: MedusaContainer): PartnerDeps {
  const query = container.resolve("query");
  const profileRepo = container.resolve(BOOK_CATALOG_MODULE) as unknown as BookProfileRepo;
  const createDeps = makeCreateBookDeps(container);
  return {
    profileRepo,
    async categoryIdsByHandle(handles) {
      const { data } = await query.graph({ entity: "product_category", fields: ["id", "handle"], filters: { handle: handles } });
      return new Map((data as { id: string; handle: string }[]).map((c) => [c.handle, c.id]));
    },
    async defaultSalesChannelId() {
      const { data } = await query.graph({ entity: "sales_channel", fields: ["id"] });
      const id = (data[0] as { id: string } | undefined)?.id;
      if (!id) throw new PartnerError(422, "The store has no sales channel");
      return id;
    },
    async productStatus(productId) {
      const { data } = await query.graph({ entity: "product", fields: ["id", "status"], filters: { id: productId } });
      return (data[0] as { status: string } | undefined)?.status ?? null;
    },
    async importImage(url) {
      const img = await fetchPublicImage(url);
      const { result } = await uploadFilesWorkflow(container).run({
        input: { files: [{ filename: img.filename, mimeType: img.mimeType, content: img.base64, access: "public" }] },
      });
      return (result[0] as { url: string }).url;
    },
    createBook: (input) => createBook(createDeps, input),
    async updateBook(productId, input) {
      // Drafts only (checked above). Prices/stock stay as staff or the first import set them.
      await updateProductsWorkflow(container).run({
        input: {
          products: [{
            id: productId,
            title: input.title,
            subtitle: input.subtitle ?? undefined,
            description: input.description ?? undefined,
            ...(input.image_urls.length ? { thumbnail: input.image_urls[0], images: input.image_urls.map((url) => ({ url })) } : {}),
            category_ids: [...new Set([input.profile.primary_category_id!, ...input.additional_category_ids])],
          }],
        },
      });
      await saveBookProfile(makeSaveProfileDeps(container), productId, input.profile);
    },
  };
}
```

Run: `cd apps/medusa && npx vitest run src/lib/partner-books.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 3: Write the routes and their test**

```ts
// apps/medusa/src/api/partner/books/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { requirePartnerKey } from "../../../lib/partner-auth";
import { makePartnerDeps, PartnerError, upsertPartnerBook } from "../../../lib/partner-books";
import { findProfileByIdentity, BookProfileConflictError } from "../../../modules/book-catalog";
import { normalizeIsbn } from "../../../lib/book-text";

/** Look up a book by ISBN or external_id: GET /partner/books?isbn=… */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!requirePartnerKey(req, res)) return;
  const q = req.query as Record<string, string | undefined>;
  const deps = makePartnerDeps(req.scope);
  const row = await findProfileByIdentity(deps.profileRepo, { isbn: normalizeIsbn(q.isbn), external_id: q.external_id?.trim() || null });
  if (!row) return res.json({ book: null });
  return res.json({ book: { product_id: row.product_id, status: await deps.productStatus(row.product_id) } });
}

/** Create (or update, while still a draft) one book. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!requirePartnerKey(req, res)) return;
  try {
    const out = await upsertPartnerBook(makePartnerDeps(req.scope), req.body);
    return res.status(out.status === "created" ? 201 : 200).json(out);
  } catch (err) {
    if (err instanceof PartnerError) return res.status(err.status).json({ message: err.message, errors: err.errors });
    if (err instanceof BookProfileConflictError) return res.status(409).json({ message: err.message });
    throw err;
  }
}
```

```ts
// apps/medusa/src/api/partner/books/bulk/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { requirePartnerKey } from "../../../../lib/partner-auth";
import { makePartnerDeps, PartnerError, upsertPartnerBook } from "../../../../lib/partner-books";
import { BookProfileConflictError } from "../../../../modules/book-catalog";

const MAX = 20;

/** Up to 20 books; each succeeds or fails on its own. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!requirePartnerKey(req, res)) return;
  const books = (req.body as { books?: unknown } | undefined)?.books;
  if (!Array.isArray(books) || books.length === 0 || books.length > MAX) {
    return res.status(400).json({ message: `books must be an array of 1–${MAX} books` });
  }
  const deps = makePartnerDeps(req.scope);
  const results = [];
  for (const [index, book] of books.entries()) {
    try {
      results.push({ index, ok: true, ...(await upsertPartnerBook(deps, book)) });
    } catch (err) {
      if (err instanceof PartnerError || err instanceof BookProfileConflictError) {
        results.push({ index, ok: false, message: err.message });
      } else {
        throw err;
      }
    }
  }
  return res.json({ results });
}
```

```ts
// apps/medusa/src/api/partner/categories/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { requirePartnerKey } from "../../../lib/partner-auth";

/** The live classification (staff may have renamed/added categories). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!requirePartnerKey(req, res)) return;
  const { data } = await req.scope.resolve("query").graph({
    entity: "product_category",
    fields: ["id", "handle", "name", "parent_category_id", "rank", "metadata"],
  });
  const cats = data as Array<{ id: string; handle: string; name: string; parent_category_id: string | null; rank: number | null; metadata: Record<string, unknown> | null }>;
  const view = (c: (typeof cats)[number]) => ({ handle: c.handle, name: c.name, name_ar: (c.metadata?.name_ar as string) ?? null });
  const byRank = (a: (typeof cats)[number], b: (typeof cats)[number]) => (a.rank ?? 0) - (b.rank ?? 0);
  const sections = cats
    .filter((c) => c.parent_category_id === null && c.metadata?.darnozom === "book")
    .sort(byRank)
    .map((s) => ({ ...view(s), subcategories: cats.filter((c) => c.parent_category_id === s.id).sort(byRank).map(view) }));
  return res.json({ sections });
}
```

```ts
// apps/medusa/src/api/partner/books/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { upsertMock } = vi.hoisted(() => ({ upsertMock: vi.fn() }));
vi.mock("../../../lib/partner-books", async (orig) => ({
  ...(await orig<typeof import("../../../lib/partner-books")>()),
  upsertPartnerBook: upsertMock,
  makePartnerDeps: () => ({}),
}));

import { POST } from "./route";
import { PartnerError } from "../../../lib/partner-books";
import { resetPartnerRateLimit } from "../../../lib/partner-auth";

const KEY = "k_" + "y".repeat(40);
function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("POST /partner/books", () => {
  beforeEach(() => {
    process.env.BOOKS_API_KEY = KEY;
    resetPartnerRateLimit();
    upsertMock.mockReset();
  });

  it("requires the API key", async () => {
    const res = fakeRes();
    await POST({ headers: {}, body: {}, scope: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns 201 for a new draft and 200 for an update", async () => {
    upsertMock.mockResolvedValueOnce({ status: "created", product_id: "p1" });
    const r1 = fakeRes();
    await POST({ headers: { "x-api-key": KEY }, body: {}, scope: {} } as any, r1);
    expect(r1.status).toHaveBeenCalledWith(201);
    upsertMock.mockResolvedValueOnce({ status: "updated", product_id: "p1" });
    const r2 = fakeRes();
    await POST({ headers: { "x-api-key": KEY }, body: {}, scope: {} } as any, r2);
    expect(r2.status).toHaveBeenCalledWith(200);
  });

  it("passes PartnerError status and message through", async () => {
    upsertMock.mockRejectedValue(new PartnerError(409, "already published"));
    const res = fakeRes();
    await POST({ headers: { "x-api-key": KEY }, body: {}, scope: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "already published", errors: undefined });
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/medusa && npx vitest run src/lib/partner-books.test.ts src/api/partner`
Expected: PASS (11 tests)

- [ ] **Step 5: Try it against the running server**

With `BOOKS_API_KEY` set in `apps/medusa/.env` (e.g. from `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) and Medusa restarted:

```bash
curl -s -H "x-api-key: $BOOKS_API_KEY" http://localhost:9010/partner/categories | head -c 400
curl -s -X POST -H "x-api-key: $BOOKS_API_KEY" -H "content-type: application/json" http://localhost:9010/partner/books \
  -d '{"title":"اختبار الواجهة","description":"نص وصفي احترافي يشرح موضوع الكتاب ومحاوره وأهميته العلمية والفئة المستهدفة منه لأغراض الاختبار فقط.","primary_category_handle":"governance","print":{"price":100,"stock":3},"profile":{"authors":["اختبار"],"language":"ar","external_id":"test-001"}}'
```

Expected: categories JSON; then `{"status":"created","product_id":"prod_…"}`; running the same POST again returns `{"status":"updated",…}`; the product appears in Medusa Admin as a Draft. Delete the test product afterwards.

- [ ] **Step 6: Commit**

```bash
git add apps/medusa/src/lib/partner-books.ts apps/medusa/src/lib/partner-books.test.ts apps/medusa/src/api/partner
git commit -m "feat(partner): ChatGPT books API — categories, lookup, draft upsert, bulk"
```

---

### Task 20: OpenAPI schema and ChatGPT setup guide

**Files:**
- Create: `apps/medusa/src/lib/partner-openapi.ts`
- Test: `apps/medusa/src/lib/partner-openapi.test.ts`
- Create: `apps/medusa/src/api/partner/openapi/route.ts`
- Create: `docs/chatgpt-books-api.md`

**Interfaces:**
- Consumes: routes from Task 19
- Produces: `buildPartnerOpenApi(serverUrl: string): Record<string, unknown>` (OpenAPI 3.1, operationIds `listCategories`, `findBook`, `upsertBook`, `upsertBooksBulk`, apiKey header `x-api-key`); `GET /partner/openapi` (public — the schema holds no secrets)

- [ ] **Step 1: Write the failing test**

```ts
// apps/medusa/src/lib/partner-openapi.test.ts
import { describe, it, expect } from "vitest";
import { buildPartnerOpenApi } from "./partner-openapi";

describe("buildPartnerOpenApi", () => {
  const doc = buildPartnerOpenApi("https://ecommerce.darnozom.com/") as any;

  it("describes every partner operation for a Custom GPT Action", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.servers).toEqual([{ url: "https://ecommerce.darnozom.com" }]);
    const ops = Object.values(doc.paths).flatMap((p: any) => Object.values(p).map((o: any) => o.operationId));
    expect(ops.sort()).toEqual(["findBook", "listCategories", "upsertBook", "upsertBooksBulk"]);
    expect(doc.components.securitySchemes.apiKey).toEqual({ type: "apiKey", in: "header", name: "x-api-key" });
  });

  it("requires the fields the server requires", () => {
    const book = doc.components.schemas.Book;
    expect(book.required).toEqual(["title", "description", "primary_category_handle", "profile"]);
    expect(doc.components.schemas.Profile.required).toEqual(["authors", "language"]);
  });
});
```

Run: `cd apps/medusa && npx vitest run src/lib/partner-openapi.test.ts`
Expected: FAIL — module not found

- [ ] **Step 2: Write the schema builder and route**

```ts
// apps/medusa/src/lib/partner-openapi.ts
const str = (description: string, extra: Record<string, unknown> = {}) => ({ type: "string", description, ...extra });
const int = (description: string) => ({ type: "integer", description });
const list = (description: string) => ({ type: "array", items: { type: "string" }, description });

export function buildPartnerOpenApi(serverUrl: string): Record<string, unknown> {
  const url = serverUrl.replace(/\/+$/, "");
  const json = (ref: string) => ({ "application/json": { schema: { $ref: `#/components/schemas/${ref}` } } });
  return {
    openapi: "3.1.0",
    info: {
      title: "Dar Nozom Books API",
      version: "1.0.0",
      description: "Create and update DRAFT books in the Dar Nozom store. Staff review and publish them. Digital book files are uploaded by staff, never through this API.",
    },
    servers: [{ url }],
    security: [{ apiKey: [] }],
    paths: {
      "/partner/categories": {
        get: { operationId: "listCategories", summary: "List sections and subcategories (use their handles)", responses: { "200": { description: "Classification" } } },
      },
      "/partner/books": {
        get: {
          operationId: "findBook",
          summary: "Check whether a book already exists",
          parameters: [
            { name: "isbn", in: "query", schema: { type: "string" } },
            { name: "external_id", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "{ book: { product_id, status } | null }" } },
        },
        post: {
          operationId: "upsertBook",
          summary: "Create a draft book, or update it while it is still a draft (matched by ISBN or external_id)",
          requestBody: { required: true, content: json("Book") },
          responses: { "201": { description: "Created" }, "200": { description: "Updated" }, "400": { description: "Invalid input — read message" }, "409": { description: "Already published — staff edit it" }, "422": { description: "Image could not be imported" } },
        },
      },
      "/partner/books/bulk": {
        post: {
          operationId: "upsertBooksBulk",
          summary: "Create/update up to 20 draft books; each result is reported separately",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["books"], properties: { books: { type: "array", maxItems: 20, items: { $ref: "#/components/schemas/Book" } } } } } } },
          responses: { "200": { description: "{ results: [{ index, ok, status?, product_id?, message? }] }" } },
        },
      },
    },
    components: {
      securitySchemes: { apiKey: { type: "apiKey", in: "header", name: "x-api-key" } },
      schemas: {
        Book: {
          type: "object",
          required: ["title", "description", "primary_category_handle", "profile"],
          properties: {
            title: str("Book title as printed"),
            subtitle: str("Subtitle, if any"),
            description: str("Professional description (80+ characters): subject, main themes, scholarly significance, target audience."),
            primary_category_handle: str("Subcategory (or section) handle from listCategories"),
            additional_category_handles: list("Extra subject category handles"),
            print: { type: "object", properties: { price: { type: "number", description: "EGP" }, stock: int("Copies in stock") }, required: ["price"] },
            digital: { type: "object", properties: { price: { type: "number", description: "EGP; requires profile.digital_rights true" } }, required: ["price"] },
            images: { type: "array", maxItems: 10, items: { type: "object", required: ["url"], properties: { url: str("Public https image URL; the first image is the cover") } } },
            openaiFileIdRefs: { type: "array", maxItems: 10, items: { type: "string" }, description: "Images attached in the chat (cover first)" },
            profile: { $ref: "#/components/schemas/Profile" },
          },
        },
        Profile: {
          type: "object",
          required: ["authors", "language"],
          properties: {
            authors: list("Author names"),
            editors: list("Editor names, if any"),
            translators: list("Translator names, if any"),
            publisher: str("Publisher"),
            isbn: str("ISBN-10 or ISBN-13; hyphens allowed. Send isbn OR external_id."),
            external_id: str("Your stable id for a book without ISBN"),
            publication_year: int("Year of publication"),
            edition_number: int("Edition number"),
            pages: int("Number of pages"),
            volumes: int("Number of volumes (default 1)"),
            language: str("Book language", { enum: ["ar", "en", "both"] }),
            keywords: list("Search keywords"),
            target_audience: str("Who the book is for"),
            table_of_contents: str("One chapter per line"),
            digital_rights: { type: "boolean", description: "True only if the publisher granted digital distribution rights" },
          },
        },
      },
    },
  };
}
```

```ts
// apps/medusa/src/api/partner/openapi/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { buildPartnerOpenApi } from "../../../lib/partner-openapi";

/** Public: paste this URL into the Custom GPT's "Import from URL". */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json(buildPartnerOpenApi(process.env.MEDUSA_BACKEND_URL || "http://localhost:9010"));
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd apps/medusa && npx vitest run src/lib/partner-openapi.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 4: Write the setup guide**

Create `docs/chatgpt-books-api.md` with these sections, filled in:

```markdown
# Adding books with ChatGPT

## What it does
A Custom GPT sends book data to the store. Each book arrives as a **draft**;
staff check it in Medusa Admin → Products and click Publish. Digital book
files are uploaded by staff on the product's Digital variant, never by ChatGPT.

## One-time setup (admin)
1. Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
2. Put it in the Medusa server's environment as `BOOKS_API_KEY=<key>` and restart Medusa.
3. In ChatGPT: Explore GPTs → Create → Configure → Create new action.
   - Import from URL: `https://ecommerce.darnozom.com/partner/openapi`
   - Authentication: API Key → Custom header name `x-api-key` → paste the key.
4. Paste the instructions below into the GPT's Instructions box.

## GPT instructions
You add books to the Dar Nozom store through the Books API.
- Before adding, call listCategories and choose the most specific subcategory
  handle; add up to 3 additional_category_handles for secondary subjects.
- Always send an isbn (or, only if the book truly has none, an external_id you
  keep stable for that book). Call findBook first; if it exists and is
  published, tell the user staff must edit it in Medusa Admin.
- Write the description as a professional text in the book's language: the
  subject, main themes, scholarly significance and target audience
  (150–300 words). Never invent facts; ask the user for missing data.
- Prices are in EGP. Only include `digital` when the user confirms the
  publisher granted digital distribution rights, and set
  profile.digital_rights to true.
- Cover image first. Use images the user attaches, or public https URLs.
- For many books, use upsertBooksBulk with up to 20 books per call and report
  each result.
- After saving, tell the user the books are drafts waiting for staff review.

## Limits and errors
- 60 requests per minute. 400 = fix the field named in `message`; 409 = the
  book is already published; 422 = an image URL could not be downloaded
  (must be public https, an image, max 5 MB, no redirects).

## Revoking access
Change or remove `BOOKS_API_KEY` and restart Medusa.
```

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/lib/partner-openapi.ts apps/medusa/src/lib/partner-openapi.test.ts apps/medusa/src/api/partner/openapi docs/chatgpt-books-api.md
git commit -m "docs(partner): OpenAPI schema and ChatGPT setup guide"
```

---

# Phase 5 — Rollout

### Task 21: Configuration, deploy steps and final verification

**Files:**
- Modify: `deploy/deploy.sh` (Medusa env block)
- Modify: `apps/medusa/.env.template`

- [ ] **Step 1: Add the new setting to deploy and the template**

In `deploy/deploy.sh`, in the Medusa env heredoc, after `DARNOZOM_PUBLIC_API_URL=https://$DOMAIN` add:

```sh
# ChatGPT books API (/partner/*). Empty = API disabled (answers 503).
BOOKS_API_KEY=${BOOKS_API_KEY:-}
```

In `apps/medusa/.env.template` add:

```sh
# ChatGPT books API key (x-api-key header). Empty = /partner/* disabled.
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
# BOOKS_API_KEY=
```

- [ ] **Step 2: Run the seed on every deploy, right after migrations**

Production runs the compiled server (`$MEDUSA_DIR` = the uploaded `.medusa/server`), so the script is the compiled `.js`. In `deploy/deploy.sh`, inside the existing subshell that runs `npx medusa db:migrate` (it `cd`s to `$MEDUSA_DIR` and sources `$MEDUSA_ENV`), add after that line:

```sh
  # Idempotent: creates missing sections/subcategories, maps legacy
  # categories, backfills book profiles. Never renames staff edits.
  npx medusa exec ./src/scripts/seed-book-catalog.js
```

Confirm the path locally first: `cd apps/medusa && npx medusa build && ls .medusa/server/src/scripts/seed-book-catalog.js` — expected: the file is listed.

- [ ] **Step 3: Full test and build run**

```bash
cd apps/medusa && npx vitest run && npx medusa build
cd ../client && npx vitest run && pnpm -s typecheck
cd ../api && node --env-file=../../.env ./node_modules/vitest/vitest.mjs run && pnpm -s typecheck
```

Expected: all new tests pass; the only failures are ones that already failed before this plan (record them by name in the hand-off); both builds succeed; typechecks print nothing.

- [ ] **Step 4: End-to-end check on the local stack**

With `pnpm dev` running:
1. Medusa Admin → Products → Categories shows the 8 sections with subcategories; Digital Transformation sits under Public Administration; Shariah and Management are gone and their books are in the new sections.
2. Create Book: a print-only book, a digital-only book (with digital rights), and one with both — each with a different price.
3. Storefront: search by an author's name, by publisher, by a keyword, by ISBN with hyphens, and with an Arabic spelling variant — each finds the book. Filter by section, subcategory, author, publisher, language, format.
4. Book page shows the organized details, clickable section and keywords, table of contents, related books; the print/digital choice shows the right price for each.
5. Take the digital edition off sale in the Editions panel → the storefront shows it unavailable and checkout rejects it; a buyer who already owns it still sees it in My Library.
6. ChatGPT API: create a draft via `curl` (Task 19 Step 5), retry it (updated, not duplicated), publish it in Medusa, retry again (409).

- [ ] **Step 5: Commit**

```bash
git add deploy/deploy.sh apps/medusa/.env.template
git commit -m "chore(deploy): books API key and classification seed on deploy"
```
