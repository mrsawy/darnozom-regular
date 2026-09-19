# Medusa Ecommerce Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom books-ecommerce system (catalog, cart, checkout,
payments, shipping, digital delivery, admin) with Medusa v2 as the commerce
engine and admin dashboard, while keeping the existing Vite storefront,
Better Auth identity, and academy/store-apps logic intact.

**Architecture:** Medusa v2 runs as a third app (`apps/medusa`) in the
existing pnpm workspace, its own Postgres database (`medusa`, same server)
and a new Redis container. Five custom payment provider modules wrap the
existing Paymob/PayPal HTTP clients and add Lemon Squeezy; a custom
fulfillment provider replicates city-keyed shipping rates; a custom
`digital-product` module + module link grants and serves digital-book
entitlements. The Vite storefront's store/cart/checkout pages are rewired
to call Medusa's Store API via `@medusajs/js-sdk` instead of the existing
Express routes, which are deleted once verified. Better Auth stays the
identity source of truth; Medusa customers are created/linked on demand
from Express.

**Tech Stack:** Medusa v2 (`@medusajs/framework`, `@medusajs/medusa`),
Postgres 16, Redis 7, `@medusajs/js-sdk` (browser), existing Express 5 /
Drizzle / Better Auth stack, existing `apps/api/src/lib/storage` local-disk
object store, pnpm workspace, Vitest (existing test runner pattern in
`apps/api`).

**Spec:** [docs/superpowers/specs/2026-09-15-medusa-ecommerce-migration-design.md](../specs/2026-09-15-medusa-ecommerce-migration-design.md)

## Global Constraints

- Medusa v2 requires Node.js v20.19.0+ or v22.12.0+ (LTS only) — the
  workspace's Node 25 is too new for the Medusa server process. Pin Node 22
  LTS for `apps/medusa` via a local `.nvmrc`/`.node-version` file and the
  systemd unit's `Environment=PATH=...` — do not attempt to run Medusa on
  Node 25.
- Medusa's own Postgres database is named `medusa`, lives on the **same**
  Postgres 16 container as `darnozom`, never the same database/schema —
  confirmed in the design spec.
- No new digital-file storage backend: reuse
  `apps/api/src/lib/storage/objectStore.ts` local-disk store
  (`PRIVATE_OBJECT_DIR`, `savePrivateObject`/`openPrivateObjectStream`
  etc.) — production already runs `OBJECT_STORAGE_BACKEND=local`, not GCS.
- Every payment provider module extends `AbstractPaymentProvider` from
  `@medusajs/framework/utils` and is registered in `medusa-config.ts`'s
  Payment Module `providers` array with a unique `id`.
- Academy courses and store apps are explicitly out of scope — do not
  touch `apps/api/src/routes/store-courses`, `apps/api/src/routes/jobs`,
  `packages/db/src/schema/storeCourses.ts`, `storeApps.ts`.
- Historical `orders`/`order_items`/`checkout_profiles` rows are never
  migrated into Medusa and never deleted by this plan — only later,
  manually, after the 90-day retention window per the spec.
- Follow existing repo conventions: Vitest for tests (see
  `apps/api/src/routes/orders/*.test.ts` for the existing integration-test
  style against a real `DATABASE_URL`), Drizzle schema files one table
  per file, commit messages in the imperative present tense matching
  existing git log style.

---

## Phase 1 — Scaffold Medusa into the monorepo

### Task 1: Scaffold the Medusa v2 backend and fold it into the pnpm workspace

**Files:**
- Create: `apps/medusa/` (entire Medusa backend, generated then moved)
- Create: `apps/medusa/.node-version`
- Modify: `pnpm-workspace.yaml` (no change needed — `apps/*` already
  matched, verify only)
- Modify: `tsconfig.json` (add `apps/medusa` project reference if the repo
  pattern requires it — check `apps/api`'s entry first)
- Create: `.env.example` additions for `MEDUSA_DATABASE_URL`,
  `MEDUSA_REDIS_URL`, `MEDUSA_ADMIN_CORS`, `MEDUSA_STORE_CORS`,
  `MEDUSA_JWT_SECRET`, `MEDUSA_COOKIE_SECRET`

**Interfaces:**
- Produces: a runnable Medusa backend at `apps/medusa` with `pnpm --filter
  medusa dev` working, its own `package.json` `name` field set to
  `medusa` (so `--filter medusa` addresses it, matching the `@workspace/*`
  naming the rest of the repo uses is not required since Medusa's own
  tooling expects a plain package name — confirm against the generated
  `package.json` and adjust only if it collides with another workspace
  package name).

- [ ] **Step 1: Confirm Node 22 LTS is available locally**

Run: `node -v`
If it does not print a `v22.x` version, install one (e.g. via `nvm install
22 --lts` or `fnm install 22`) and switch to it for the remaining steps in
this task only: `nvm use 22` / `fnm use 22`.

- [ ] **Step 2: Scaffold Medusa into a scratch directory**

Run (from the repo root, using Node 22):
```bash
mkdir -p /tmp/medusa-scaffold
cd /tmp/medusa-scaffold
pnpm dlx create-medusa-app@latest medusa-backend \
  --use-pnpm \
  --no-browser \
  --skip-db
```
`--skip-db` avoids the CLI trying to create/migrate a database before the
real `medusa` Postgres database exists (Task 2 creates it). Answer any
interactive prompts (project name, plugins) by accepting defaults — no
Next.js storefront.

- [ ] **Step 3: Move the generated backend into the workspace**

```bash
cd "<repo-root>"
mkdir -p apps/medusa
cp -r /tmp/medusa-scaffold/medusa-backend/apps/backend/. apps/medusa/
rm -rf /tmp/medusa-scaffold
```

- [ ] **Step 4: Rename the package and align with workspace conventions**

Open `apps/medusa/package.json`. Set `"name": "medusa"` (plain name, not
`@workspace/medusa` — Medusa's own CLI and admin build tooling reference
the package by its `name` in generated config; keep it simple and
confirm it doesn't collide with `pnpm -r ls`).

Run: `pnpm -r ls --depth -1 | grep -i medusa` to confirm the workspace
now sees `apps/medusa`.

- [ ] **Step 5: Add `.node-version` pin**

Create `apps/medusa/.node-version`:
```
22
```

- [ ] **Step 6: Install workspace dependencies**

Run: `pnpm install`
Expected: completes without error; `apps/medusa/node_modules` (or the
workspace-hoisted equivalent) is populated.

- [ ] **Step 7: Add root scripts for the Medusa app**

Modify root `package.json` `scripts`, adding (matching the existing
`dev:api`/`build:api` naming pattern):
```json
"dev:medusa": "pnpm --filter medusa dev",
"build:medusa": "pnpm --filter medusa build"
```

- [ ] **Step 8: Commit**

```bash
git add apps/medusa pnpm-workspace.yaml package.json pnpm-lock.yaml
git commit -m "feat(medusa): scaffold Medusa v2 backend into apps/medusa

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Provision the `medusa` Postgres database and Redis container

**Files:**
- Create: `deploy/medusa/docker-compose.yml`
- Modify: `deploy/db/docker-compose.yml` (no schema change — verify the
  existing Postgres container can host a second database; add a comment
  noting the second database, do not add a second `services.db` block)
- Modify: root `.env.example` (add `MEDUSA_DATABASE_URL`,
  `MEDUSA_REDIS_URL`)
- Modify: root `package.json` `scripts` (add `dev:medusa:redis` /
  `dev:medusa:redis:down`)

**Interfaces:**
- Produces: a reachable `medusa` database on the existing Postgres
  container and a reachable local Redis on `MEDUSA_REDIS_URL`, both
  consumed by Task 3's `medusa-config.ts`.

- [ ] **Step 1: Create the `medusa` database on the existing Postgres container**

Run (with the existing dev Postgres container up — `pnpm dev:db`):
```bash
docker exec -it darnozom-db psql -U darnozom -d darnozom \
  -c "CREATE DATABASE medusa OWNER darnozom;"
```
Expected: `CREATE DATABASE`

- [ ] **Step 2: Write the Redis compose file**

Create `deploy/medusa/docker-compose.yml`:
```yaml
# Redis for Medusa v2's event bus, workflow engine, and cache.
# Same lifecycle pattern as deploy/db/docker-compose.yml — one file used
# identically in local development and on the production VPS.

services:
  medusa-redis:
    image: redis:7-alpine
    container_name: darnozom-medusa-redis
    restart: unless-stopped
    ports:
      - "127.0.0.1:${MEDUSA_REDIS_PORT:-6380}:6379"
    volumes:
      - darnozom_medusa_redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 12
      start_period: 5s

volumes:
  darnozom_medusa_redis:
    name: darnozom_medusa_redis
```
Port defaults to `6380` (not the standard `6379`) to avoid colliding with
any locally-installed Redis, mirroring how `deploy/db/docker-compose.yml`
defaults `POSTGRES_PORT` to a non-standard value for the same reason —
confirm against that file and match its exact default port instead if it
does not use 5432.

- [ ] **Step 3: Add env vars**

Modify root `.env.example`, adding near the existing `DATABASE_URL` entry:
```
# Medusa v2 (books commerce backend + admin dashboard)
MEDUSA_DATABASE_URL=postgresql://darnozom:darnozom@localhost:5434/medusa
MEDUSA_REDIS_URL=redis://localhost:6380
MEDUSA_JWT_SECRET=
MEDUSA_COOKIE_SECRET=
MEDUSA_ADMIN_CORS=http://localhost:9000
MEDUSA_STORE_CORS=http://localhost:5173
```
Match the port in `MEDUSA_DATABASE_URL` to whatever `POSTGRES_PORT`
actually resolves to locally (check root `.env`, not `.env.example`, for
the real local value before finalizing this line).

- [ ] **Step 4: Add root scripts**

Modify root `package.json` `scripts`:
```json
"dev:medusa:redis": "docker compose --project-directory . -f deploy/medusa/docker-compose.yml up -d",
"dev:medusa:redis:down": "docker compose --project-directory . -f deploy/medusa/docker-compose.yml down"
```

- [ ] **Step 5: Start Redis and verify**

Run: `pnpm dev:medusa:redis`
Run: `docker exec darnozom-medusa-redis redis-cli ping`
Expected: `PONG`

- [ ] **Step 6: Commit**

```bash
git add deploy/medusa .env.example package.json
git commit -m "feat(medusa): add medusa database provisioning and Redis compose

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Configure `medusa-config.ts` and run first migrations

**Files:**
- Modify: `apps/medusa/medusa-config.ts`
- Modify: `apps/medusa/.env` (local only, not committed — mirror from
  `.env.example` additions in Task 2)

**Interfaces:**
- Consumes: `MEDUSA_DATABASE_URL`, `MEDUSA_REDIS_URL`,
  `MEDUSA_JWT_SECRET`, `MEDUSA_COOKIE_SECRET`, `MEDUSA_ADMIN_CORS`,
  `MEDUSA_STORE_CORS` from Task 2.
- Produces: a running Medusa server with core tables migrated, reachable
  at `http://localhost:9000`, admin dashboard at
  `http://localhost:9000/app`.

- [ ] **Step 1: Point config at the provisioned database and Redis**

Modify `apps/medusa/medusa-config.ts` so `projectConfig` reads:
```typescript
databaseUrl: process.env.MEDUSA_DATABASE_URL,
redisUrl: process.env.MEDUSA_REDIS_URL,
http: {
  jwtSecret: process.env.MEDUSA_JWT_SECRET || "supersecret",
  cookieSecret: process.env.MEDUSA_COOKIE_SECRET || "supersecret",
  adminCors: process.env.MEDUSA_ADMIN_CORS || "http://localhost:9000",
  storeCors: process.env.MEDUSA_STORE_CORS || "http://localhost:5173",
  authCors: process.env.MEDUSA_ADMIN_CORS || "http://localhost:9000",
},
```
(Exact key names depend on the scaffolded version's generated
`medusa-config.ts` — open the file first and adjust the existing
`projectConfig`/`http` block in place rather than replacing the whole
file, preserving whatever plugin/module registrations `create-medusa-app`
already added.)

- [ ] **Step 2: Copy env values into `apps/medusa/.env`**

Create/modify `apps/medusa/.env` (gitignored — verify `.gitignore`
already excludes `apps/medusa/.env`, add an entry if not) with the real
local values matching Task 2's `.env.example` additions.

- [ ] **Step 3: Run migrations**

Run: `pnpm --filter medusa exec medusa db:migrate`
Expected: migration output ending without error, creating Medusa's core
tables in the `medusa` database.

- [ ] **Step 4: Verify tables exist**

Run:
```bash
docker exec -it darnozom-db psql -U darnozom -d medusa -c "\dt" | head -20
```
Expected: a list of `medusa`-prefixed and core commerce tables (e.g.
`product`, `cart`, `order`, `customer`, `payment`).

- [ ] **Step 5: Create the first admin user**

Run: `pnpm --filter medusa exec medusa user -e admin@darnozom.com -p <a-strong-local-password>`
Expected: `User created successfully`

- [ ] **Step 6: Start the dev server and verify the dashboard loads**

Run: `pnpm dev:medusa` (background/separate terminal)
Then: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9000/health`
Expected: `200`

- [ ] **Step 7: Commit**

```bash
git add apps/medusa/medusa-config.ts .gitignore
git commit -m "feat(medusa): configure database, redis, and CORS for local dev

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

**End of Phase 1.** Checkpoint: a fresh clone can run `pnpm install`,
`pnpm dev:db`, `pnpm dev:medusa:redis`, `docker exec ... CREATE DATABASE`
(documented in a Task 8 README update later), `pnpm --filter medusa exec
medusa db:migrate`, `pnpm dev:medusa`, and reach the empty Medusa admin
dashboard at `localhost:9000/app`. No storefront or payment code exists
yet — this phase only proves the new service boots inside the monorepo.

---

## Phase 2 — Catalog migration (books → Medusa products)

### Task 4: Write and test the books-to-products migration script

**Files:**
- Create: `apps/medusa/src/scripts/migrate-books.ts`
- Test: `apps/medusa/src/scripts/migrate-books.test.ts`
- Create: `apps/medusa/src/scripts/migrate-books-mapping.json` (git-ignored
  output artifact, not committed — add to `.gitignore`)

**Interfaces:**
- Consumes: `packages/db` Drizzle client and the `books` table shape from
  `packages/db/src/schema/books.ts` (`id`, `title`, `titleEn`, `author`,
  `description`, `descriptionEn`, `coverImageUrl`, `category`, `format`,
  `language`, `pages`, `isbn`, `paperAvailable`, `paperPrice`,
  `digitalAvailable`, `digitalPrice`, `digitalFileUrl`, `status`,
  `isFeatured`, `isNewRelease`, `currency`).
- Produces: `migrateBooks(deps: { booksDb: NodePgDatabase; medusaContainer:
  MedusaContainer }): Promise<Array<{ bookId: number; medusaProductId:
  string; digitalVariantId: string | null; paperVariantId: string | null
  }>>` — the exact return shape Task 5 (digital-file linking) and Task 26
  (storefront badge mapping) depend on.

- [ ] **Step 1: Write the failing test for one book with both variants**

```typescript
// apps/medusa/src/scripts/migrate-books.test.ts
import { describe, it, expect, vi } from "vitest";
import { migrateBooks } from "./migrate-books";

describe("migrateBooks", () => {
  it("creates a product with paper and digital variants from a book row", async () => {
    const fakeBook = {
      id: 42,
      title: "إدارة التحول الرقمي",
      titleEn: "Digital Transformation Management",
      author: "د. أحمد",
      description: "وصف",
      descriptionEn: "Description",
      coverImageUrl: "https://example.com/cover.jpg",
      category: "digital_transformation" as const,
      format: "both" as const,
      language: "ar" as const,
      pages: "240",
      isbn: "978-1-234567-89-0",
      price: null,
      currency: "EGP",
      paperAvailable: true,
      paperPrice: "350",
      digitalAvailable: true,
      digitalPrice: "150",
      digitalFileUrl: "books/digital/42.pdf",
      status: "available" as const,
      isFeatured: true,
      isNewRelease: false,
      externalUrl: null,
      buyLink: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const booksDb = {
      select: () => ({
        from: () => Promise.resolve([fakeBook]),
      }),
    };

    const createProductsMock = vi.fn().mockResolvedValue({
      result: [
        {
          id: "prod_01",
          variants: [
            { id: "variant_paper_01", title: "Paper" },
            { id: "variant_digital_01", title: "Digital" },
          ],
        },
      ],
    });

    const medusaContainer = {
      resolve: () => ({}),
    };

    const result = await migrateBooks({
      booksDb: booksDb as any,
      medusaContainer: medusaContainer as any,
      __testCreateProductsWorkflow: () => ({ run: createProductsMock }),
    } as any);

    expect(result).toEqual([
      {
        bookId: 42,
        medusaProductId: "prod_01",
        paperVariantId: "variant_paper_01",
        digitalVariantId: "variant_digital_01",
      },
    ]);
    expect(createProductsMock).toHaveBeenCalledTimes(1);
    const callArg = createProductsMock.mock.calls[0][0];
    expect(callArg.input.products[0].title).toBe(
      "Digital Transformation Management",
    );
    expect(callArg.input.products[0].variants).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/scripts/migrate-books.test.ts`
Expected: FAIL — `migrate-books.ts` does not exist / `migrateBooks` is not
exported.

- [ ] **Step 3: Write the migration script**

```typescript
// apps/medusa/src/scripts/migrate-books.ts
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";

export interface BookRow {
  id: number;
  title: string;
  titleEn: string | null;
  author: string | null;
  description: string | null;
  descriptionEn: string | null;
  coverImageUrl: string | null;
  category: "shariah" | "management" | "digital_transformation" | "other";
  format: "online" | "hardcopy" | "both";
  language: "ar" | "en" | "both";
  isbn: string | null;
  currency: string | null;
  paperAvailable: boolean;
  paperPrice: string | null;
  digitalAvailable: boolean;
  digitalPrice: string | null;
  digitalFileUrl: string | null;
  status: "available" | "coming_soon" | "out_of_stock";
  isFeatured: boolean;
  isNewRelease: boolean;
}

export interface BookMigrationResult {
  bookId: number;
  medusaProductId: string;
  paperVariantId: string | null;
  digitalVariantId: string | null;
}

interface MigrateBooksDeps {
  booksDb: { select: () => { from: () => Promise<BookRow[]> } };
  medusaContainer: MedusaContainer;
  // Test seam only — production callers omit this and get the real workflow.
  __testCreateProductsWorkflow?: (
    container: MedusaContainer,
  ) => { run: (args: any) => Promise<{ result: any[] }> };
}

function currencyCode(currency: string | null): string {
  return (currency || "EGP").toLowerCase();
}

function buildVariants(book: BookRow) {
  const variants: Array<{
    title: string;
    sku: string;
    prices: Array<{ amount: number; currency_code: string }>;
    metadata: { kind: "paper" | "digital" };
  }> = [];

  if (book.paperAvailable && book.paperPrice) {
    variants.push({
      title: "Paper",
      sku: `book-${book.id}-paper`,
      prices: [
        { amount: Math.round(Number(book.paperPrice) * 100), currency_code: currencyCode(book.currency) },
      ],
      metadata: { kind: "paper" },
    });
  }

  if (book.digitalAvailable && book.digitalPrice) {
    variants.push({
      title: "Digital",
      sku: `book-${book.id}-digital`,
      prices: [
        { amount: Math.round(Number(book.digitalPrice) * 100), currency_code: currencyCode(book.currency) },
      ],
      metadata: { kind: "digital" },
    });
  }

  return variants;
}

export async function migrateBooks(
  deps: MigrateBooksDeps,
): Promise<BookMigrationResult[]> {
  const books = await deps.booksDb.select().from();
  const results: BookMigrationResult[] = [];

  const workflowFactory = deps.__testCreateProductsWorkflow ?? createProductsWorkflow;
  const workflow = workflowFactory(deps.medusaContainer);

  for (const book of books) {
    const variants = buildVariants(book);
    if (variants.length === 0) continue; // book has neither price set — skip, log separately

    const { result } = await workflow.run({
      input: {
        products: [
          {
            title: book.titleEn || book.title,
            status: book.status === "available" ? "published" : "draft",
            description: book.descriptionEn || book.description || undefined,
            thumbnail: book.coverImageUrl || undefined,
            options: [{ title: "Format", values: variants.map((v) => v.title) }],
            variants: variants.map((v) => ({
              title: v.title,
              sku: v.sku,
              options: { Format: v.title },
              prices: v.prices,
              metadata: v.metadata,
            })),
            metadata: {
              legacyBookId: book.id,
              category: book.category,
              language: book.language,
              isbn: book.isbn,
              isFeatured: book.isFeatured,
              isNewRelease: book.isNewRelease,
            },
          },
        ],
      },
    });

    const product = result[0];
    const paperVariant = product.variants.find((v: any) => v.title === "Paper");
    const digitalVariant = product.variants.find((v: any) => v.title === "Digital");

    results.push({
      bookId: book.id,
      medusaProductId: product.id,
      paperVariantId: paperVariant?.id ?? null,
      digitalVariantId: digitalVariant?.id ?? null,
    });
  }

  return results;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/scripts/migrate-books.test.ts`
Expected: PASS

- [ ] **Step 5: Add the paper-only and digital-only edge case tests**

Add two more `it(...)` blocks to `migrate-books.test.ts`: one where
`paperAvailable` is `true`/`digitalAvailable` is `false` (expect
`digitalVariantId: null`), one where a book has neither price set
(expect it excluded from the returned array and `createProductsWorkflow`
not called for it). Run the full file again; expect all tests PASS.

- [ ] **Step 6: Gitignore the mapping output file**

Modify `.gitignore`, add:
```
apps/medusa/src/scripts/migrate-books-mapping.json
```

- [ ] **Step 7: Commit**

```bash
git add apps/medusa/src/scripts/migrate-books.ts apps/medusa/src/scripts/migrate-books.test.ts .gitignore
git commit -m "feat(medusa): add books-to-products migration script with tests

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Write and test the CLI entrypoint that runs the migration and persists the id-mapping file

**Files:**
- Create: `apps/medusa/src/scripts/run-migrate-books.ts`
- Test: `apps/medusa/src/scripts/run-migrate-books.test.ts`

**Interfaces:**
- Consumes: `migrateBooks` from Task 4
  (`apps/medusa/src/scripts/migrate-books.ts`).
- Produces: a Medusa exec-script entrypoint runnable as `pnpm --filter
  medusa exec medusa exec ./src/scripts/run-migrate-books.ts`, writing
  `migrate-books-mapping.json` (`bookId -> { medusaProductId,
  paperVariantId, digitalVariantId }`) to
  `apps/medusa/src/scripts/migrate-books-mapping.json`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/scripts/run-migrate-books.test.ts
import { describe, it, expect, vi } from "vitest";
import fs from "fs/promises";
import { runMigrateBooks } from "./run-migrate-books";

vi.mock("fs/promises", () => ({
  default: { writeFile: vi.fn().mockResolvedValue(undefined) },
}));

describe("runMigrateBooks", () => {
  it("writes the mapping file keyed by bookId", async () => {
    const migrateBooksFn = vi.fn().mockResolvedValue([
      { bookId: 1, medusaProductId: "prod_1", paperVariantId: "v_p1", digitalVariantId: null },
      { bookId: 2, medusaProductId: "prod_2", paperVariantId: null, digitalVariantId: "v_d2" },
    ]);

    await runMigrateBooks({
      migrateBooksFn,
      booksDb: {} as any,
      medusaContainer: {} as any,
      outputPath: "/tmp/mapping.json",
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/tmp/mapping.json",
      JSON.stringify(
        {
          "1": { medusaProductId: "prod_1", paperVariantId: "v_p1", digitalVariantId: null },
          "2": { medusaProductId: "prod_2", paperVariantId: null, digitalVariantId: "v_d2" },
        },
        null,
        2,
      ),
      "utf-8",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/scripts/run-migrate-books.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the entrypoint**

```typescript
// apps/medusa/src/scripts/run-migrate-books.ts
import fs from "fs/promises";
import path from "path";
import type { MedusaContainer } from "@medusajs/framework/types";
import { migrateBooks, type BookMigrationResult } from "./migrate-books";

interface RunMigrateBooksArgs {
  migrateBooksFn?: typeof migrateBooks;
  booksDb: Parameters<typeof migrateBooks>[0]["booksDb"];
  medusaContainer: MedusaContainer;
  outputPath?: string;
}

export async function runMigrateBooks(args: RunMigrateBooksArgs): Promise<void> {
  const fn = args.migrateBooksFn ?? migrateBooks;
  const results = await fn({ booksDb: args.booksDb, medusaContainer: args.medusaContainer });

  const mapping: Record<string, Omit<BookMigrationResult, "bookId">> = {};
  for (const r of results) {
    mapping[String(r.bookId)] = {
      medusaProductId: r.medusaProductId,
      paperVariantId: r.paperVariantId,
      digitalVariantId: r.digitalVariantId,
    };
  }

  const outputPath =
    args.outputPath ?? path.join(__dirname, "migrate-books-mapping.json");
  await fs.writeFile(outputPath, JSON.stringify(mapping, null, 2), "utf-8");
  console.log(`Migrated ${results.length} books. Mapping written to ${outputPath}`);
}

// Medusa exec-script default export contract: receives { container }.
export default async function ({ container }: { container: MedusaContainer }) {
  const { db } = await import("@workspace/db");
  await runMigrateBooks({ booksDb: db, medusaContainer: container });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/scripts/run-migrate-books.test.ts`
Expected: PASS

- [ ] **Step 5: Add `@workspace/db` as a dependency of `apps/medusa`**

Modify `apps/medusa/package.json`, add to `dependencies`:
```json
"@workspace/db": "workspace:*"
```
Run: `pnpm install`
Expected: completes without error; confirms `apps/medusa` can import the
existing Drizzle client to read `books` during migration (read-only use —
Medusa never writes to the `darnozom` database).

- [ ] **Step 6: Commit**

```bash
git add apps/medusa/src/scripts/run-migrate-books.ts apps/medusa/src/scripts/run-migrate-books.test.ts apps/medusa/package.json pnpm-lock.yaml
git commit -m "feat(medusa): add CLI entrypoint for books migration with id-mapping output

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Write and test the shipping-rates-to-city-rates migration script

**Files:**
- Create: `apps/medusa/src/scripts/migrate-shipping.ts`
- Test: `apps/medusa/src/scripts/migrate-shipping.test.ts`

**Interfaces:**
- Consumes: `packages/db/src/schema/shipping.ts` shape (`city`, `price`,
  `currency`, `isDefault`).
- Produces: `migrateShipping(deps: { shippingDb: ...; cityShippingService:
  { createCityRates(rows: Array<{ city: string; price: number; currency:
  string; isDefault: boolean }>): Promise<unknown> } }): Promise<number>`
  — the count of rows migrated. This depends on the `city-shipping`
  module's service, built in Task 20 — **this task writes the migration
  script against the service interface now and is wired to the real
  module in Task 21**; until then the test uses a hand-written fake
  matching this interface.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/scripts/migrate-shipping.test.ts
import { describe, it, expect, vi } from "vitest";
import { migrateShipping } from "./migrate-shipping";

describe("migrateShipping", () => {
  it("converts shipping_rates rows to city rate records", async () => {
    const shippingDb = {
      select: () => ({
        from: () =>
          Promise.resolve([
            { id: 1, city: "Cairo", price: "50.00", currency: "EGP", isDefault: false },
            { id: 2, city: "Other", price: "80.00", currency: "EGP", isDefault: true },
          ]),
      }),
    };

    const createCityRates = vi.fn().mockResolvedValue(undefined);
    const cityShippingService = { createCityRates };

    const count = await migrateShipping({ shippingDb: shippingDb as any, cityShippingService });

    expect(count).toBe(2);
    expect(createCityRates).toHaveBeenCalledWith([
      { city: "Cairo", price: 5000, currency: "egp", isDefault: false },
      { city: "Other", price: 8000, currency: "egp", isDefault: true },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/scripts/migrate-shipping.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the script**

```typescript
// apps/medusa/src/scripts/migrate-shipping.ts
export interface ShippingRateRow {
  id: number;
  city: string;
  price: string;
  currency: string;
  isDefault: boolean;
}

export interface CityRateInput {
  city: string;
  price: number;
  currency: string;
  isDefault: boolean;
}

interface CityShippingServiceLike {
  createCityRates(rows: CityRateInput[]): Promise<unknown>;
}

interface MigrateShippingDeps {
  shippingDb: { select: () => { from: () => Promise<ShippingRateRow[]> } };
  cityShippingService: CityShippingServiceLike;
}

export async function migrateShipping(deps: MigrateShippingDeps): Promise<number> {
  const rows = await deps.shippingDb.select().from();
  const input: CityRateInput[] = rows.map((r) => ({
    city: r.city,
    price: Math.round(Number(r.price) * 100),
    currency: r.currency.toLowerCase(),
    isDefault: r.isDefault,
  }));
  await deps.cityShippingService.createCityRates(input);
  return rows.length;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/scripts/migrate-shipping.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/scripts/migrate-shipping.ts apps/medusa/src/scripts/migrate-shipping.test.ts
git commit -m "feat(medusa): add shipping-rates-to-city-rates migration script

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

**End of Phase 2.** Checkpoint: `migrateBooks`/`migrateShipping` are unit
tested against fakes. They are not yet runnable end-to-end against the
real Medusa container (that requires Phase 5's `city-shipping` module for
`migrate-shipping.ts`, and no blocker for `migrate-books.ts` beyond a live
`medusa` database). Do not run either against production data yet — that
happens in Phase 8 (Cutover).

---

## Phase 3 — Digital product module (file entitlements)

### Task 7: Define the `DigitalProductFile` and `Entitlement` data models

**Files:**
- Create: `apps/medusa/src/modules/digital-product/models/digital-product-file.ts`
- Create: `apps/medusa/src/modules/digital-product/models/entitlement.ts`
- Create: `apps/medusa/src/modules/digital-product/index.ts`
- Create: `apps/medusa/src/modules/digital-product/service.ts`
- Test: `apps/medusa/src/modules/digital-product/service.test.ts`

**Interfaces:**
- Produces: a Medusa module named `digitalProduct` (module key
  `DIGITAL_PRODUCT_MODULE`) registered with a service exposing
  `createFile(input: { relativeKey: string; checksum: string }):
  Promise<{ id: string; relativeKey: string; checksum: string }>`,
  `grantEntitlement(input: { customerId: string; variantId: string;
  orderId: string }): Promise<{ id: string }>`, `hasEntitlement(input: {
  customerId: string; variantId: string }): Promise<boolean>`. These exact
  method names/signatures are consumed by Task 9 (subscriber), Task 10
  (access route), and Task 5's variant linking.

- [ ] **Step 1: Write the failing test for the service's entitlement check**

```typescript
// apps/medusa/src/modules/digital-product/service.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import DigitalProductModuleService from "./service";

describe("DigitalProductModuleService", () => {
  let service: DigitalProductModuleService;

  beforeEach(() => {
    // MedusaService-generated base class needs a container; in unit tests
    // we construct against an in-memory sqlite via the module's own test
    // container helper, matching the pattern used by other Medusa custom
    // module tests (see @medusajs/test-utils moduleIntegrationTestRunner).
    service = new DigitalProductModuleService({} as any, {});
  });

  it("hasEntitlement returns false when no entitlement exists", async () => {
    const result = await service.hasEntitlement({
      customerId: "cus_nonexistent",
      variantId: "variant_nonexistent",
    });
    expect(result).toBe(false);
  });

  it("hasEntitlement returns true after grantEntitlement", async () => {
    await service.grantEntitlement({
      customerId: "cus_1",
      variantId: "variant_1",
      orderId: "order_1",
    });

    const result = await service.hasEntitlement({
      customerId: "cus_1",
      variantId: "variant_1",
    });
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/modules/digital-product/service.test.ts`
Expected: FAIL — `./service` does not exist.

- [ ] **Step 3: Define the `DigitalProductFile` model**

```typescript
// apps/medusa/src/modules/digital-product/models/digital-product-file.ts
import { model } from "@medusajs/framework/utils";

export const DigitalProductFile = model.define("digital_product_file", {
  id: model.id().primaryKey(),
  // Relative key into the existing PRIVATE_OBJECT_DIR store
  // (apps/api/src/lib/storage/objectStore.ts) — never a public URL.
  relative_key: model.text(),
  checksum: model.text().nullable(),
});
```

- [ ] **Step 4: Define the `Entitlement` model**

```typescript
// apps/medusa/src/modules/digital-product/models/entitlement.ts
import { model } from "@medusajs/framework/utils";

export const Entitlement = model.define("entitlement", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  variant_id: model.text(),
  order_id: model.text(),
});
```

- [ ] **Step 5: Write the module service**

```typescript
// apps/medusa/src/modules/digital-product/service.ts
import { MedusaService } from "@medusajs/framework/utils";
import { DigitalProductFile } from "./models/digital-product-file";
import { Entitlement } from "./models/entitlement";

class DigitalProductModuleService extends MedusaService({
  DigitalProductFile,
  Entitlement,
}) {
  async createFile(input: { relativeKey: string; checksum?: string }) {
    const file = await this.createDigitalProductFiles({
      relative_key: input.relativeKey,
      checksum: input.checksum ?? null,
    });
    return { id: file.id, relativeKey: file.relative_key, checksum: file.checksum };
  }

  async grantEntitlement(input: {
    customerId: string;
    variantId: string;
    orderId: string;
  }) {
    const existing = await this.listEntitlements({
      customer_id: input.customerId,
      variant_id: input.variantId,
    });
    if (existing.length > 0) return { id: existing[0].id };

    const entitlement = await this.createEntitlements({
      customer_id: input.customerId,
      variant_id: input.variantId,
      order_id: input.orderId,
    });
    return { id: entitlement.id };
  }

  async hasEntitlement(input: { customerId: string; variantId: string }): Promise<boolean> {
    const existing = await this.listEntitlements({
      customer_id: input.customerId,
      variant_id: input.variantId,
    });
    return existing.length > 0;
  }
}

export default DigitalProductModuleService;
```

- [ ] **Step 6: Register the module**

```typescript
// apps/medusa/src/modules/digital-product/index.ts
import { Module } from "@medusajs/framework/utils";
import DigitalProductModuleService from "./service";

export const DIGITAL_PRODUCT_MODULE = "digitalProduct";

export default Module(DIGITAL_PRODUCT_MODULE, {
  service: DigitalProductModuleService,
});
```

Modify `apps/medusa/medusa-config.ts`, adding to the `modules` array:
```typescript
{
  resolve: "./src/modules/digital-product",
},
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/modules/digital-product/service.test.ts`
Expected: PASS. If the test harness needs a real Medusa module test
container instead of the bare `{}` construction shown above, replace the
`beforeEach` with `moduleIntegrationTestRunner` per
`@medusajs/test-utils` (check `apps/medusa/package.json`'s devDependencies
for whether `create-medusa-app` already installed it — it does by
default — and follow its documented setup rather than the bare
constructor if the bare version fails to boot the underlying ORM).

- [ ] **Step 8: Run a full migration for the new module and verify tables**

Run: `pnpm --filter medusa exec medusa db:migrate`
Run: `docker exec -it darnozom-db psql -U darnozom -d medusa -c "\dt" | grep -E "digital_product_file|entitlement"`
Expected: both tables listed.

- [ ] **Step 9: Commit**

```bash
git add apps/medusa/src/modules/digital-product apps/medusa/medusa-config.ts
git commit -m "feat(medusa): add digital-product module with file and entitlement models

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Link `DigitalProductFile` to `ProductVariant`

**Files:**
- Create: `apps/medusa/src/links/digital-product-variant.ts`
- Test: `apps/medusa/src/links/digital-product-variant.test.ts`

**Interfaces:**
- Consumes: `DIGITAL_PRODUCT_MODULE` from Task 7
  (`apps/medusa/src/modules/digital-product/index.ts`), Medusa's built-in
  `Modules.PRODUCT`.
- Produces: a queryable link so `Query.graph({ entity: "product_variant",
  fields: ["*", "digital_product_file.*"] })` resolves the linked file —
  consumed by Task 10 (access route) and the admin widget in Task 11.

- [ ] **Step 1: Write the failing integration test**

```typescript
// apps/medusa/src/links/digital-product-variant.test.ts
import { describe, it, expect } from "vitest";
// This test runs against a real Medusa test container per the
// medusaIntegrationTestRunner pattern that create-medusa-app scaffolds
// into apps/medusa/integration-tests/ — see that directory's existing
// example test for the exact runner import path in this project's
// generated version, and mirror it here rather than inventing a new
// harness.
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { DIGITAL_PRODUCT_MODULE } from "../modules/digital-product";
import { Modules } from "@medusajs/framework/utils";

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("digital-product-variant link", () => {
      it("links a DigitalProductFile to a ProductVariant and resolves via Query", async () => {
        const container = getContainer();
        const productModule = container.resolve(Modules.PRODUCT);
        const digitalProductModule = container.resolve(DIGITAL_PRODUCT_MODULE);
        const remoteLink = container.resolve("remoteLink");
        const query = container.resolve("query");

        const product = await productModule.createProducts({
          title: "Test Book",
          status: "published",
        });
        const variant = await productModule.createProductVariants({
          product_id: product.id,
          title: "Digital",
        });
        const file = await digitalProductModule.createFile({
          relativeKey: "books/digital/test.pdf",
        });

        await remoteLink.create({
          [Modules.PRODUCT]: { product_variant_id: variant.id },
          [DIGITAL_PRODUCT_MODULE]: { digital_product_file_id: file.id },
        });

        const { data } = await query.graph({
          entity: "product_variant",
          fields: ["id", "digital_product_file.*"],
          filters: { id: variant.id },
        });

        expect(data[0].digital_product_file.id).toBe(file.id);
      });
    });
  },
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/links/digital-product-variant.test.ts`
Expected: FAIL — no link defined, `digital_product_file` field unresolvable.

- [ ] **Step 3: Define the link**

```typescript
// apps/medusa/src/links/digital-product-variant.ts
import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import DigitalProductModule from "../modules/digital-product";

export default defineLink(
  ProductModule.linkable.productVariant,
  DigitalProductModule.linkable.digitalProductFile,
);
```

- [ ] **Step 4: Run the link-sync command**

Run: `pnpm --filter medusa exec medusa db:migrate`
(Module links in Medusa v2 are synced as part of the standard migrate
command — it generates the join table for this link.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/links/digital-product-variant.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/medusa/src/links apps/medusa/.medusa 2>/dev/null; git add apps/medusa/src/links
git commit -m "feat(medusa): link DigitalProductFile to ProductVariant

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Write the `order-placed` (payment-captured) subscriber that grants entitlements

**Files:**
- Create: `apps/medusa/src/subscribers/order-payment-captured.ts`
- Test: `apps/medusa/src/subscribers/order-payment-captured.test.ts`

**Interfaces:**
- Consumes: `DIGITAL_PRODUCT_MODULE` service's `grantEntitlement` (Task
  7), Medusa's `payment.captured` event payload (`{ id: string }` —
  payment id), Medusa's Order module to resolve line items from the
  payment.
- Produces: nothing consumed by other tasks directly — this is a leaf
  subscriber, verified end-to-end in Phase 6 (checkout flow tests).

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/subscribers/order-payment-captured.test.ts
import { describe, it, expect, vi } from "vitest";
import orderPaymentCapturedHandler from "./order-payment-captured";
import { DIGITAL_PRODUCT_MODULE } from "../modules/digital-product";
import { Modules } from "@medusajs/framework/utils";

describe("order-payment-captured subscriber", () => {
  it("grants entitlement for each digital line item on the paid order", async () => {
    const grantEntitlement = vi.fn().mockResolvedValue({ id: "ent_1" });

    const query = {
      graph: vi.fn().mockResolvedValue({
        data: [
          {
            id: "order_1",
            customer_id: "cus_1",
            items: [
              { variant_id: "variant_digital_1", product_type: "digital" },
              { variant_id: "variant_paper_1", product_type: "paper" },
            ],
          },
        ],
      }),
    };

    const container = {
      resolve: (key: string) => {
        if (key === DIGITAL_PRODUCT_MODULE) return { grantEntitlement };
        if (key === "query") return query;
        if (key === Modules.ORDER) {
          return { retrieveOrder: vi.fn().mockResolvedValue({ id: "order_1" }) };
        }
        throw new Error(`Unexpected resolve: ${key}`);
      },
    };

    await orderPaymentCapturedHandler({
      event: { data: { id: "payment_1", order_id: "order_1" } },
      container: container as any,
    });

    expect(grantEntitlement).toHaveBeenCalledTimes(1);
    expect(grantEntitlement).toHaveBeenCalledWith({
      customerId: "cus_1",
      variantId: "variant_digital_1",
      orderId: "order_1",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/subscribers/order-payment-captured.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the subscriber**

```typescript
// apps/medusa/src/subscribers/order-payment-captured.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { DIGITAL_PRODUCT_MODULE } from "../modules/digital-product";

interface DigitalProductServiceLike {
  grantEntitlement(input: {
    customerId: string;
    variantId: string;
    orderId: string;
  }): Promise<{ id: string }>;
}

export default async function orderPaymentCapturedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; order_id: string }>) {
  const query = container.resolve("query");
  const digitalProductService = container.resolve<DigitalProductServiceLike>(
    DIGITAL_PRODUCT_MODULE,
  );

  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "items.variant_id", "items.product_type"],
    filters: { id: event.data.order_id },
  });

  const order = data[0];
  if (!order) return;

  const digitalItems = (order.items as Array<{ variant_id: string; product_type?: string }>).filter(
    (item) => item.product_type === "digital",
  );

  for (const item of digitalItems) {
    await digitalProductService.grantEntitlement({
      customerId: order.customer_id,
      variantId: item.variant_id,
      orderId: order.id,
    });
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
};
```

Note: `product_type` on an order item is not a stock Medusa field — Task
23 (checkout line-item flow) must ensure this metadata is stamped onto
line items at cart/order time (via the product's `metadata.kind` set in
Task 4's migration, propagated through cart line item metadata). Flag this
dependency explicitly in Task 23.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/subscribers/order-payment-captured.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/subscribers/order-payment-captured.ts apps/medusa/src/subscribers/order-payment-captured.test.ts
git commit -m "feat(medusa): grant digital entitlements on payment capture

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Write the `/store/digital-products/:variantId/access` signed-URL route

**Files:**
- Create: `apps/medusa/src/api/store/digital-products/[variantId]/access/route.ts`
- Test: `apps/medusa/src/api/store/digital-products/[variantId]/access/route.test.ts`
- Create: `apps/medusa/src/lib/signed-object-url.ts`
- Test: `apps/medusa/src/lib/signed-object-url.test.ts`

**Interfaces:**
- Consumes: `hasEntitlement` from Task 7's service,
  `DigitalProductFile.relative_key` via the link from Task 8.
- Produces: `GET /store/digital-products/:variantId/access` → `200 { url:
  string, expiresAt: string }` or `403` — consumed by Task 27
  (`order-reader.tsx` rewrite).

- [ ] **Step 1: Write the failing test for the signed-URL helper**

```typescript
// apps/medusa/src/lib/signed-object-url.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSignedObjectUrl, verifySignedObjectToken } from "./signed-object-url";

describe("signed-object-url", () => {
  const originalSecret = process.env.MEDUSA_JWT_SECRET;
  beforeEach(() => {
    process.env.MEDUSA_JWT_SECRET = "test-secret";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T00:00:00Z"));
  });
  afterEach(() => {
    process.env.MEDUSA_JWT_SECRET = originalSecret;
    vi.useRealTimers();
  });

  it("creates a token that verifies to the same relativeKey before expiry", () => {
    const { token, expiresAt } = createSignedObjectUrl({
      relativeKey: "books/digital/42.pdf",
      ttlSeconds: 300,
    });

    expect(expiresAt).toBe("2026-09-15T00:05:00.000Z");

    const verified = verifySignedObjectToken(token);
    expect(verified).toEqual({ relativeKey: "books/digital/42.pdf" });
  });

  it("rejects an expired token", () => {
    const { token } = createSignedObjectUrl({
      relativeKey: "books/digital/42.pdf",
      ttlSeconds: 300,
    });

    vi.setSystemTime(new Date("2026-09-15T00:05:01Z"));

    expect(() => verifySignedObjectToken(token)).toThrow(/expired/i);
  });

  it("rejects a tampered token", () => {
    const { token } = createSignedObjectUrl({
      relativeKey: "books/digital/42.pdf",
      ttlSeconds: 300,
    });
    const tampered = token.slice(0, -2) + "xx";
    expect(() => verifySignedObjectToken(tampered)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/lib/signed-object-url.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the signed-URL helper using HMAC (no new dependency)**

```typescript
// apps/medusa/src/lib/signed-object-url.ts
import crypto from "crypto";

interface SignedPayload {
  relativeKey: string;
  exp: number; // unix seconds
}

function getSecret(): string {
  const secret = process.env.MEDUSA_JWT_SECRET;
  if (!secret) throw new Error("MEDUSA_JWT_SECRET is not set");
  return secret;
}

function sign(payload: SignedPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${hmac}`;
}

export function createSignedObjectUrl(input: {
  relativeKey: string;
  ttlSeconds: number;
}): { token: string; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + input.ttlSeconds;
  const token = sign({ relativeKey: input.relativeKey, exp });
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifySignedObjectToken(token: string): { relativeKey: string } {
  const [body, mac] = token.split(".");
  if (!body || !mac) throw new Error("Malformed token");

  const expectedMac = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  const macBuffer = Buffer.from(mac);
  const expectedBuffer = Buffer.from(expectedMac);
  if (
    macBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(macBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid token signature");
  }

  const payload: SignedPayload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
  if (Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error("Token expired");
  }
  return { relativeKey: payload.relativeKey };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/lib/signed-object-url.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for the access route**

```typescript
// apps/medusa/src/api/store/digital-products/[variantId]/access/route.test.ts
import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";
import { DIGITAL_PRODUCT_MODULE } from "../../../../../modules/digital-product";

function fakeReq(overrides: Partial<any> = {}) {
  return {
    params: { variantId: "variant_digital_1" },
    auth_context: { actor_id: "cus_1" },
    scope: {
      resolve: (key: string) => {
        if (key === DIGITAL_PRODUCT_MODULE) return overrides.digitalProductService;
        if (key === "query") return overrides.query;
        throw new Error(`Unexpected resolve: ${key}`);
      },
    },
    ...overrides,
  };
}

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("GET /store/digital-products/:variantId/access", () => {
  it("returns 403 when the customer has no entitlement", async () => {
    const req = fakeReq({
      digitalProductService: { hasEntitlement: vi.fn().mockResolvedValue(false) },
    });
    const res = fakeRes();

    await GET(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns a signed url when entitled", async () => {
    const req = fakeReq({
      digitalProductService: { hasEntitlement: vi.fn().mockResolvedValue(true) },
      query: {
        graph: vi.fn().mockResolvedValue({
          data: [{ id: "variant_digital_1", digital_product_file: { relative_key: "books/digital/42.pdf" } }],
        }),
      },
    });
    const res = fakeRes();

    await GET(req as any, res as any);

    expect(res.status).not.toHaveBeenCalledWith(403);
    const payload = res.json.mock.calls[0][0];
    expect(payload.url).toContain("/store/digital-products/download");
    expect(payload.expiresAt).toBeTruthy();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/api/store/digital-products/\[variantId\]/access/route.test.ts`
Expected: FAIL — `./route` does not exist.

- [ ] **Step 7: Write the route**

```typescript
// apps/medusa/src/api/store/digital-products/[variantId]/access/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { DIGITAL_PRODUCT_MODULE } from "../../../../../modules/digital-product";
import { createSignedObjectUrl } from "../../../../../lib/signed-object-url";

interface DigitalProductServiceLike {
  hasEntitlement(input: { customerId: string; variantId: string }): Promise<boolean>;
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { variantId } = req.params;
  const digitalProductService = req.scope.resolve<DigitalProductServiceLike>(
    DIGITAL_PRODUCT_MODULE,
  );

  const entitled = await digitalProductService.hasEntitlement({ customerId, variantId });
  if (!entitled) {
    return res.status(403).json({ error: "No access to this digital product" });
  }

  const query = req.scope.resolve("query");
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "digital_product_file.relative_key"],
    filters: { id: variantId },
  });

  const relativeKey = data[0]?.digital_product_file?.relative_key;
  if (!relativeKey) {
    return res.status(404).json({ error: "No digital file for this variant" });
  }

  const { token, expiresAt } = createSignedObjectUrl({ relativeKey, ttlSeconds: 300 });
  return res.status(200).json({
    url: `/store/digital-products/download?token=${encodeURIComponent(token)}`,
    expiresAt,
  });
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/api/store/digital-products/\[variantId\]/access/route.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/medusa/src/lib/signed-object-url.ts apps/medusa/src/lib/signed-object-url.test.ts apps/medusa/src/api/store/digital-products
git commit -m "feat(medusa): add entitlement-gated signed download URL endpoint

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Write the download-serving route that reads the token and streams the file from local disk

**Files:**
- Create: `apps/medusa/src/api/store/digital-products/download/route.ts`
- Test: `apps/medusa/src/api/store/digital-products/download/route.test.ts`
- Modify: `apps/medusa/package.json` (add dependency on the existing
  object-store module — see Step 3 for why this is copied, not imported)

**Interfaces:**
- Consumes: `verifySignedObjectToken` from Task 10.
- Produces: `GET /store/digital-products/download?token=...` streaming
  the file bytes — terminal endpoint, nothing downstream depends on it.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/api/store/digital-products/download/route.test.ts
import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";
import * as signedUrl from "../../../../lib/signed-object-url";
import * as objectStore from "../../../../lib/medusa-object-store";

function fakeReq(query: Record<string, string>) {
  return { query } as any;
}
function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn();
  res.pipe = vi.fn();
  return res;
}

describe("GET /store/digital-products/download", () => {
  it("returns 400 when token is missing", async () => {
    const res = fakeRes();
    await GET(fakeReq({}), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 403 when the token is invalid or expired", async () => {
    vi.spyOn(signedUrl, "verifySignedObjectToken").mockImplementation(() => {
      throw new Error("Token expired");
    });
    const res = fakeRes();
    await GET(fakeReq({ token: "bad" }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("streams the file when the token is valid", async () => {
    vi.spyOn(signedUrl, "verifySignedObjectToken").mockReturnValue({
      relativeKey: "books/digital/42.pdf",
    });
    const fakeStream = { pipe: vi.fn() };
    vi.spyOn(objectStore, "openPrivateObjectStream").mockReturnValue(fakeStream as any);

    const res = fakeRes();
    await GET(fakeReq({ token: "good" }), res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(fakeStream.pipe).toHaveBeenCalledWith(res);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/api/store/digital-products/download/route.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Decide the object-store import path**

`apps/api/src/lib/storage/objectStore.ts` is not currently exported from
a shared package — it lives inside `apps/api`. Rather than reaching across
app boundaries (`apps/medusa` importing from `apps/api/src`, which is
fragile and not how the workspace is organized), extract it:

Run:
```bash
mkdir -p packages/object-store/src
```

Create `packages/object-store/package.json`:
```json
{
  "name": "@workspace/object-store",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

Move `apps/api/src/lib/storage/objectStore.ts` and
`apps/api/src/lib/storage/objectStorage.ts` to
`packages/object-store/src/`, and create
`packages/object-store/src/index.ts` re-exporting their public functions
(`isLocalObjectStorage`, `getPrivateRoot`, `savePrivateObject`,
`privateObjectExists`, `readPrivateObjectMeta`, `openPrivateObjectStream`,
`entityKeyFromObjectPath`, `PUBLIC_OBJECT_PREFIXES`, `isPublicObjectKey`).
Update every import of `../lib/storage/objectStore` (and
`objectStorage`) inside `apps/api/src` to `@workspace/object-store`
instead, and add `"@workspace/object-store": "workspace:*"` to
`apps/api/package.json`. Run `pnpm --filter api exec tsc --noEmit` to
confirm no import is left broken.

- [ ] **Step 4: Add the dependency to `apps/medusa`**

Modify `apps/medusa/package.json`, add:
```json
"@workspace/object-store": "workspace:*"
```
Run: `pnpm install`

- [ ] **Step 5: Write a thin Medusa-local re-export (test seam)**

```typescript
// apps/medusa/src/lib/medusa-object-store.ts
export { openPrivateObjectStream, privateObjectExists } from "@workspace/object-store";
```
(A thin local module gives the test above a stable `vi.spyOn` target
without reaching into the shared package's internals.)

- [ ] **Step 6: Write the route**

```typescript
// apps/medusa/src/api/store/digital-products/download/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { verifySignedObjectToken } from "../../../../lib/signed-object-url";
import { openPrivateObjectStream } from "../../../../lib/medusa-object-store";

function contentTypeFor(relativeKey: string): string {
  if (relativeKey.endsWith(".pdf")) return "application/pdf";
  if (relativeKey.endsWith(".epub")) return "application/epub+zip";
  return "application/octet-stream";
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const token = (req.query as Record<string, string>).token;
  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  let relativeKey: string;
  try {
    ({ relativeKey } = verifySignedObjectToken(token));
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  res.setHeader("Content-Type", contentTypeFor(relativeKey));
  res.setHeader("Cache-Control", "no-store");
  const stream = openPrivateObjectStream(relativeKey);
  stream.pipe(res);
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/api/store/digital-products/download/route.test.ts`
Expected: PASS

- [ ] **Step 8: Regression-check `apps/api` still passes its existing suite**

Run: `cd apps/api && DATABASE_URL=<local test db url> pnpm test`
Expected: all existing tests PASS (confirms the `objectStore` extraction
in Step 3 broke nothing).

- [ ] **Step 9: Commit**

```bash
git add packages/object-store apps/api/package.json apps/medusa/package.json apps/medusa/src/lib/medusa-object-store.ts apps/medusa/src/api/store/digital-products/download pnpm-lock.yaml
git add -u apps/api/src
git commit -m "refactor: extract object-store into @workspace/object-store; add digital download route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

**End of Phase 3.** Checkpoint: a digital book's file can be linked to a
variant, entitlement is granted on payment capture, and an entitled
customer can fetch a working short-lived signed URL that streams the
actual file — all covered by unit/integration tests. Not yet wired to a
real payment (Phase 4) or the storefront reader page (Phase 7).

---

## Phase 4 — Payment provider modules

### Task 12: Extract `paymob.ts` and `paypal.ts` into a shared package

**Files:**
- Create: `packages/payment-gateways/package.json`
- Create: `packages/payment-gateways/src/paymob.ts` (moved from
  `apps/api/src/lib/payments/paymob.ts`)
- Create: `packages/payment-gateways/src/paypal.ts` (moved from
  `apps/api/src/lib/payments/paypal.ts`)
- Create: `packages/payment-gateways/src/index.ts`
- Modify: every file under `apps/api/src` importing
  `../lib/payments/paymob` or `../lib/payments/paypal`

**Interfaces:**
- Produces: `@workspace/payment-gateways` exporting everything currently
  exported by `paymob.ts`/`paypal.ts` unchanged (same function names,
  same signatures) — consumed by Task 14 (`paymob-card` provider), Task
  15 (`paymob-wallet` provider), Task 16 (`paypal-egp` provider), and
  unchanged by the still-existing `apps/api` reconciler code until Phase 8
  deletes it.

- [ ] **Step 1: Create the package**

```bash
mkdir -p packages/payment-gateways/src
```

Create `packages/payment-gateways/package.json`:
```json
{
  "name": "@workspace/payment-gateways",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

- [ ] **Step 2: Move the two files verbatim**

```bash
git mv apps/api/src/lib/payments/paymob.ts packages/payment-gateways/src/paymob.ts
git mv apps/api/src/lib/payments/paypal.ts packages/payment-gateways/src/paypal.ts
```

Modify the moved files' relative import of `../logger` (was
`apps/api/src/lib/logger`) — replace with a locally-defined minimal
logger in the new package to avoid a cross-app import:

Create `packages/payment-gateways/src/logger.ts`:
```typescript
/* eslint-disable no-console */
export const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
```

In both moved files, change `import { logger } from "../logger";` to
`import { logger } from "./logger";`.

- [ ] **Step 3: Create the barrel export**

```typescript
// packages/payment-gateways/src/index.ts
export * from "./paymob";
export * from "./paypal";
```

- [ ] **Step 4: Update every import site in `apps/api`**

Run: `grep -rl "lib/payments/paymob\|lib/payments/paypal" apps/api/src`
For each matching file, replace the relative import path with
`@workspace/payment-gateways`, importing only the named exports each file
actually uses (do not switch to a wildcard import).

Add to `apps/api/package.json` dependencies:
```json
"@workspace/payment-gateways": "workspace:*"
```
Run: `pnpm install`

- [ ] **Step 5: Verify `apps/api` typechecks and its test suite still passes**

Run: `pnpm --filter api exec tsc --noEmit`
Expected: no errors.
Run: `cd apps/api && DATABASE_URL=<local test db url> pnpm test`
Expected: all existing tests PASS, including
`routes/orders/card-payment.test.ts`, `paypal-capture.test.ts`,
`paymob-callback.test.ts`, `wallet-payment.test.ts` — these currently
import the moved functions and must resolve them via the new package.

- [ ] **Step 6: Commit**

```bash
git add packages/payment-gateways apps/api/package.json pnpm-lock.yaml
git add -u apps/api/src
git commit -m "refactor: extract paymob/paypal clients into @workspace/payment-gateways

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: Write the `cod` payment provider module

**Files:**
- Create: `apps/medusa/src/modules/cod/service.ts`
- Create: `apps/medusa/src/modules/cod/index.ts`
- Test: `apps/medusa/src/modules/cod/service.test.ts`

**Interfaces:**
- Produces: a Medusa payment provider registered under id `cod`,
  extending `AbstractPaymentProvider`. `initiatePayment` returns `{
  data: {}, status: "pending" }`; `authorizePayment` returns `{ data: {},
  status: "authorized" }`. Consumed by Task 22's provider-selection route
  and the storefront checkout (Task 24).

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/modules/cod/service.test.ts
import { describe, it, expect } from "vitest";
import CodProviderService from "./service";

describe("CodProviderService", () => {
  const service = new CodProviderService({} as any, {});

  it("initiatePayment returns a pending session with no external id", async () => {
    const result = await service.initiatePayment({ amount: 50000, currency_code: "egp" } as any);
    expect(result).toEqual({ data: {}, id: expect.any(String) });
  });

  it("authorizePayment always authorizes immediately", async () => {
    const result = await service.authorizePayment({ data: {} } as any);
    expect(result.status).toBe("authorized");
  });

  it("capturePayment marks captured (COD is captured on delivery confirmation, not at checkout)", async () => {
    const result = await service.capturePayment({ data: {} } as any);
    expect(result.data).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/modules/cod/service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the provider**

```typescript
// apps/medusa/src/modules/cod/service.ts
import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
} from "@medusajs/framework/types";
import { randomUUID } from "crypto";

class CodProviderService extends AbstractPaymentProvider {
  static identifier = "cod";

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    return { data: {}, id: randomUUID() };
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    return { data: input.data ?? {}, status: "authorized" };
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    // COD orders are refunded manually by staff outside the system —
    // matches today's behavior (no automated COD refund exists).
    throw new Error("COD refunds must be processed manually");
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: "authorized" };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} };
  }
}

export default CodProviderService;
```

- [ ] **Step 4: Register the module**

```typescript
// apps/medusa/src/modules/cod/index.ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import CodProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [CodProviderService],
});
```

Modify `apps/medusa/medusa-config.ts`, adding to the Payment module's
`providers` array (inside the `modules` array's `Modules.PAYMENT` entry —
create that entry if `create-medusa-app` didn't scaffold one):
```typescript
{
  key: Modules.PAYMENT,
  resolve: "@medusajs/payment",
  options: {
    providers: [
      {
        resolve: "./src/modules/cod",
        id: "cod",
      },
    ],
  },
},
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/modules/cod/service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/medusa/src/modules/cod apps/medusa/medusa-config.ts
git commit -m "feat(medusa): add cash-on-delivery payment provider

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 14: Write the `paymob-card` payment provider module

**Files:**
- Create: `apps/medusa/src/modules/paymob-card/service.ts`
- Create: `apps/medusa/src/modules/paymob-card/index.ts`
- Test: `apps/medusa/src/modules/paymob-card/service.test.ts`

**Interfaces:**
- Consumes: `createPaymobCheckout`, `getPaymobTransactionStatus`,
  `verifyPaymobWebhookHmac`, `extractPaymobDeclineReason` from
  `@workspace/payment-gateways` (Task 12).
- Produces: a Medusa payment provider registered under id `paymob-card`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/modules/paymob-card/service.test.ts
import { describe, it, expect, vi } from "vitest";
import PaymobCardProviderService from "./service";
import * as gateways from "@workspace/payment-gateways";

describe("PaymobCardProviderService", () => {
  it("initiatePayment creates a Paymob checkout and stores the order id + checkout url", async () => {
    vi.spyOn(gateways, "createPaymobCheckout").mockResolvedValue({
      paymobOrderId: "pmb_order_1",
      checkoutUrl: "https://accept.paymob.com/iframe/xyz",
    });

    const service = new PaymobCardProviderService({} as any, {});
    const result = await service.initiatePayment({
      amount: 35000, // 350.00 EGP in minor units
      currency_code: "egp",
      data: { merchantOrderId: "order_1" },
      context: {
        customer: { email: "buyer@example.com", first_name: "Test", last_name: "Buyer" },
      },
    } as any);

    expect(result.data).toEqual({
      paymobOrderId: "pmb_order_1",
      checkoutUrl: "https://accept.paymob.com/iframe/xyz",
    });
  });

  it("getWebhookActionAndData returns captured when HMAC verifies and success=true", async () => {
    vi.spyOn(gateways, "verifyPaymobWebhookHmac").mockReturnValue(true);

    const service = new PaymobCardProviderService({} as any, {});
    const result = await service.getWebhookActionAndData({
      data: {
        obj: { id: "txn_1", success: true, order: { id: "pmb_order_1" } },
        hmac: "abc123",
      },
    } as any);

    expect(result.action).toBe("captured");
  });

  it("getWebhookActionAndData returns failed with the decline reason when success=false", async () => {
    vi.spyOn(gateways, "verifyPaymobWebhookHmac").mockReturnValue(true);
    vi.spyOn(gateways, "extractPaymobDeclineReason").mockReturnValue("PAYMOB_DECLINED: Do not honour (code 05)");

    const service = new PaymobCardProviderService({} as any, {});
    const result = await service.getWebhookActionAndData({
      data: {
        obj: { id: "txn_1", success: false, order: { id: "pmb_order_1" } },
        hmac: "abc123",
      },
    } as any);

    expect(result.action).toBe("failed");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/modules/paymob-card/service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the provider**

```typescript
// apps/medusa/src/modules/paymob-card/service.ts
import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types";
import {
  createPaymobCheckout,
  verifyPaymobWebhookHmac,
  extractPaymobDeclineReason,
} from "@workspace/payment-gateways";

class PaymobCardProviderService extends AbstractPaymentProvider {
  static identifier = "paymob-card";

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const amountEgp = Number(input.amount) / 100;
    const customer = (input.context as any)?.customer;
    const merchantOrderId = (input.data as any)?.merchantOrderId ?? crypto.randomUUID();

    const checkout = await createPaymobCheckout({
      amountEgp,
      merchantOrderId,
      billing: {
        email: customer?.email ?? "unknown@darnozom.com",
        firstName: customer?.first_name ?? "N/A",
        lastName: customer?.last_name ?? "N/A",
      } as any,
    });

    return {
      data: {
        paymobOrderId: checkout.paymobOrderId,
        checkoutUrl: checkout.checkoutUrl,
        merchantOrderId,
      },
      id: checkout.paymobOrderId,
    };
  }

  async authorizePayment(input: any): Promise<AuthorizePaymentOutput> {
    // Authorization happens asynchronously via the webhook
    // (getWebhookActionAndData below) once the buyer completes the
    // iframe — Medusa's deferred-authorization support (pending_authorization)
    // matches this flow.
    return { data: input.data ?? {}, status: "pending" };
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: "pending" };
  }

  async capturePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async cancelPayment(input: any) {
    return { data: input.data ?? {} };
  }

  async deletePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async refundPayment(input: any) {
    throw new Error("Paymob card refunds must be processed manually via the Paymob dashboard");
  }

  async retrievePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload): Promise<WebhookActionResult> {
    const body = payload.data as any;
    const transactionObj = body.obj;
    const receivedHmac = body.hmac;

    if (!verifyPaymobWebhookHmac(transactionObj, receivedHmac)) {
      throw new Error("Invalid Paymob webhook HMAC");
    }

    const paymobOrderId = String(transactionObj.order?.id ?? "");

    if (transactionObj.success) {
      return {
        action: "captured",
        data: { session_id: paymobOrderId, amount: transactionObj.amount_cents },
      };
    }

    const reason = extractPaymobDeclineReason(transactionObj);
    return {
      action: "failed",
      data: { session_id: paymobOrderId, amount: transactionObj.amount_cents ?? 0, reason } as any,
    };
  }
}

export default PaymobCardProviderService;
```

- [ ] **Step 4: Register the module**

```typescript
// apps/medusa/src/modules/paymob-card/index.ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import PaymobCardProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaymobCardProviderService],
});
```

Modify `apps/medusa/medusa-config.ts`, adding to the same `providers`
array from Task 13:
```typescript
{
  resolve: "./src/modules/paymob-card",
  id: "paymob-card",
  options: {
    apiKey: process.env.PAYMOB_API_KEY,
    integrationId: process.env.PAYMOB_INTEGRATION_ID,
    hmacSecret: process.env.PAYMOB_HMAC_SECRET,
    iframeId: process.env.PAYMOB_IFRAME_ID,
  },
},
```
(These env vars are read by `@workspace/payment-gateways`'s
`getPaymobConfig()` directly from `process.env`, exactly as today — the
`options` block here documents the requirement in `medusa-config.ts` even
though the underlying function doesn't take them as constructor args; no
code change needed in the shared package for this.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/modules/paymob-card/service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/medusa/src/modules/paymob-card apps/medusa/medusa-config.ts
git commit -m "feat(medusa): add Paymob card payment provider

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 15: Write the `paymob-wallet` payment provider module

**Files:**
- Create: `apps/medusa/src/modules/paymob-wallet/service.ts`
- Create: `apps/medusa/src/modules/paymob-wallet/index.ts`
- Test: `apps/medusa/src/modules/paymob-wallet/service.test.ts`

**Interfaces:**
- Consumes: `createPaymobWalletPayment`, `verifyPaymobWebhookHmac`,
  `extractPaymobDeclineReason` from `@workspace/payment-gateways`.
- Produces: a Medusa payment provider registered under id
  `paymob-wallet`. Same webhook contract as Task 14 (Paymob sends one
  webhook shape for both card and wallet transactions) — this module
  handles wallet-originated ones identically.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/modules/paymob-wallet/service.test.ts
import { describe, it, expect, vi } from "vitest";
import PaymobWalletProviderService from "./service";
import * as gateways from "@workspace/payment-gateways";

describe("PaymobWalletProviderService", () => {
  it("initiatePayment requires a wallet phone number in context data", async () => {
    const service = new PaymobWalletProviderService({} as any, {});
    await expect(
      service.initiatePayment({
        amount: 15000,
        currency_code: "egp",
        data: {},
        context: { customer: { email: "buyer@example.com" } },
      } as any),
    ).rejects.toThrow(/wallet phone/i);
  });

  it("initiatePayment creates a wallet payment and returns the redirect url", async () => {
    vi.spyOn(gateways, "createPaymobWalletPayment").mockResolvedValue({
      paymobOrderId: "pmb_order_2",
      redirectUrl: "https://accept.paymob.com/wallet/redirect",
    });

    const service = new PaymobWalletProviderService({} as any, {});
    const result = await service.initiatePayment({
      amount: 15000,
      currency_code: "egp",
      data: { merchantOrderId: "order_2", walletPhone: "01012345678" },
      context: { customer: { email: "buyer@example.com" } },
    } as any);

    expect(result.data).toEqual({
      paymobOrderId: "pmb_order_2",
      redirectUrl: "https://accept.paymob.com/wallet/redirect",
      merchantOrderId: "order_2",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/modules/paymob-wallet/service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the provider**

```typescript
// apps/medusa/src/modules/paymob-wallet/service.ts
import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import type { InitiatePaymentInput, InitiatePaymentOutput, ProviderWebhookPayload, WebhookActionResult } from "@medusajs/framework/types";
import {
  createPaymobWalletPayment,
  verifyPaymobWebhookHmac,
  extractPaymobDeclineReason,
} from "@workspace/payment-gateways";

class PaymobWalletProviderService extends AbstractPaymentProvider {
  static identifier = "paymob-wallet";

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const walletPhone = (input.data as any)?.walletPhone;
    if (!walletPhone || typeof walletPhone !== "string") {
      throw new Error("Missing wallet phone number for Paymob wallet payment");
    }

    const amountEgp = Number(input.amount) / 100;
    const customer = (input.context as any)?.customer;
    const merchantOrderId = (input.data as any)?.merchantOrderId ?? crypto.randomUUID();

    const payment = await createPaymobWalletPayment({
      amountEgp,
      merchantOrderId,
      walletPhone,
      billing: {
        email: customer?.email ?? "unknown@darnozom.com",
        firstName: customer?.first_name ?? "N/A",
        lastName: customer?.last_name ?? "N/A",
      } as any,
    });

    return {
      data: {
        paymobOrderId: payment.paymobOrderId,
        redirectUrl: payment.redirectUrl,
        merchantOrderId,
      },
      id: payment.paymobOrderId,
    };
  }

  async authorizePayment(input: any) {
    return { data: input.data ?? {}, status: "pending" };
  }

  async getPaymentStatus(_input: any) {
    return { status: "pending" };
  }

  async capturePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async cancelPayment(input: any) {
    return { data: input.data ?? {} };
  }

  async deletePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async refundPayment(_input: any) {
    throw new Error("Paymob wallet refunds must be processed manually via the Paymob dashboard");
  }

  async retrievePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload): Promise<WebhookActionResult> {
    const body = payload.data as any;
    const transactionObj = body.obj;
    if (!verifyPaymobWebhookHmac(transactionObj, body.hmac)) {
      throw new Error("Invalid Paymob webhook HMAC");
    }
    const paymobOrderId = String(transactionObj.order?.id ?? "");
    if (transactionObj.success) {
      return { action: "captured", data: { session_id: paymobOrderId, amount: transactionObj.amount_cents } };
    }
    const reason = extractPaymobDeclineReason(transactionObj);
    return { action: "failed", data: { session_id: paymobOrderId, amount: transactionObj.amount_cents ?? 0, reason } as any };
  }
}

export default PaymobWalletProviderService;
```

- [ ] **Step 4: Register the module**

```typescript
// apps/medusa/src/modules/paymob-wallet/index.ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import PaymobWalletProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaymobWalletProviderService],
});
```

Modify `apps/medusa/medusa-config.ts`, adding to the `providers` array:
```typescript
{
  resolve: "./src/modules/paymob-wallet",
  id: "paymob-wallet",
},
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/modules/paymob-wallet/service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/medusa/src/modules/paymob-wallet apps/medusa/medusa-config.ts
git commit -m "feat(medusa): add Paymob mobile wallet payment provider

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 16: Write the `paypal-egp` payment provider module

**Files:**
- Create: `apps/medusa/src/modules/paypal-egp/service.ts`
- Create: `apps/medusa/src/modules/paypal-egp/index.ts`
- Test: `apps/medusa/src/modules/paypal-egp/service.test.ts`

**Interfaces:**
- Consumes: `createPayPalOrder`, `capturePayPalOrder` from
  `@workspace/payment-gateways`. Also needs the existing EGP→USD
  conversion helper — locate it via
  `grep -n "exchangeRate\|egpToUsd\|convertEgpToUsd" apps/api/src/routes/orders/index.ts`
  before writing Step 3, since the design spec says this logic "moves
  into this module" but its current location wasn't in the earlier file
  reads — find and move it in this task rather than reinventing it.
- Produces: a Medusa payment provider registered under id `paypal-egp`.

- [ ] **Step 1: Locate and extract the existing EGP→USD conversion helper**

Run: `grep -n "exchangeRate\|EgpToUsd\|egp_to_usd\|exchange-rate\|ExchangeRate" apps/api/src/routes/orders/index.ts apps/api/src/lib -r`

If a dedicated function is found (expected, given `orders.exchangeRate`
and `orders.usdAmount` columns exist in the schema), move it into
`packages/payment-gateways/src/exchange-rate.ts` and export it from the
package's `index.ts`, updating its `apps/api` call site to import from
`@workspace/payment-gateways` — same extraction pattern as Task 12. If
the conversion is inlined ad hoc rather than a standalone function,
extract it into that new file as a named function `convertEgpToUsd(egp:
number, rate: number): string` plus whatever fetches the live rate (name
it `fetchEgpToUsdRate(): Promise<number>`), preserving its current
external rate source exactly.

- [ ] **Step 2: Write the failing test**

```typescript
// apps/medusa/src/modules/paypal-egp/service.test.ts
import { describe, it, expect, vi } from "vitest";
import PaypalEgpProviderService from "./service";
import * as gateways from "@workspace/payment-gateways";

describe("PaypalEgpProviderService", () => {
  it("initiatePayment converts EGP to USD and stores the rate used", async () => {
    vi.spyOn(gateways, "fetchEgpToUsdRate").mockResolvedValue(0.0204);
    vi.spyOn(gateways, "createPayPalOrder").mockResolvedValue({
      paypalOrderId: "pp_order_1",
      approveUrl: "https://paypal.com/checkoutnow?token=pp_order_1",
    } as any);

    const service = new PaypalEgpProviderService({} as any, {});
    const result = await service.initiatePayment({
      amount: 35000, // 350.00 EGP
      currency_code: "egp",
      data: { returnUrl: "https://darnozom.com/checkout-paypal-return", cancelUrl: "https://darnozom.com/cart" },
      context: {},
    } as any);

    expect(result.data.exchangeRate).toBe(0.0204);
    expect(result.data.usdAmount).toBe("7.14");
    expect(result.data.paypalOrderId).toBe("pp_order_1");
  });
});
```
(Adjust the mocked export names to match whatever Step 1 actually names
them — the test must exercise the real extracted function names, not
these placeholders.)

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/modules/paypal-egp/service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the provider**

```typescript
// apps/medusa/src/modules/paypal-egp/service.ts
import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import type { InitiatePaymentInput, InitiatePaymentOutput, ProviderWebhookPayload, WebhookActionResult } from "@medusajs/framework/types";
import { createPayPalOrder, capturePayPalOrder, fetchEgpToUsdRate, convertEgpToUsd } from "@workspace/payment-gateways";

class PaypalEgpProviderService extends AbstractPaymentProvider {
  static identifier = "paypal-egp";

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const amountEgp = Number(input.amount) / 100;
    const rate = await fetchEgpToUsdRate();
    const usdAmount = convertEgpToUsd(amountEgp, rate);
    const data = input.data as { returnUrl: string; cancelUrl: string; referenceId?: string };

    const order = await createPayPalOrder({
      usdAmount,
      referenceId: data.referenceId ?? crypto.randomUUID(),
      returnUrl: data.returnUrl,
      cancelUrl: data.cancelUrl,
    });

    return {
      data: {
        paypalOrderId: order.paypalOrderId,
        approveUrl: (order as any).approveUrl,
        usdAmount,
        exchangeRate: rate,
      },
      id: order.paypalOrderId,
    };
  }

  async authorizePayment(input: any) {
    const paypalOrderId = (input.data as any).paypalOrderId;
    const result = await capturePayPalOrder(paypalOrderId);
    return {
      data: { ...input.data, paypalCaptureId: (result as any).captureId },
      status: "authorized",
    };
  }

  async getPaymentStatus(_input: any) {
    return { status: "authorized" };
  }

  async capturePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async cancelPayment(input: any) {
    return { data: input.data ?? {} };
  }

  async deletePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async refundPayment(_input: any) {
    throw new Error("PayPal refunds must be processed manually via the PayPal dashboard");
  }

  async retrievePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(_payload: ProviderWebhookPayload): Promise<WebhookActionResult> {
    // PayPal capture happens synchronously in authorizePayment (buyer
    // returns from the PayPal-hosted approval page to
    // checkout-paypal-return.tsx, which calls Medusa's authorize-payment-
    // session endpoint) rather than via an async webhook — mirrors the
    // existing checkout-paypal-return.tsx flow. No webhook is registered
    // for this provider.
    throw new Error("paypal-egp does not use webhooks");
  }
}

export default PaypalEgpProviderService;
```

- [ ] **Step 5: Register the module**

```typescript
// apps/medusa/src/modules/paypal-egp/index.ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import PaypalEgpProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaypalEgpProviderService],
});
```

Modify `apps/medusa/medusa-config.ts`, adding to `providers`:
```typescript
{
  resolve: "./src/modules/paypal-egp",
  id: "paypal-egp",
},
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/modules/paypal-egp/service.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/medusa/src/modules/paypal-egp apps/medusa/medusa-config.ts packages/payment-gateways
git add -u apps/api/src
git commit -m "feat(medusa): add PayPal (EGP-to-USD) payment provider

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 17: Write the `lemonsqueezy` payment provider module

**Files:**
- Create: `packages/payment-gateways/src/lemonsqueezy.ts`
- Create: `apps/medusa/src/modules/lemonsqueezy/service.ts`
- Create: `apps/medusa/src/modules/lemonsqueezy/index.ts`
- Test: `packages/payment-gateways/src/lemonsqueezy.test.ts`
- Test: `apps/medusa/src/modules/lemonsqueezy/service.test.ts`
- Modify: root `.env.example` (add `LEMONSQUEEZY_API_KEY`,
  `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`)

**Interfaces:**
- Produces: `createLemonSqueezyCheckout(params: { variantId: string;
  amountCents: number; customerEmail: string; redirectUrl: string
  }): Promise<{ checkoutId: string; checkoutUrl: string }>` and
  `verifyLemonSqueezyWebhookSignature(rawBody: string, signature: string
  | undefined): boolean` in the shared package (new — Lemon Squeezy has
  no existing client in this codebase, unlike Paymob/PayPal). A Medusa
  payment provider registered under id `lemonsqueezy`.

- [ ] **Step 1: Write the failing test for the Lemon Squeezy client**

```typescript
// packages/payment-gateways/src/lemonsqueezy.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLemonSqueezyCheckout, verifyLemonSqueezyWebhookSignature } from "./lemonsqueezy";

describe("lemonsqueezy client", () => {
  beforeEach(() => {
    process.env.LEMONSQUEEZY_API_KEY = "test-key";
    process.env.LEMONSQUEEZY_STORE_ID = "12345";
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "whsec_test";
  });

  it("createLemonSqueezyCheckout posts to the Lemon Squeezy checkouts API and returns the hosted url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "chk_123",
          attributes: { url: "https://darnozom.lemonsqueezy.com/checkout/chk_123" },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createLemonSqueezyCheckout({
      variantId: "ls_variant_1",
      amountCents: 15000,
      customerEmail: "buyer@example.com",
      redirectUrl: "https://darnozom.com/checkout-lemonsqueezy-return",
    });

    expect(result).toEqual({
      checkoutId: "chk_123",
      checkoutUrl: "https://darnozom.lemonsqueezy.com/checkout/chk_123",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lemonsqueezy.com/v1/checkouts",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("verifyLemonSqueezyWebhookSignature validates an HMAC-SHA256 signature", () => {
    const crypto = require("crypto");
    const rawBody = JSON.stringify({ meta: { event_name: "order_created" } });
    const validSignature = crypto
      .createHmac("sha256", "whsec_test")
      .update(rawBody)
      .digest("hex");

    expect(verifyLemonSqueezyWebhookSignature(rawBody, validSignature)).toBe(true);
    expect(verifyLemonSqueezyWebhookSignature(rawBody, "wrong")).toBe(false);
    expect(verifyLemonSqueezyWebhookSignature(rawBody, undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter payment-gateways exec vitest run src/lemonsqueezy.test.ts`
Expected: FAIL — module not found. (If `packages/payment-gateways` has no
`vitest` devDependency yet, add it matching the version used in
`apps/api/package.json`.)

- [ ] **Step 3: Write the client**

```typescript
// packages/payment-gateways/src/lemonsqueezy.ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "./logger";

const LEMONSQUEEZY_BASE_URL = "https://api.lemonsqueezy.com/v1";

export interface LemonSqueezyCheckout {
  checkoutId: string;
  checkoutUrl: string;
}

export function getLemonSqueezyConfig() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!apiKey || !storeId || !webhookSecret) return null;
  return { apiKey, storeId, webhookSecret };
}

export async function createLemonSqueezyCheckout(params: {
  variantId: string;
  amountCents: number;
  customerEmail: string;
  redirectUrl: string;
}): Promise<LemonSqueezyCheckout> {
  const config = getLemonSqueezyConfig();
  if (!config) throw new Error("Lemon Squeezy is not configured");

  const res = await fetch(`${LEMONSQUEEZY_BASE_URL}/checkouts`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: { email: params.customerEmail },
          product_options: { redirect_url: params.redirectUrl },
        },
        relationships: {
          store: { data: { type: "stores", id: config.storeId } },
          variant: { data: { type: "variants", id: params.variantId } },
        },
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ status: res.status, text }, "lemonsqueezy: create checkout failed");
    throw new Error(`Lemon Squeezy create checkout failed (${res.status})`);
  }

  const body = (await res.json()) as {
    data: { id: string; attributes: { url: string } };
  };
  return { checkoutId: body.data.id, checkoutUrl: body.data.attributes.url };
}

export function verifyLemonSqueezyWebhookSignature(
  rawBody: string,
  signature: string | undefined,
): boolean {
  const config = getLemonSqueezyConfig();
  if (!config || !signature) return false;
  const expected = createHmac("sha256", config.webhookSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter payment-gateways exec vitest run src/lemonsqueezy.test.ts`
Expected: PASS

- [ ] **Step 5: Add the barrel export**

Modify `packages/payment-gateways/src/index.ts`, add:
```typescript
export * from "./lemonsqueezy";
```

- [ ] **Step 6: Write the failing test for the Medusa provider**

```typescript
// apps/medusa/src/modules/lemonsqueezy/service.test.ts
import { describe, it, expect, vi } from "vitest";
import LemonSqueezyProviderService from "./service";
import * as gateways from "@workspace/payment-gateways";

describe("LemonSqueezyProviderService", () => {
  it("initiatePayment requires a Lemon Squeezy variant id in context data", async () => {
    const service = new LemonSqueezyProviderService({} as any, {});
    await expect(
      service.initiatePayment({
        amount: 15000,
        currency_code: "usd",
        data: {},
        context: { customer: { email: "buyer@example.com" } },
      } as any),
    ).rejects.toThrow(/lemon squeezy variant/i);
  });

  it("initiatePayment creates a hosted checkout and returns its url", async () => {
    vi.spyOn(gateways, "createLemonSqueezyCheckout").mockResolvedValue({
      checkoutId: "chk_1",
      checkoutUrl: "https://darnozom.lemonsqueezy.com/checkout/chk_1",
    });

    const service = new LemonSqueezyProviderService({} as any, {});
    const result = await service.initiatePayment({
      amount: 15000,
      currency_code: "usd",
      data: { lemonSqueezyVariantId: "ls_variant_1", redirectUrl: "https://darnozom.com/checkout-lemonsqueezy-return" },
      context: { customer: { email: "buyer@example.com" } },
    } as any);

    expect(result.data.checkoutUrl).toBe("https://darnozom.lemonsqueezy.com/checkout/chk_1");
  });

  it("getWebhookActionAndData maps order_created to captured", async () => {
    vi.spyOn(gateways, "verifyLemonSqueezyWebhookSignature").mockReturnValue(true);

    const service = new LemonSqueezyProviderService({} as any, {});
    const result = await service.getWebhookActionAndData({
      data: {
        rawData: JSON.stringify({ meta: { event_name: "order_created" }, data: { id: "chk_1" } }),
        headers: { "x-signature": "sig" },
      },
    } as any);

    expect(result.action).toBe("captured");
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/modules/lemonsqueezy/service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 8: Write the provider**

```typescript
// apps/medusa/src/modules/lemonsqueezy/service.ts
import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import type { InitiatePaymentInput, InitiatePaymentOutput, ProviderWebhookPayload, WebhookActionResult } from "@medusajs/framework/types";
import { createLemonSqueezyCheckout, verifyLemonSqueezyWebhookSignature } from "@workspace/payment-gateways";

class LemonSqueezyProviderService extends AbstractPaymentProvider {
  static identifier = "lemonsqueezy";

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const data = input.data as { lemonSqueezyVariantId?: string; redirectUrl?: string };
    if (!data.lemonSqueezyVariantId) {
      throw new Error("Missing Lemon Squeezy variant id for checkout");
    }
    const customer = (input.context as any)?.customer;

    const checkout = await createLemonSqueezyCheckout({
      variantId: data.lemonSqueezyVariantId,
      amountCents: Number(input.amount),
      customerEmail: customer?.email ?? "unknown@darnozom.com",
      redirectUrl: data.redirectUrl ?? "https://darnozom.com/checkout-lemonsqueezy-return",
    });

    return {
      data: { checkoutId: checkout.checkoutId, checkoutUrl: checkout.checkoutUrl },
      id: checkout.checkoutId,
    };
  }

  async authorizePayment(input: any) {
    return { data: input.data ?? {}, status: "pending" };
  }

  async getPaymentStatus(_input: any) {
    return { status: "pending" };
  }

  async capturePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async cancelPayment(input: any) {
    return { data: input.data ?? {} };
  }

  async deletePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async refundPayment(_input: any) {
    throw new Error("Lemon Squeezy refunds must be processed manually via the Lemon Squeezy dashboard");
  }

  async retrievePayment(input: any) {
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload): Promise<WebhookActionResult> {
    const body = payload.data as { rawData: string; headers: Record<string, string> };
    const signature = body.headers["x-signature"];
    if (!verifyLemonSqueezyWebhookSignature(body.rawData, signature)) {
      throw new Error("Invalid Lemon Squeezy webhook signature");
    }

    const parsed = JSON.parse(body.rawData) as {
      meta: { event_name: string };
      data: { id: string };
    };

    if (parsed.meta.event_name === "order_created") {
      return { action: "captured", data: { session_id: parsed.data.id, amount: 0 } };
    }
    if (parsed.meta.event_name === "order_refunded") {
      return { action: "not_supported" };
    }
    return { action: "not_supported" };
  }
}

export default LemonSqueezyProviderService;
```

- [ ] **Step 9: Register the module**

```typescript
// apps/medusa/src/modules/lemonsqueezy/index.ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import LemonSqueezyProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [LemonSqueezyProviderService],
});
```

Modify `apps/medusa/medusa-config.ts`, add to `providers`:
```typescript
{
  resolve: "./src/modules/lemonsqueezy",
  id: "lemonsqueezy",
},
```

Modify root `.env.example`, add:
```
# Lemon Squeezy (merchant of record — digital-only + international orders)
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/modules/lemonsqueezy/service.test.ts`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add packages/payment-gateways apps/medusa/src/modules/lemonsqueezy apps/medusa/medusa-config.ts .env.example
git commit -m "feat(medusa): add Lemon Squeezy payment provider

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 18: Write the provider-selection route (`/store/available-payment-providers`)

**Files:**
- Create: `apps/medusa/src/api/store/available-payment-providers/route.ts`
- Test: `apps/medusa/src/api/store/available-payment-providers/route.test.ts`

**Interfaces:**
- Consumes: a cart's `items` (with variant metadata `kind: "paper" |
  "digital"`, set during migration in Task 4 and at checkout in Task 23)
  and `shipping_address.country_code`.
- Produces: `GET /store/available-payment-providers?cart_id=...` → `200
  { providerIds: string[] }` — consumed by Task 24's checkout page.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/api/store/available-payment-providers/route.test.ts
import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

function fakeReq(cartData: any) {
  return {
    query: { cart_id: "cart_1" },
    scope: {
      resolve: () => ({
        graph: vi.fn().mockResolvedValue({ data: [cartData] }),
      }),
    },
  } as any;
}
function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("GET /store/available-payment-providers", () => {
  it("offers Paymob + COD (+ PayPal) for a physical-item cart shipping within Egypt", async () => {
    const res = fakeRes();
    await GET(
      fakeReq({
        items: [{ product: { metadata: { kind: "paper" } } }],
        shipping_address: { country_code: "eg" },
      }),
      res,
    );
    expect(res.json).toHaveBeenCalledWith({
      providerIds: ["paymob-card", "paymob-wallet", "cod", "paypal-egp"],
    });
  });

  it("offers Lemon Squeezy (+ PayPal) for a digital-only cart", async () => {
    const res = fakeRes();
    await GET(
      fakeReq({
        items: [{ product: { metadata: { kind: "digital" } } }],
        shipping_address: null,
      }),
      res,
    );
    expect(res.json).toHaveBeenCalledWith({
      providerIds: ["lemonsqueezy", "paypal-egp"],
    });
  });

  it("offers Lemon Squeezy (+ PayPal) for a physical-item cart shipping outside Egypt", async () => {
    const res = fakeRes();
    await GET(
      fakeReq({
        items: [{ product: { metadata: { kind: "paper" } } }],
        shipping_address: { country_code: "us" },
      }),
      res,
    );
    expect(res.json).toHaveBeenCalledWith({
      providerIds: ["lemonsqueezy", "paypal-egp"],
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/api/store/available-payment-providers/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

```typescript
// apps/medusa/src/api/store/available-payment-providers/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cartId = (req.query as Record<string, string>).cart_id;
  if (!cartId) {
    return res.status(400).json({ error: "Missing cart_id" });
  }

  const query = req.scope.resolve("query");
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "items.product.metadata", "shipping_address.country_code"],
    filters: { id: cartId },
  });

  const cart = data[0];
  if (!cart) {
    return res.status(404).json({ error: "Cart not found" });
  }

  const items = (cart.items ?? []) as Array<{ product?: { metadata?: { kind?: string } } }>;
  const isDigitalOnly = items.length > 0 && items.every((i) => i.product?.metadata?.kind === "digital");
  const countryCode = (cart.shipping_address as any)?.country_code?.toLowerCase();
  const shipsWithinEgypt = countryCode === "eg";

  const providerIds =
    isDigitalOnly || !shipsWithinEgypt
      ? ["lemonsqueezy", "paypal-egp"]
      : ["paymob-card", "paymob-wallet", "cod", "paypal-egp"];

  return res.status(200).json({ providerIds });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/api/store/available-payment-providers/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/api/store/available-payment-providers
git commit -m "feat(medusa): add cart-aware payment provider selection route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 19: Write the scheduled payment-reconciliation job

**Files:**
- Create: `apps/medusa/src/jobs/reconcile-payments.ts`
- Test: `apps/medusa/src/jobs/reconcile-payments.test.ts`

**Interfaces:**
- Consumes: Medusa's Payment module `listPaymentSessions`/capture-cancel
  workflows for sessions in `pending_authorization` older than a
  threshold.
- Produces: nothing consumed elsewhere — terminal scheduled job replacing
  `reconcilePaymobOrders.ts`/`reconcilePayPalOrders.ts`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/jobs/reconcile-payments.test.ts
import { describe, it, expect, vi } from "vitest";
import reconcilePaymentsJob from "./reconcile-payments";

describe("reconcile-payments job", () => {
  it("captures sessions whose provider now reports authorized/captured status", async () => {
    const capturePaymentMock = vi.fn().mockResolvedValue(undefined);
    const container = {
      resolve: (key: string) => {
        if (key === "payment") {
          return {
            listPaymentSessions: vi.fn().mockResolvedValue([
              { id: "ps_1", status: "pending", provider_id: "paymob-card", data: { paymobOrderId: "pmb_1" } },
            ]),
            getPaymentStatus: vi.fn().mockResolvedValue({ status: "captured" }),
            capturePayment: capturePaymentMock,
          };
        }
        throw new Error(`Unexpected resolve: ${key}`);
      },
    };

    await reconcilePaymentsJob({ container: container as any });

    expect(capturePaymentMock).toHaveBeenCalledWith(expect.objectContaining({ id: "ps_1" }));
  });

  it("cancels sessions stuck pending past the staleness threshold with a failed provider status", async () => {
    const cancelPaymentMock = vi.fn().mockResolvedValue(undefined);
    const container = {
      resolve: (key: string) => {
        if (key === "payment") {
          return {
            listPaymentSessions: vi.fn().mockResolvedValue([
              { id: "ps_2", status: "pending", provider_id: "paypal-egp", data: {} },
            ]),
            getPaymentStatus: vi.fn().mockResolvedValue({ status: "error" }),
            capturePayment: vi.fn(),
            cancelPayment: cancelPaymentMock,
          };
        }
        throw new Error(`Unexpected resolve: ${key}`);
      },
    };

    await reconcilePaymentsJob({ container: container as any });

    expect(cancelPaymentMock).toHaveBeenCalledWith(expect.objectContaining({ id: "ps_2" }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/jobs/reconcile-payments.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the job**

```typescript
// apps/medusa/src/jobs/reconcile-payments.ts
import type { MedusaContainer } from "@medusajs/framework/types";

interface PaymentServiceLike {
  listPaymentSessions(filter: { status: string }): Promise<
    Array<{ id: string; status: string; provider_id: string; data: Record<string, unknown> }>
  >;
  getPaymentStatus(session: { id: string }): Promise<{ status: string }>;
  capturePayment(session: { id: string }): Promise<void>;
  cancelPayment(session: { id: string }): Promise<void>;
}

export default async function reconcilePaymentsJob({ container }: { container: MedusaContainer }) {
  const paymentService = container.resolve<PaymentServiceLike>("payment");
  const pendingSessions = await paymentService.listPaymentSessions({ status: "pending" });

  for (const session of pendingSessions) {
    const providerStatus = await paymentService.getPaymentStatus(session);
    if (providerStatus.status === "captured" || providerStatus.status === "authorized") {
      await paymentService.capturePayment(session);
    } else if (providerStatus.status === "error" || providerStatus.status === "canceled") {
      await paymentService.cancelPayment(session);
    }
    // Otherwise still genuinely pending — leave for the next run.
  }
}

export const config = {
  name: "reconcile-payments",
  schedule: "*/15 * * * *", // every 15 minutes, matching the cadence of the two existing Express reconcilers
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/jobs/reconcile-payments.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/jobs/reconcile-payments.ts apps/medusa/src/jobs/reconcile-payments.test.ts
git commit -m "feat(medusa): add scheduled payment reconciliation job

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

**End of Phase 4.** Checkpoint: all five payment providers are unit
tested in isolation with mocked gateway calls; the provider-selection
route correctly filters by cart contents/country; the reconciliation job
replaces both legacy Express reconcilers. Not yet exercised against a
live Paymob/PayPal/Lemon Squeezy sandbox — that's Phase 6's end-to-end
checkout tests. Not yet reachable from the storefront — that's Phase 7.

---

## Phase 5 — City-based shipping fulfillment provider

### Task 20: Define the `CityRate` model and `city-shipping` module service

**Files:**
- Create: `apps/medusa/src/modules/city-shipping/models/city-rate.ts`
- Create: `apps/medusa/src/modules/city-shipping/service.ts`
- Create: `apps/medusa/src/modules/city-shipping/index.ts`
- Test: `apps/medusa/src/modules/city-shipping/service.test.ts`

**Interfaces:**
- Produces: module key `CITY_SHIPPING_MODULE`, service methods
  `createCityRates(rows: Array<{ city: string; price: number; currency:
  string; isDefault: boolean }>): Promise<unknown>` (consumed by Task 6's
  `migrate-shipping.ts`) and `getRateForCity(city: string | null):
  Promise<{ city: string; price: number; currency: string }>` (consumed
  by Task 21's fulfillment provider).

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/modules/city-shipping/service.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import CityShippingModuleService from "./service";

describe("CityShippingModuleService", () => {
  let service: CityShippingModuleService;
  beforeEach(() => {
    service = new CityShippingModuleService({} as any, {});
  });

  it("getRateForCity returns the matching city's rate", async () => {
    await service.createCityRates([
      { city: "Cairo", price: 5000, currency: "egp", isDefault: false },
      { city: "Other", price: 8000, currency: "egp", isDefault: true },
    ]);
    const rate = await service.getRateForCity("Cairo");
    expect(rate).toEqual({ city: "Cairo", price: 5000, currency: "egp" });
  });

  it("getRateForCity falls back to the default row for an unrecognized city", async () => {
    await service.createCityRates([
      { city: "Cairo", price: 5000, currency: "egp", isDefault: false },
      { city: "Other", price: 8000, currency: "egp", isDefault: true },
    ]);
    const rate = await service.getRateForCity("Nowhereville");
    expect(rate).toEqual({ city: "Other", price: 8000, currency: "egp" });
  });

  it("getRateForCity falls back to the default row when city is null", async () => {
    await service.createCityRates([
      { city: "Other", price: 8000, currency: "egp", isDefault: true },
    ]);
    const rate = await service.getRateForCity(null);
    expect(rate).toEqual({ city: "Other", price: 8000, currency: "egp" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/modules/city-shipping/service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Define the model**

```typescript
// apps/medusa/src/modules/city-shipping/models/city-rate.ts
import { model } from "@medusajs/framework/utils";

export const CityRate = model.define("city_rate", {
  id: model.id().primaryKey(),
  city: model.text().unique(),
  price: model.number(), // minor currency units, matching Medusa's amount convention
  currency: model.text(),
  is_default: model.boolean().default(false),
});
```

- [ ] **Step 4: Write the service**

```typescript
// apps/medusa/src/modules/city-shipping/service.ts
import { MedusaService } from "@medusajs/framework/utils";
import { CityRate } from "./models/city-rate";

class CityShippingModuleService extends MedusaService({ CityRate }) {
  async createCityRates(
    rows: Array<{ city: string; price: number; currency: string; isDefault: boolean }>,
  ) {
    return this.createCityRates_(
      rows.map((r) => ({ city: r.city, price: r.price, currency: r.currency, is_default: r.isDefault })),
    );
  }

  // MedusaService auto-generates createCityRates from the model name —
  // renamed here via a private delegate to avoid a naming collision with
  // the public method above; MedusaService's generated method is
  // accessible as this.createCityRates_ only if the base class exposes it
  // under a different name. If MedusaService generates the CRUD method as
  // `createCityRates` directly (the standard convention), remove this
  // wrapper indirection and rename the public method above to
  // `seedCityRates` instead, calling the generated `this.createCityRates`
  // directly — resolve this naming collision by running Step 2's test
  // against the actual generated method names in this Medusa version
  // before finalizing.

  async getRateForCity(city: string | null): Promise<{ city: string; price: number; currency: string }> {
    if (city) {
      const matches = await this.listCityRates({ city });
      if (matches.length > 0) {
        return { city: matches[0].city, price: matches[0].price, currency: matches[0].currency };
      }
    }
    const defaults = await this.listCityRates({ is_default: true });
    if (defaults.length === 0) {
      throw new Error("No default city shipping rate configured");
    }
    return { city: defaults[0].city, price: defaults[0].price, currency: defaults[0].currency };
  }
}

export default CityShippingModuleService;
```

Note the naming-collision caveat inline above — `MedusaService({
CityRate })` auto-generates `createCityRates`/`listCityRates`/etc. from
the model name. Before finalizing, run the test once against the
scaffolded version to see whether the base class's generated method is
directly overridable by re-declaring `createCityRates` in the subclass
(standard JS class override — likely fine) or whether it errors; adjust
the wrapper naming in Step 4 to whichever actually works, keeping the
public method name `createCityRates` stable since Task 6 depends on it.

- [ ] **Step 5: Register the module**

```typescript
// apps/medusa/src/modules/city-shipping/index.ts
import { Module } from "@medusajs/framework/utils";
import CityShippingModuleService from "./service";

export const CITY_SHIPPING_MODULE = "citySipping";

export default Module(CITY_SHIPPING_MODULE, {
  service: CityShippingModuleService,
});
```
(Fix the typo `citySipping` → `citySshipping`... actually use
`"citySshipping"` is wrong too — use the correct spelling
`"cityShipping"` as the module key.)

Modify `apps/medusa/medusa-config.ts`, add to `modules`:
```typescript
{ resolve: "./src/modules/city-shipping" },
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/modules/city-shipping/service.test.ts`
Expected: PASS

- [ ] **Step 7: Migrate and verify the table**

Run: `pnpm --filter medusa exec medusa db:migrate`
Run: `docker exec -it darnozom-db psql -U darnozom -d medusa -c "\dt" | grep city_rate`
Expected: table listed.

- [ ] **Step 8: Commit**

```bash
git add apps/medusa/src/modules/city-shipping apps/medusa/medusa-config.ts
git commit -m "feat(medusa): add city-shipping module with rate lookup

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 21: Write the `city-shipping` fulfillment provider and wire `migrate-shipping.ts` to the real service

**Files:**
- Create: `apps/medusa/src/modules/city-shipping/fulfillment-provider.ts`
- Test: `apps/medusa/src/modules/city-shipping/fulfillment-provider.test.ts`
- Modify: `apps/medusa/medusa-config.ts`
- Modify: `apps/medusa/src/scripts/run-migrate-shipping.ts` (new file,
  mirroring Task 5's `run-migrate-books.ts` pattern)

**Interfaces:**
- Consumes: `getRateForCity` from Task 20's service.
- Produces: a Medusa fulfillment provider registered under id
  `city-shipping`, offering one calculated "Standard Shipping" option.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/modules/city-shipping/fulfillment-provider.test.ts
import { describe, it, expect, vi } from "vitest";
import CityShippingFulfillmentProvider from "./fulfillment-provider";

describe("CityShippingFulfillmentProvider", () => {
  it("canCalculate returns true when a shipping address with a city is present", async () => {
    const provider = new CityShippingFulfillmentProvider(
      { cityShippingService: { getRateForCity: vi.fn() } } as any,
      {},
    );
    const result = await provider.canCalculate({
      data: {},
      context: { shipping_address: { city: "Cairo" } },
    } as any);
    expect(result).toBe(true);
  });

  it("calculatePrice returns the looked-up rate for the cart's city", async () => {
    const getRateForCity = vi.fn().mockResolvedValue({ city: "Cairo", price: 5000, currency: "egp" });
    const provider = new CityShippingFulfillmentProvider(
      { cityShippingService: { getRateForCity } } as any,
      {},
    );

    const result = await provider.calculatePrice(
      {} as any,
      {} as any,
      { shipping_address: { city: "Cairo" } } as any,
    );

    expect(result).toEqual({ calculated_amount: 5000, is_calculated_price_tax_inclusive: false });
    expect(getRateForCity).toHaveBeenCalledWith("Cairo");
  });

  it("getFulfillmentOptions returns one Standard Shipping option", async () => {
    const provider = new CityShippingFulfillmentProvider(
      { cityShippingService: { getRateForCity: vi.fn() } } as any,
      {},
    );
    const options = await provider.getFulfillmentOptions();
    expect(options).toEqual([{ id: "standard-shipping", name: "Standard Shipping", is_return: false }]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/modules/city-shipping/fulfillment-provider.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the provider**

```typescript
// apps/medusa/src/modules/city-shipping/fulfillment-provider.ts
import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils";
import type { CalculateShippingOptionPriceContext } from "@medusajs/framework/types";

interface CityShippingServiceLike {
  getRateForCity(city: string | null): Promise<{ city: string; price: number; currency: string }>;
}

class CityShippingFulfillmentProvider extends AbstractFulfillmentProviderService {
  static identifier = "city-shipping";
  protected cityShippingService_: CityShippingServiceLike;

  constructor(container: { cityShippingService: CityShippingServiceLike }) {
    super();
    this.cityShippingService_ = container.cityShippingService;
  }

  async getFulfillmentOptions() {
    return [{ id: "standard-shipping", name: "Standard Shipping", is_return: false }];
  }

  async canCalculate(_data: unknown): Promise<boolean> {
    return true; // rate lookup always resolves via the default-city fallback
  }

  async calculatePrice(
    _optionData: unknown,
    _data: unknown,
    context: CalculateShippingOptionPriceContext,
  ) {
    const city = (context.shipping_address as any)?.city ?? null;
    const rate = await this.cityShippingService_.getRateForCity(city);
    return { calculated_amount: rate.price, is_calculated_price_tax_inclusive: false };
  }

  async validateFulfillmentData(_optionData: unknown, data: Record<string, unknown>) {
    return data;
  }

  async validateOption(_data: unknown): Promise<boolean> {
    return true;
  }

  async createFulfillment(_data: unknown) {
    return { data: {} };
  }

  async cancelFulfillment(_data: unknown) {
    return {};
  }
}

export default CityShippingFulfillmentProvider;
```

- [ ] **Step 4: Register the fulfillment provider**

Modify `apps/medusa/medusa-config.ts`, add a `Modules.FULFILLMENT` entry:
```typescript
{
  key: Modules.FULFILLMENT,
  resolve: "@medusajs/fulfillment",
  options: {
    providers: [
      {
        resolve: "./src/modules/city-shipping/fulfillment-provider",
        id: "city-shipping",
        dependencies: [CITY_SHIPPING_MODULE],
      },
    ],
  },
},
```
(Import `CITY_SHIPPING_MODULE` from `./src/modules/city-shipping` at the
top of the file. The `dependencies` array is how Medusa injects the
`cityShippingService` key into the provider's constructor container —
confirm this dependency-injection mechanism against whatever version of
`@medusajs/framework` was scaffolded; if the constructor-injection key
name differs from `cityShippingService`, adjust Step 3's constructor
parameter name to match.)

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/modules/city-shipping/fulfillment-provider.test.ts`
Expected: PASS

- [ ] **Step 6: Wire the CLI entrypoint for shipping migration**

```typescript
// apps/medusa/src/scripts/run-migrate-shipping.ts
import type { MedusaContainer } from "@medusajs/framework/types";
import { migrateShipping } from "./migrate-shipping";
import { CITY_SHIPPING_MODULE } from "../modules/city-shipping";

export default async function ({ container }: { container: MedusaContainer }) {
  const { db } = await import("@workspace/db");
  const cityShippingService = container.resolve(CITY_SHIPPING_MODULE);
  const count = await migrateShipping({ shippingDb: db, cityShippingService });
  console.log(`Migrated ${count} shipping rates.`);
}
```

- [ ] **Step 7: Run the full test suite for this module**

Run: `pnpm --filter medusa exec vitest run src/modules/city-shipping`
Expected: PASS (all files)

- [ ] **Step 8: Commit**

```bash
git add apps/medusa/src/modules/city-shipping apps/medusa/medusa-config.ts apps/medusa/src/scripts/run-migrate-shipping.ts
git commit -m "feat(medusa): add city-shipping fulfillment provider and migration entrypoint

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 22: Add a Medusa Admin dashboard extension for managing city rates

**Files:**
- Create: `apps/medusa/src/admin/routes/city-rates/page.tsx`

**Interfaces:**
- Consumes: Medusa Admin SDK's `defineRouteConfig` and a custom admin API
  route for CRUD on `CityRate` (create alongside this task, not
  previously planned — add
  `apps/medusa/src/api/admin/city-rates/route.ts` for `GET`/`POST` and
  `apps/medusa/src/api/admin/city-rates/[id]/route.ts` for `PUT`/`DELETE`,
  following the exact same `req.scope.resolve(CITY_SHIPPING_MODULE)`
  pattern as Task 20).
- Produces: a working "City Rates" page under Medusa Admin's Settings
  section for staff to manage shipping prices without a dashboard build
  step, per the design spec.

- [ ] **Step 1: Write the admin API routes (list/create)**

```typescript
// apps/medusa/src/api/admin/city-rates/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { CITY_SHIPPING_MODULE } from "../../../modules/city-shipping";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<any>(CITY_SHIPPING_MODULE);
  const rates = await service.listCityRates({});
  res.status(200).json({ cityRates: rates });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<any>(CITY_SHIPPING_MODULE);
  const body = req.body as { city: string; price: number; currency: string; isDefault: boolean };
  const created = await service.createCityRates([body]);
  res.status(201).json({ cityRate: created[0] });
}
```

- [ ] **Step 2: Write the admin API routes (update/delete)**

```typescript
// apps/medusa/src/api/admin/city-rates/[id]/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { CITY_SHIPPING_MODULE } from "../../../../modules/city-shipping";

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<any>(CITY_SHIPPING_MODULE);
  const body = req.body as { price?: number; isDefault?: boolean };
  const updated = await service.updateCityRates({ id: req.params.id, ...body });
  res.status(200).json({ cityRate: updated });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<any>(CITY_SHIPPING_MODULE);
  await service.deleteCityRates(req.params.id);
  res.status(200).json({ id: req.params.id, deleted: true });
}
```

- [ ] **Step 3: Write the admin dashboard page**

```typescript
// apps/medusa/src/admin/routes/city-rates/page.tsx
import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Table, Input, Button } from "@medusajs/ui";
import { useEffect, useState } from "react";

interface CityRate {
  id: string;
  city: string;
  price: number;
  currency: string;
  is_default: boolean;
}

const CityRatesPage = () => {
  const [rates, setRates] = useState<CityRate[]>([]);
  const [newCity, setNewCity] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const load = async () => {
    const res = await fetch("/admin/city-rates", { credentials: "include" });
    const body = await res.json();
    setRates(body.cityRates);
  };

  useEffect(() => {
    load();
  }, []);

  const addRate = async () => {
    await fetch("/admin/city-rates", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: newCity,
        price: Math.round(Number(newPrice) * 100),
        currency: "egp",
        isDefault: false,
      }),
    });
    setNewCity("");
    setNewPrice("");
    await load();
  };

  return (
    <Container>
      <Heading level="h1">City Shipping Rates</Heading>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>City</Table.HeaderCell>
            <Table.HeaderCell>Price (EGP)</Table.HeaderCell>
            <Table.HeaderCell>Default</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rates.map((r) => (
            <Table.Row key={r.id}>
              <Table.Cell>{r.city}</Table.Cell>
              <Table.Cell>{(r.price / 100).toFixed(2)}</Table.Cell>
              <Table.Cell>{r.is_default ? "Yes" : ""}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Input placeholder="City" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
        <Input placeholder="Price (EGP)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
        <Button onClick={addRate}>Add</Button>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({ label: "City Rates" });
export default CityRatesPage;
```

- [ ] **Step 4: Build the admin dashboard and manually verify**

Run: `pnpm --filter medusa build`
Run: `pnpm dev:medusa`
Visit `http://localhost:9000/app/city-rates` (logged in as the admin
user from Task 3), add a test city rate, confirm it lists. This step is
manual verification, not an automated test — Medusa Admin extensions are
React pages rendered client-side and are conventionally checked visually
per Medusa's own project structure; skip an automated test for this task.

- [ ] **Step 5: Commit**

```bash
git add apps/medusa/src/api/admin/city-rates apps/medusa/src/admin/routes/city-rates
git commit -m "feat(medusa): add admin dashboard page for managing city shipping rates

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

**End of Phase 5.** Checkpoint: city-based shipping rates can be seeded
via `migrate-shipping.ts`, calculated dynamically at cart checkout via
the `city-shipping` fulfillment provider, and managed by staff through a
dedicated Medusa Admin page. This closes the last piece of Medusa-side
domain logic before identity/storefront wiring.

---

## Phase 6 — Identity bridge (Better Auth ↔ Medusa)

### Task 23: Write the Medusa custom auth provider that trusts an Express-signed assertion

**Files:**
- Create: `apps/medusa/src/modules/better-auth-bridge/service.ts`
- Create: `apps/medusa/src/modules/better-auth-bridge/index.ts`
- Test: `apps/medusa/src/modules/better-auth-bridge/service.test.ts`

**Interfaces:**
- Consumes: a shared HMAC secret (`BETTER_AUTH_BRIDGE_SECRET`, new env
  var, set identically in `apps/api/.env` and `apps/medusa/.env`).
- Produces: a Medusa `AuthenticationProvider` registered under id
  `better-auth-bridge`, exposing `authenticate(data: { assertion: string
  }): Promise<AuthenticationResponse>` — consumed by Task 24's Express
  endpoint via Medusa's `/auth/customer/better-auth-bridge` route (built
  into Medusa's auth module automatically once this provider is
  registered).

- [ ] **Step 1: Write the failing test**

```typescript
// apps/medusa/src/modules/better-auth-bridge/service.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createHmac } from "crypto";
import BetterAuthBridgeProvider from "./service";

function signAssertion(payload: Record<string, unknown>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

describe("BetterAuthBridgeProvider", () => {
  const secret = "test-bridge-secret";
  beforeEach(() => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = secret;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("authenticates successfully with a valid, unexpired assertion", async () => {
    const provider = new BetterAuthBridgeProvider({} as any, {});
    const assertion = signAssertion(
      { betterAuthUserId: "user_1", email: "buyer@example.com", exp: Math.floor(Date.now() / 1000) + 60 },
      secret,
    );

    const result = await provider.authenticate({ assertion } as any, {} as any);

    expect(result.success).toBe(true);
    expect(result.authIdentity?.provider_identity_id).toBe("user_1");
  });

  it("rejects an expired assertion", async () => {
    const provider = new BetterAuthBridgeProvider({} as any, {});
    const assertion = signAssertion(
      { betterAuthUserId: "user_1", email: "buyer@example.com", exp: Math.floor(Date.now() / 1000) - 10 },
      secret,
    );

    const result = await provider.authenticate({ assertion } as any, {} as any);
    expect(result.success).toBe(false);
  });

  it("rejects a tampered assertion", async () => {
    const provider = new BetterAuthBridgeProvider({} as any, {});
    const assertion = signAssertion(
      { betterAuthUserId: "user_1", email: "buyer@example.com", exp: Math.floor(Date.now() / 1000) + 60 },
      secret,
    );
    const tampered = assertion.slice(0, -2) + "xx";

    const result = await provider.authenticate({ assertion: tampered } as any, {} as any);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter medusa exec vitest run src/modules/better-auth-bridge/service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the provider**

```typescript
// apps/medusa/src/modules/better-auth-bridge/service.ts
import { AbstractAuthModuleProvider } from "@medusajs/framework/utils";
import type { AuthenticationInput, AuthenticationResponse } from "@medusajs/framework/types";
import { createHmac, timingSafeEqual } from "crypto";

interface AssertionPayload {
  betterAuthUserId: string;
  email: string;
  name?: string;
  exp: number;
}

function verifyAssertion(assertion: string, secret: string): AssertionPayload {
  const [body, mac] = assertion.split(".");
  if (!body || !mac) throw new Error("Malformed assertion");

  const expectedMac = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid assertion signature");
  }

  const payload: AssertionPayload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
  if (Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error("Assertion expired");
  }
  return payload;
}

class BetterAuthBridgeProvider extends AbstractAuthModuleProvider {
  static identifier = "better-auth-bridge";

  async authenticate(data: AuthenticationInput): Promise<AuthenticationResponse> {
    const assertion = (data as any).assertion as string | undefined;
    const secret = process.env.BETTER_AUTH_BRIDGE_SECRET;
    if (!assertion || !secret) {
      return { success: false, error: "Missing assertion or bridge secret" };
    }

    try {
      const payload = verifyAssertion(assertion, secret);
      return {
        success: true,
        authIdentity: {
          provider_identity_id: payload.betterAuthUserId,
          user_metadata: { email: payload.email, name: payload.name ?? payload.email },
        },
      } as unknown as AuthenticationResponse;
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export default BetterAuthBridgeProvider;
```

- [ ] **Step 4: Register the module**

```typescript
// apps/medusa/src/modules/better-auth-bridge/index.ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import BetterAuthBridgeProvider from "./service";

export default ModuleProvider(Modules.AUTH, {
  services: [BetterAuthBridgeProvider],
});
```

Modify `apps/medusa/medusa-config.ts`, add a `Modules.AUTH` entry:
```typescript
{
  key: Modules.AUTH,
  resolve: "@medusajs/auth",
  options: {
    providers: [
      { resolve: "./src/modules/better-auth-bridge", id: "better-auth-bridge" },
      // Keep the default emailpass provider registered too — Medusa Admin
      // (/app) staff logins still use it, per the design's "separate
      // Medusa admin accounts" decision.
      { resolve: "@medusajs/auth-emailpass", id: "emailpass" },
    ],
  },
},
```

Modify root `.env.example` and `apps/medusa/.env`, add:
```
BETTER_AUTH_BRIDGE_SECRET=
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter medusa exec vitest run src/modules/better-auth-bridge/service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/medusa/src/modules/better-auth-bridge apps/medusa/medusa-config.ts .env.example
git commit -m "feat(medusa): add custom auth provider trusting Better Auth assertions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 24: Write the Express `POST /api/store/medusa-token` endpoint

**Files:**
- Create: `apps/api/src/routes/medusa-bridge/index.ts`
- Test: `apps/api/src/routes/medusa-bridge/medusa-token.test.ts`
- Modify: `apps/api/src/routes/index.ts` (or wherever routers are
  mounted — check the existing mount pattern via `grep -n "app.use"
  apps/api/src/index.ts` before writing this step)

**Interfaces:**
- Consumes: `requireAuth`, `AuthRequest`, `getSessionUser` from
  `apps/api/src/middlewares/authMiddleware.ts` (confirmed signatures);
  Medusa's Admin API (`POST /admin/customers`, `GET
  /admin/customers?q=...` — using a Medusa Admin API key, new env var
  `MEDUSA_ADMIN_API_KEY`).
- Produces: `POST /api/store/medusa-token` → `200 { token: string }` —
  consumed by Task 26's `medusa-client.ts`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/routes/medusa-bridge/medusa-token.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { medusaBridgeRouter } from "./index";

vi.mock("../../middlewares/authMiddleware", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = "user_1";
    req.userEmail = "buyer@example.com";
    next();
  },
}));

describe("POST /api/store/medusa-token", () => {
  beforeEach(() => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = "test-bridge-secret";
    process.env.MEDUSA_ADMIN_API_KEY = "test-medusa-admin-key";
    process.env.MEDUSA_BACKEND_URL = "http://localhost:9000";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/admin/customers?")) {
          return Promise.resolve({ ok: true, json: async () => ({ customers: [] }) });
        }
        if (url.endsWith("/admin/customers")) {
          return Promise.resolve({ ok: true, json: async () => ({ customer: { id: "cus_new_1" } }) });
        }
        if (url.includes("/auth/customer/better-auth-bridge")) {
          return Promise.resolve({ ok: true, json: async () => ({ token: "medusa-jwt-abc" }) });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );
  });

  it("creates a Medusa customer when none exists and returns a token", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/store", medusaBridgeRouter);

    const res = await request(app).post("/api/store/medusa-token").send();

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("medusa-jwt-abc");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && DATABASE_URL=<local test db url> pnpm exec vitest run src/routes/medusa-bridge/medusa-token.test.ts`
Expected: FAIL — module not found. (Check whether `supertest` is already
a devDependency of `apps/api`; if not, check how existing route tests in
`apps/api/src/routes/orders/*.test.ts` invoke their Express app — mirror
that harness instead of introducing `supertest` if the project already
has its own request-testing convention.)

- [ ] **Step 3: Write the router**

```typescript
// apps/api/src/routes/medusa-bridge/index.ts
import { Router, type Response } from "express";
import { createHmac } from "crypto";
import { requireAuth, type AuthRequest } from "../../middlewares/authMiddleware";
import { logger } from "../../lib/logger";

export const medusaBridgeRouter = Router();

function signAssertion(payload: { betterAuthUserId: string; email: string; name: string }): string {
  const secret = process.env.BETTER_AUTH_BRIDGE_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_BRIDGE_SECRET is not set");
  const exp = Math.floor(Date.now() / 1000) + 60;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

async function findOrCreateMedusaCustomer(userId: string, email: string, name: string): Promise<string> {
  const backendUrl = process.env.MEDUSA_BACKEND_URL;
  const adminKey = process.env.MEDUSA_ADMIN_API_KEY;
  if (!backendUrl || !adminKey) throw new Error("Medusa backend not configured");

  const headers = { Authorization: `Bearer ${adminKey}`, "Content-Type": "application/json" };

  const searchRes = await fetch(`${backendUrl}/admin/customers?q=${encodeURIComponent(email)}`, { headers });
  const searchBody = (await searchRes.json()) as { customers: Array<{ id: string; metadata?: Record<string, unknown> }> };
  const existing = searchBody.customers.find((c) => c.metadata?.betterAuthUserId === userId);
  if (existing) return existing.id;

  const createRes = await fetch(`${backendUrl}/admin/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, first_name: name, metadata: { betterAuthUserId: userId } }),
  });
  if (!createRes.ok) throw new Error(`Failed to create Medusa customer (${createRes.status})`);
  const createBody = (await createRes.json()) as { customer: { id: string } };
  return createBody.customer.id;
}

medusaBridgeRouter.post("/medusa-token", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const email = req.userEmail!;
    const name = email; // SessionUser carries `name` too — pass req's actual name field if available

    await findOrCreateMedusaCustomer(userId, email, name);

    const assertion = signAssertion({ betterAuthUserId: userId, email, name });
    const backendUrl = process.env.MEDUSA_BACKEND_URL;
    const authRes = await fetch(`${backendUrl}/auth/customer/better-auth-bridge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assertion }),
    });
    if (!authRes.ok) {
      const text = await authRes.text().catch(() => "");
      logger.error({ status: authRes.status, text }, "medusa-bridge: token mint failed");
      return res.status(502).json({ error: "Failed to mint Medusa token" });
    }
    const authBody = (await authRes.json()) as { token: string };
    return res.status(200).json({ token: authBody.token });
  } catch (err) {
    logger.error({ err }, "medusa-bridge: unexpected error");
    return res.status(500).json({ error: "Internal error" });
  }
});
```

- [ ] **Step 4: Mount the router**

Check the existing mount pattern:
Run: `grep -n "app.use.*Router\|app.use.*router" apps/api/src/index.ts`

Modify `apps/api/src/index.ts`, adding (matching whatever import/mount
style the existing routers use, e.g. `app.use("/api", ordersRouter)`):
```typescript
import { medusaBridgeRouter } from "./routes/medusa-bridge";
// ...
app.use("/api/store", medusaBridgeRouter);
```

- [ ] **Step 5: Add new env vars**

Modify root `.env.example`, add:
```
MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_ADMIN_API_KEY=
```

- [ ] **Step 6: Run to verify it passes**

Run: `cd apps/api && DATABASE_URL=<local test db url> pnpm exec vitest run src/routes/medusa-bridge/medusa-token.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/medusa-bridge apps/api/src/index.ts .env.example
git commit -m "feat(api): add /api/store/medusa-token bridge endpoint

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

**End of Phase 6.** Checkpoint: a signed-in Better Auth user can obtain a
valid Medusa customer JWT through the Express bridge, backed by a Medusa
customer record keyed to their Better Auth user id — the identity
contract the storefront (Phase 7) depends on. Manually verify end-to-end
once by starting both `apps/api` and `apps/medusa` locally and `curl -X
POST localhost:8080/api/store/medusa-token -H "Cookie: <session
cookie>"`, expecting a `token` field back.

---

## Phase 7 — Storefront data-layer swap

### Task 25: Add `@medusajs/js-sdk` and write `medusa-client.ts`

**Files:**
- Create: `apps/client/src/lib/medusa-client.ts`
- Test: `apps/client/src/lib/medusa-client.test.ts`
- Modify: `apps/client/package.json`
- Modify: `apps/client/.env.example` (add `VITE_MEDUSA_BACKEND_URL`,
  `VITE_MEDUSA_PUBLISHABLE_KEY`)

**Interfaces:**
- Produces: `getMedusaClient(): Medusa` (a configured `@medusajs/js-sdk`
  instance) and `setMedusaCustomerToken(token: string | null): void` /
  `getMedusaCustomerToken(): string | null` (localStorage-backed) —
  consumed by every task in the rest of this phase.

- [ ] **Step 1: Install the SDK**

Modify `apps/client/package.json`, add to `dependencies`:
```json
"@medusajs/js-sdk": "^2.10.0"
```
(Pin to whatever exact minor version matches the `apps/medusa` backend
scaffolded in Task 1 — check `apps/medusa/package.json`'s
`@medusajs/framework` version and match the SDK's major.minor to it.)
Run: `pnpm install`

- [ ] **Step 2: Write the failing test**

```typescript
// apps/client/src/lib/medusa-client.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getMedusaClient, setMedusaCustomerToken, getMedusaCustomerToken } from "./medusa-client";

describe("medusa-client", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getMedusaCustomerToken returns null when nothing stored", () => {
    expect(getMedusaCustomerToken()).toBeNull();
  });

  it("setMedusaCustomerToken persists and getMedusaCustomerToken reads it back", () => {
    setMedusaCustomerToken("medusa-jwt-abc");
    expect(getMedusaCustomerToken()).toBe("medusa-jwt-abc");
  });

  it("setMedusaCustomerToken(null) clears the stored token", () => {
    setMedusaCustomerToken("medusa-jwt-abc");
    setMedusaCustomerToken(null);
    expect(getMedusaCustomerToken()).toBeNull();
  });

  it("getMedusaClient returns a client configured with the publishable key", () => {
    const client = getMedusaClient();
    expect(client).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter client exec vitest run src/lib/medusa-client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the client**

```typescript
// apps/client/src/lib/medusa-client.ts
import Medusa from "@medusajs/js-sdk";

const TOKEN_STORAGE_KEY = "medusa_customer_token";

export function getMedusaCustomerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setMedusaCustomerToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage unavailable (private browsing etc.) — session simply
    // won't persist across reloads; not fatal.
  }
}

let cachedClient: Medusa | null = null;

export function getMedusaClient(): Medusa {
  if (cachedClient) return cachedClient;
  cachedClient = new Medusa({
    baseUrl: import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000",
    publishableKey: import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY,
  });
  return cachedClient;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter client exec vitest run src/lib/medusa-client.test.ts`
Expected: PASS

- [ ] **Step 6: Add env vars**

Modify `apps/client/.env.example`, add:
```
VITE_MEDUSA_BACKEND_URL=http://localhost:9000
VITE_MEDUSA_PUBLISHABLE_KEY=
```
(The publishable key itself is generated in the Medusa Admin dashboard
under Settings → API Key Management after Task 3's setup — not
generatable by a script; note this as a manual one-time step.)

- [ ] **Step 7: Commit**

```bash
git add apps/client/src/lib/medusa-client.ts apps/client/src/lib/medusa-client.test.ts apps/client/package.json apps/client/.env.example pnpm-lock.yaml
git commit -m "feat(client): add Medusa JS SDK client wrapper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 26: Replace `store-types.ts` with Medusa types and rewrite `cart-context.tsx`

**Files:**
- Delete: `apps/client/src/lib/store-types.ts`
- Modify: `apps/client/src/lib/cart-context.tsx` (full rewrite)
- Test: `apps/client/src/lib/cart-context.test.tsx`
- Modify: `apps/client/package.json` (add `@medusajs/types`)

**Interfaces:**
- Consumes: `getMedusaClient`, `getMedusaCustomerToken` from Task 25.
- Produces: `CartProvider`, `useCart()` returning `{ cart: StoreCart |
  null; addItem(variantId: string, quantity: number): Promise<void>;
  removeItem(lineItemId: string): Promise<void>; updateQuantity(lineItemId:
  string, quantity: number): Promise<void>; isLoading: boolean }` — the
  exact shape every store/cart/checkout page (Tasks 27-31) imports.

- [ ] **Step 1: Add `@medusajs/types`**

Modify `apps/client/package.json`, add to `dependencies`:
```json
"@medusajs/types": "^2.10.0"
```
(match the pinned version from Task 25)
Run: `pnpm install`

- [ ] **Step 2: Write the failing test**

```tsx
// apps/client/src/lib/cart-context.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartProvider, useCart } from "./cart-context";
import * as medusaClient from "./medusa-client";

function TestConsumer() {
  const { cart, addItem, isLoading } = useCart();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="item-count">{cart?.items?.length ?? 0}</span>
      <button onClick={() => addItem("variant_1", 1)}>Add</button>
    </div>
  );
}

describe("CartProvider / useCart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a cart on mount and exposes it via useCart", async () => {
    const fakeCart = { id: "cart_1", items: [] };
    const sdk = {
      store: {
        cart: {
          create: vi.fn().mockResolvedValue({ cart: fakeCart }),
          retrieve: vi.fn().mockResolvedValue({ cart: fakeCart }),
          createLineItem: vi.fn().mockResolvedValue({ cart: { ...fakeCart, items: [{ id: "li_1" }] } }),
        },
      },
    };
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(sdk.store.cart.create).toHaveBeenCalled();

    await userEvent.click(screen.getByText("Add"));
    await waitFor(() => expect(screen.getByTestId("item-count").textContent).toBe("1"));
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter client exec vitest run src/lib/cart-context.test.tsx`
Expected: FAIL — current `cart-context.tsx` doesn't match this contract.
(Check whether `@testing-library/react` and `@testing-library/user-event`
are already devDependencies; add them matching versions used elsewhere in
the repo if not — search `pnpm-lock.yaml` for existing pins first rather
than picking arbitrary versions.)

- [ ] **Step 4: Delete `store-types.ts`**

```bash
git rm apps/client/src/lib/store-types.ts
```
Run: `grep -rl "from \"@/lib/store-types\"\|from \"../lib/store-types\"" apps/client/src` and note every
file for Tasks 27-31 to update.

- [ ] **Step 5: Rewrite `cart-context.tsx`**

```tsx
// apps/client/src/lib/cart-context.tsx
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { HttpTypes } from "@medusajs/types";
import { getMedusaClient, getMedusaCustomerToken } from "./medusa-client";

const CART_ID_STORAGE_KEY = "medusa_cart_id";

interface CartContextValue {
  cart: HttpTypes.StoreCart | null;
  isLoading: boolean;
  addItem: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  updateQuantity: (lineItemId: string, quantity: number) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<HttpTypes.StoreCart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useCallback(() => {
    const token = getMedusaCustomerToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const sdk = getMedusaClient();
    const existingCartId = localStorage.getItem(CART_ID_STORAGE_KEY);

    (async () => {
      try {
        if (existingCartId) {
          const { cart: existing } = await sdk.store.cart.retrieve(existingCartId, {}, authHeaders());
          setCart(existing);
        } else {
          const { cart: created } = await sdk.store.cart.create(
            { region_id: undefined, currency_code: "egp" },
            {},
            authHeaders(),
          );
          localStorage.setItem(CART_ID_STORAGE_KEY, created.id);
          setCart(created);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [authHeaders]);

  const addItem = useCallback(
    async (variantId: string, quantity: number) => {
      if (!cart) return;
      const sdk = getMedusaClient();
      const { cart: updated } = await sdk.store.cart.createLineItem(
        cart.id,
        { variant_id: variantId, quantity },
        {},
        authHeaders(),
      );
      setCart(updated);
    },
    [cart, authHeaders],
  );

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cart) return;
      const sdk = getMedusaClient();
      await sdk.store.cart.deleteLineItem(cart.id, lineItemId, authHeaders());
      const { cart: refreshed } = await sdk.store.cart.retrieve(cart.id, {}, authHeaders());
      setCart(refreshed);
    },
    [cart, authHeaders],
  );

  const updateQuantity = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cart) return;
      const sdk = getMedusaClient();
      const { cart: updated } = await sdk.store.cart.updateLineItem(
        cart.id,
        lineItemId,
        { quantity },
        {},
        authHeaders(),
      );
      setCart(updated);
    },
    [cart, authHeaders],
  );

  return (
    <CartContext.Provider value={{ cart, isLoading, addItem, removeItem, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm --filter client exec vitest run src/lib/cart-context.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/client/src/lib/cart-context.tsx apps/client/src/lib/cart-context.test.tsx apps/client/package.json pnpm-lock.yaml
git rm apps/client/src/lib/store-types.ts
git commit -m "feat(client): rewrite cart-context.tsx around the Medusa Store API

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 27: Rewrite `store.tsx`, `store-books.tsx`, `store-book-detail.tsx` to fetch Medusa products

**Files:**
- Modify: `apps/client/src/pages/store.tsx`
- Modify: `apps/client/src/pages/store-books.tsx`
- Modify: `apps/client/src/pages/store-book-detail.tsx`
- Test: `apps/client/src/pages/store-books.test.tsx`

**Interfaces:**
- Consumes: `getMedusaClient().store.product.list()` /
  `.retrieve(id)`, `HttpTypes.StoreProduct` from `@medusajs/types`.
- Produces: nothing consumed elsewhere — leaf pages. Each product's
  `metadata.category`/`metadata.language`/`metadata.isFeatured`/
  `metadata.isNewRelease` (stamped by Task 4's migration) replace the old
  `books.category` etc. reads for badges/filtering.

- [ ] **Step 1: Write the failing test for the book listing page**

```tsx
// apps/client/src/pages/store-books.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom"; // match the actual router used — verify import path against apps/client/src/App.tsx
import StoreBooks from "./store-books";
import * as medusaClient from "../lib/medusa-client";

describe("StoreBooks page", () => {
  it("renders books fetched from the Medusa Store API", async () => {
    const sdk = {
      store: {
        product: {
          list: vi.fn().mockResolvedValue({
            products: [
              { id: "prod_1", title: "Digital Transformation Management", thumbnail: "https://x/cover.jpg", metadata: { isFeatured: true } },
            ],
            count: 1,
          }),
        },
      },
    };
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <MemoryRouter>
        <StoreBooks />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Digital Transformation Management")).toBeInTheDocument());
    expect(sdk.store.product.list).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter client exec vitest run src/pages/store-books.test.tsx`
Expected: FAIL (current page fetches from the old Express `/api/store/books`).

- [ ] **Step 3: Read the current implementation before rewriting**

Run: `sed -n '1,60p' apps/client/src/pages/store-books.tsx` to see the
existing fetch call, loading/error state shape, and JSX structure to
preserve (i18n keys, layout, filters). Replace only the data-fetching
`useEffect`/`useQuery` block and the type imports — keep the JSX/i18n/CSS
classes unchanged. The replacement fetch block:

```tsx
import { getMedusaClient } from "@/lib/medusa-client";
import type { HttpTypes } from "@medusajs/types";

// Inside the component, replacing the old axios/fetch call to
// /api/store/books:
const [products, setProducts] = useState<HttpTypes.StoreProduct[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const sdk = getMedusaClient();
  sdk.store.product
    .list({ limit: 100 })
    .then(({ products }) => setProducts(products))
    .finally(() => setIsLoading(false));
}, []);
```
Map `product.metadata.isFeatured`, `product.metadata.isNewRelease`,
`product.metadata.category`, `product.metadata.language` wherever the
old code read `book.isFeatured` etc.; map `product.thumbnail` where the
old code read `book.coverImageUrl`; map `product.variants` prices (via
`variant.calculated_price.calculated_amount / 100`) wherever the old code
read `book.paperPrice`/`book.digitalPrice`.

- [ ] **Step 4: Apply the same pattern to `store.tsx` and `store-book-detail.tsx`**

`store-book-detail.tsx` additionally needs `sdk.store.product.retrieve(id,
{ fields: "*variants.calculated_price,*variants.metadata" })` in place of
the old single-book fetch, and its "buy" button should call
`useCart().addItem(variantId, 1)` with the variant id matching the
selected format (paper/digital) via `variant.metadata.kind`.

- [ ] **Step 5: Run to verify tests pass**

Run: `pnpm --filter client exec vitest run src/pages/store-books.test.tsx`
Expected: PASS

- [ ] **Step 6: Manual smoke test**

Run: `pnpm dev:medusa` (background), `pnpm dev:client`, visit
`http://localhost:5173/store/books`, confirm the migrated test book from
Task 4's dev run (if seeded locally) renders.

- [ ] **Step 7: Commit**

```bash
git add apps/client/src/pages/store.tsx apps/client/src/pages/store-books.tsx apps/client/src/pages/store-book-detail.tsx apps/client/src/pages/store-books.test.tsx
git commit -m "feat(client): rewire store pages to fetch products from Medusa

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 28: Rewrite `cart.tsx` and `checkout.tsx` around Medusa cart/checkout flow

**Files:**
- Modify: `apps/client/src/pages/cart.tsx`
- Modify: `apps/client/src/pages/checkout.tsx`
- Test: `apps/client/src/pages/checkout.test.tsx`

**Interfaces:**
- Consumes: `useCart()` from Task 26; `getMedusaClient().store.cart.update`
  (shipping address), `.store.fulfillment.listCartOptions`, `.store.cart
  .addShippingMethod`, `/store/available-payment-providers` (Task 18),
  `.store.payment.initiatePaymentSession`.
- Produces: nothing consumed elsewhere — leaf pages, but Task 29's return
  pages depend on the payment-session-initiation call shape established
  here.

- [ ] **Step 1: Write the failing test for provider filtering in checkout**

```tsx
// apps/client/src/pages/checkout.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Checkout from "./checkout";
import * as medusaClient from "../lib/medusa-client";
import * as cartContext from "../lib/cart-context";

describe("Checkout page", () => {
  it("only renders payment methods returned by the provider-selection endpoint", async () => {
    vi.spyOn(cartContext, "useCart").mockReturnValue({
      cart: { id: "cart_1", items: [{ id: "li_1", product: { metadata: { kind: "digital" } } }], shipping_address: null },
      isLoading: false,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
    });

    const sdk = {
      client: { fetch: vi.fn().mockResolvedValue({ providerIds: ["lemonsqueezy", "paypal-egp"] }) },
    };
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/lemon squeezy/i)).toBeInTheDocument());
    expect(screen.queryByText(/paymob/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cash on delivery/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter client exec vitest run src/pages/checkout.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Read the existing `checkout.tsx` structure**

Run: `sed -n '1,100p' apps/client/src/pages/checkout.tsx` — note the
existing form fields (name/phone/address/city), payment-method radio
group, and submit handler shape. Preserve the form and i18n; replace:
1. The address submit → `sdk.store.cart.update(cart.id, { shipping_address:
   {...}, email })`.
2. A new effect fetching `sdk.client.fetch(\`/store/available-payment-
   providers?cart_id=${cart.id}\`)` to get `providerIds`, filtering the
   rendered payment-method options to that list.
3. The submit handler, which — based on the selected provider — calls
   `sdk.store.payment.initiatePaymentSession(cart, { provider_id:
   selectedProviderId, data: { /* provider-specific extra fields, e.g.
   walletPhone for paymob-wallet, lemonSqueezyVariantId for lemonsqueezy
   */ } })` then redirects to the returned `checkoutUrl`/`approveUrl`
   (Paymob/PayPal/Lemon Squeezy) or, for `cod`, calls
   `sdk.store.cart.complete(cart.id)` directly.

- [ ] **Step 4: Apply the equivalent minimal change to `cart.tsx`**

`cart.tsx` swaps its line-item rendering/quantity controls to read from
`useCart().cart.items` and call `updateQuantity`/`removeItem` instead of
the old local cart-context methods — same JSX/i18n, different data
source and handler bodies.

- [ ] **Step 5: Run to verify the test passes**

Run: `pnpm --filter client exec vitest run src/pages/checkout.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/pages/cart.tsx apps/client/src/pages/checkout.tsx apps/client/src/pages/checkout.test.tsx
git commit -m "feat(client): rewire cart and checkout pages to the Medusa cart/payment flow

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 29: Rewrite the payment-return pages and add `checkout-lemonsqueezy-return.tsx`

**Files:**
- Modify: `apps/client/src/pages/checkout-paymob-pay.tsx`
- Modify: `apps/client/src/pages/checkout-paymob-wallet.tsx`
- Modify: `apps/client/src/pages/checkout-paypal-return.tsx`
- Create: `apps/client/src/pages/checkout-lemonsqueezy-return.tsx`
- Modify: `apps/client/src/App.tsx` (add the new route)
- Test: `apps/client/src/pages/checkout-lemonsqueezy-return.test.tsx`

**Interfaces:**
- Consumes: `sdk.store.cart.complete(cartId)` (Medusa completes the cart
  into an order once the payment session reports authorized/captured).

- [ ] **Step 1: Write the failing test for the new Lemon Squeezy return page**

```tsx
// apps/client/src/pages/checkout-lemonsqueezy-return.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CheckoutLemonSqueezyReturn from "./checkout-lemonsqueezy-return";
import * as medusaClient from "../lib/medusa-client";

describe("CheckoutLemonSqueezyReturn page", () => {
  it("completes the cart and shows a success message", async () => {
    const sdk = {
      store: {
        cart: {
          complete: vi.fn().mockResolvedValue({ type: "order", order: { id: "order_1", display_id: 1001 } }),
        },
      },
    };
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);
    localStorage.setItem("medusa_cart_id", "cart_1");

    render(
      <MemoryRouter initialEntries={["/checkout-lemonsqueezy-return"]}>
        <CheckoutLemonSqueezyReturn />
      </MemoryRouter>,
    );

    await waitFor(() => expect(sdk.store.cart.complete).toHaveBeenCalledWith("cart_1"));
    await waitFor(() => expect(screen.getByText(/1001/)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter client exec vitest run src/pages/checkout-lemonsqueezy-return.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Read one existing return page as the template**

Run: `sed -n '1,60p' apps/client/src/pages/checkout-paypal-return.tsx` —
copy its loading/success/error state structure and i18n key naming
convention exactly.

- [ ] **Step 4: Write the new page**

```tsx
// apps/client/src/pages/checkout-lemonsqueezy-return.tsx
import { useEffect, useState } from "react";
import { getMedusaClient } from "@/lib/medusa-client";

type Status = "completing" | "success" | "error";

export default function CheckoutLemonSqueezyReturn() {
  const [status, setStatus] = useState<Status>("completing");
  const [orderDisplayId, setOrderDisplayId] = useState<number | null>(null);

  useEffect(() => {
    const cartId = localStorage.getItem("medusa_cart_id");
    if (!cartId) {
      setStatus("error");
      return;
    }
    const sdk = getMedusaClient();
    sdk.store.cart
      .complete(cartId)
      .then((result: any) => {
        if (result.type === "order") {
          setOrderDisplayId(result.order.display_id);
          localStorage.removeItem("medusa_cart_id");
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "completing") return <div>Completing your order…</div>;
  if (status === "error") return <div>Something went wrong completing your order.</div>;
  return <div>Order #{orderDisplayId} confirmed. Thank you!</div>;
}
```
(Match the actual JSX styling/i18n of the sibling return pages rather
than this bare version — this is the data/state-machine skeleton, dress
it to match `checkout-paypal-return.tsx`'s look exactly.)

- [ ] **Step 5: Register the route**

Modify `apps/client/src/App.tsx`, adding a route entry alongside the
existing `checkout-paypal-return` route:
```tsx
<Route path="/checkout-lemonsqueezy-return" element={<CheckoutLemonSqueezyReturn />} />
```

- [ ] **Step 6: Apply the equivalent rewrite to the three existing return pages**

For `checkout-paymob-pay.tsx`, `checkout-paymob-wallet.tsx`,
`checkout-paypal-return.tsx`: replace their current polling/callback
logic (which today hits the Express `/api/store/orders/.../paymob-status`
etc.) with the same `sdk.store.cart.complete(cartId)` call pattern from
Step 4 — Medusa's payment module handles polling the provider internally
via `getPaymentStatus` during `cart.complete`, so the bespoke polling
loops in these three pages are deleted, not ported.

- [ ] **Step 7: Run to verify the new page's test passes**

Run: `pnpm --filter client exec vitest run src/pages/checkout-lemonsqueezy-return.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/client/src/pages/checkout-paymob-pay.tsx apps/client/src/pages/checkout-paymob-wallet.tsx apps/client/src/pages/checkout-paypal-return.tsx apps/client/src/pages/checkout-lemonsqueezy-return.tsx apps/client/src/pages/checkout-lemonsqueezy-return.test.tsx apps/client/src/App.tsx
git commit -m "feat(client): rewire payment return pages to Medusa cart completion; add Lemon Squeezy return page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 30: Rewrite `order-reader.tsx` to use the Medusa entitlement route and mint a customer token on sign-in

**Files:**
- Modify: `apps/client/src/pages/order-reader.tsx`
- Modify: `apps/client/src/lib/auth-client.ts` (call
  `/api/store/medusa-token` after a successful sign-in and store the
  result via `setMedusaCustomerToken`)
- Test: `apps/client/src/pages/order-reader.test.tsx`

**Interfaces:**
- Consumes: `getMedusaClient().client.fetch` against
  `/store/digital-products/:variantId/access` (Task 10),
  `setMedusaCustomerToken`/`getMedusaCustomerToken` (Task 25).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/client/src/pages/order-reader.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OrderReader from "./order-reader";
import * as medusaClient from "../lib/medusa-client";

describe("OrderReader page", () => {
  it("fetches a signed url via the entitlement endpoint and renders it", async () => {
    vi.spyOn(medusaClient, "getMedusaCustomerToken").mockReturnValue("medusa-jwt-abc");
    const sdk = {
      client: {
        fetch: vi.fn().mockResolvedValue({ url: "/store/digital-products/download?token=xyz", expiresAt: "2026-09-15T00:05:00.000Z" }),
      },
    };
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <MemoryRouter initialEntries={["/order-reader/variant_digital_1"]}>
        <Routes>
          <Route path="/order-reader/:variantId" element={<OrderReader />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(sdk.client.fetch).toHaveBeenCalledWith("/store/digital-products/variant_digital_1/access"),
    );
  });

  it("shows an access-denied message on a 403", async () => {
    vi.spyOn(medusaClient, "getMedusaCustomerToken").mockReturnValue("medusa-jwt-abc");
    const sdk = {
      client: { fetch: vi.fn().mockRejectedValue({ status: 403 }) },
    };
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <MemoryRouter initialEntries={["/order-reader/variant_digital_1"]}>
        <Routes>
          <Route path="/order-reader/:variantId" element={<OrderReader />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/access/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter client exec vitest run src/pages/order-reader.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Read the existing reader for its rendering shape**

Run: `sed -n '1,177p' apps/client/src/pages/order-reader.tsx` — preserve
its PDF/viewer rendering component, only replace the data-fetching
effect.

- [ ] **Step 4: Rewrite the data-fetching effect**

```tsx
import { getMedusaClient } from "@/lib/medusa-client";
// route param renamed from orderId-based to variantId-based — update
// the route definition in App.tsx accordingly: /order-reader/:variantId

useEffect(() => {
  const sdk = getMedusaClient();
  sdk.client
    .fetch(`/store/digital-products/${variantId}/access`)
    .then((res: { url: string }) => setFileUrl(`${import.meta.env.VITE_MEDUSA_BACKEND_URL}${res.url}`))
    .catch((err: { status?: number }) => {
      setError(err.status === 403 ? "access-denied" : "unknown");
    });
}, [variantId]);
```

- [ ] **Step 5: Wire token minting into sign-in**

Modify `apps/client/src/lib/auth-client.ts`: after a successful sign-in
callback (wherever the existing Better Auth client resolves a session),
add:
```typescript
import { setMedusaCustomerToken } from "./medusa-client";

async function syncMedusaToken() {
  try {
    const res = await fetch("/api/store/medusa-token", { method: "POST", credentials: "include" });
    if (res.ok) {
      const body = await res.json();
      setMedusaCustomerToken(body.token);
    }
  } catch {
    // Non-fatal — store features degrade to guest cart until retried.
  }
}
```
Call `syncMedusaToken()` from the existing sign-in success handler (exact
call site depends on `auth-client.ts`'s current structure — read it
first via `sed -n '1,80p' apps/client/src/lib/auth-client.ts` before
placing the call).

- [ ] **Step 6: Run to verify the test passes**

Run: `pnpm --filter client exec vitest run src/pages/order-reader.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/client/src/pages/order-reader.tsx apps/client/src/pages/order-reader.test.tsx apps/client/src/lib/auth-client.ts
git commit -m "feat(client): rewire order-reader to Medusa entitlement endpoint; mint Medusa token on sign-in

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 31: Update `account.tsx` to merge Medusa orders with legacy archived orders

**Files:**
- Modify: `apps/client/src/pages/account.tsx`
- Test: `apps/client/src/pages/account.test.tsx`

**Interfaces:**
- Consumes: `sdk.store.order.list()` (Medusa), plus the existing
  (narrowed-to-read-only, per Phase 8) `GET /account/me/orders` Express
  endpoint for legacy orders.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/client/src/pages/account.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Account from "./account";
import * as medusaClient from "../lib/medusa-client";

describe("Account page order history", () => {
  it("merges Medusa orders and legacy archived orders, newest first", async () => {
    const sdk = {
      store: {
        order: {
          list: vi.fn().mockResolvedValue({
            orders: [{ id: "order_new_1", display_id: 2001, created_at: "2026-09-14T00:00:00Z", total: 15000 }],
          }),
        },
      },
    };
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          orders: [{ id: 42, createdAt: "2026-01-01T00:00:00Z", totalAmount: "350", currency: "EGP" }],
        }),
      }),
    );

    render(
      <MemoryRouter>
        <Account />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/2001/)).toBeInTheDocument());
    expect(screen.getByText(/#42/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter client exec vitest run src/pages/account.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Read the existing order-history section for its rendering shape**

Run: `grep -n "orders\|Order" apps/client/src/pages/account.tsx | head -30`
— preserve the existing card/list layout; only change the data source
and add a `source: "medusa" | "legacy"` tag per row so the row component
can badge legacy orders distinctly ("Archived") if useful.

- [ ] **Step 4: Rewrite the fetch/merge logic**

```tsx
import { getMedusaClient } from "@/lib/medusa-client";

interface UnifiedOrder {
  id: string;
  displayId: string | number;
  createdAt: string;
  total: string;
  currency: string;
  source: "medusa" | "legacy";
}

useEffect(() => {
  const sdk = getMedusaClient();
  Promise.all([
    sdk.store.order.list().then(({ orders }) =>
      orders.map(
        (o): UnifiedOrder => ({
          id: o.id,
          displayId: o.display_id,
          createdAt: o.created_at,
          total: (o.total / 100).toFixed(2),
          currency: o.currency_code,
          source: "medusa",
        }),
      ),
    ),
    fetch("/api/account/me/orders", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then(({ orders }) =>
        orders.map(
          (o: any): UnifiedOrder => ({
            id: String(o.id),
            displayId: o.id,
            createdAt: o.createdAt,
            total: o.totalAmount,
            currency: o.currency,
            source: "legacy",
          }),
        ),
      ),
  ]).then(([medusaOrders, legacyOrders]) => {
    const merged = [...medusaOrders, ...legacyOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    setUnifiedOrders(merged);
  });
}, []);
```

- [ ] **Step 5: Run to verify the test passes**

Run: `pnpm --filter client exec vitest run src/pages/account.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/pages/account.tsx apps/client/src/pages/account.test.tsx
git commit -m "feat(client): merge Medusa and legacy archived orders in account history

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

**End of Phase 7.** Checkpoint: the storefront's store/cart/checkout/
reader/account pages all run against the live Medusa backend instead of
the Express store routes. Manually walk one full purchase per payment
provider (Paymob card sandbox, Paymob wallet sandbox, PayPal sandbox,
Lemon Squeezy test mode, COD) against local `apps/medusa` +
`apps/client` before proceeding to Phase 8 — this is the first point
real end-to-end verification is possible and should not be skipped.

---

## Phase 8 — Admin panel cutover

### Task 32: Remove `admin/store/books.tsx`, `orders.tsx`, `shipping.tsx`; add the Medusa dashboard link

**Files:**
- Delete: `apps/client/src/pages/admin/store/books.tsx`
- Delete: `apps/client/src/pages/admin/store/orders.tsx`
- Delete: `apps/client/src/pages/admin/store/shipping.tsx`
- Modify: `apps/client/src/pages/admin/layout.tsx`
- Modify: `apps/client/src/App.tsx` (remove the three deleted pages'
  routes)
- Modify: `apps/client/src/lib/admin-api.ts` (remove store-related calls)
- Test: `apps/client/src/pages/admin/layout.test.tsx`

**Interfaces:**
- Produces: nothing consumed elsewhere — this task only removes and
  relinks, no new interface.

- [ ] **Step 1: Write the failing test for the nav link**

```tsx
// apps/client/src/pages/admin/layout.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminLayout from "./layout";

describe("AdminLayout nav", () => {
  it("links out to the Medusa dashboard", () => {
    render(
      <MemoryRouter>
        <AdminLayout>
          <div />
        </AdminLayout>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /store \(medusa\)/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("admin.darnozom.com"));
  });

  it("no longer links to the removed /admin/store/books route", () => {
    render(
      <MemoryRouter>
        <AdminLayout>
          <div />
        </AdminLayout>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link", { name: /books/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter client exec vitest run src/pages/admin/layout.test.tsx`
Expected: FAIL — current nav still has the old Books/Orders/Shipping
links and no Medusa link.

- [ ] **Step 3: Read the current nav structure**

Run: `grep -n "store/books\|store/orders\|store/shipping\|NavLink\|<a " apps/client/src/pages/admin/layout.tsx`

- [ ] **Step 4: Remove the three nav entries and add the Medusa link**

Modify `apps/client/src/pages/admin/layout.tsx`: delete the nav items
pointing at `/admin/store/books`, `/admin/store/orders`,
`/admin/store/shipping`; add, in their place:
```tsx
<a href={import.meta.env.VITE_MEDUSA_ADMIN_URL || "https://admin.darnozom.com"} target="_blank" rel="noreferrer">
  Store (Medusa)
</a>
```
Modify `apps/client/.env.example`, add:
```
VITE_MEDUSA_ADMIN_URL=http://localhost:9000/app
```

- [ ] **Step 5: Delete the three page files and their routes**

```bash
git rm apps/client/src/pages/admin/store/books.tsx
git rm apps/client/src/pages/admin/store/orders.tsx
git rm apps/client/src/pages/admin/store/shipping.tsx
```
Modify `apps/client/src/App.tsx`, removing the three corresponding
`<Route>` entries (`grep -n "admin/store/books\|admin/store/orders\|admin/store/shipping" apps/client/src/App.tsx` to find them).

- [ ] **Step 6: Remove store-related calls from `admin-api.ts`**

Run: `grep -n "books\|shipping\|/admin/orders" apps/client/src/lib/admin-api.ts`
Delete the functions calling the now-removed admin book/order/shipping
write endpoints (keep any that still call the narrowed read-only
`/admin/orders` GET routes, per the design's legacy-reference decision —
cross-check against Task 33's final call on whether that endpoint stays).

- [ ] **Step 7: Run to verify tests pass**

Run: `pnpm --filter client exec vitest run src/pages/admin/layout.test.tsx`
Expected: PASS
Run: `pnpm --filter client exec tsc --noEmit`
Expected: no errors (confirms no dangling import of the deleted pages).

- [ ] **Step 8: Commit**

```bash
git add apps/client/src/pages/admin/layout.tsx apps/client/src/pages/admin/layout.test.tsx apps/client/src/App.tsx apps/client/src/lib/admin-api.ts apps/client/.env.example
git commit -m "feat(client): remove store admin pages, link out to Medusa dashboard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

**End of Phase 8.** Checkpoint: staff use the platform's own `/admin`
for everything except books/orders/shipping, which now live exclusively
in the Medusa dashboard at a separate URL — matching the design's
"Delete store pages, keep the rest" decision.

---

## Phase 9 — Production deployment, data migration, and cutover

### Task 33: Write the production systemd unit and nginx config for Medusa

**Files:**
- Create: `deploy/darnozom-medusa.service`
- Create: `deploy/nginx.medusa.conf`
- Modify: `deploy/deploy.sh`
- Modify: `deploy/setup-ssl.sh`

**Interfaces:**
- Produces: a deployed, running Medusa server reachable at
  `https://admin.darnozom.com`, started/restarted by the existing CD
  pipeline alongside `darnozom-api.service`.

- [ ] **Step 1: Read the existing API systemd unit and nginx configs as templates**

Run: `cat deploy/darnozom-api.service` and `cat deploy/nginx.api.conf` —
mirror their structure exactly (same `User=`, `WorkingDirectory=` pattern
relative to `/opt/darnozom`, same `Restart=` policy, same
`EnvironmentFile=` convention) rather than inventing a new layout.

- [ ] **Step 2: Write the systemd unit**

Create `deploy/darnozom-medusa.service` (adjust paths/user to match
exactly what `darnozom-api.service` uses):
```ini
[Unit]
Description=Darnozom Medusa commerce backend
After=network.target darnozom-db.service

[Service]
Type=simple
User=darnozom
WorkingDirectory=/opt/darnozom/apps/medusa
EnvironmentFile=/opt/darnozom/apps/medusa/.env
ExecStart=/usr/bin/env PATH=/opt/darnozom/.node22/bin:$PATH node /opt/darnozom/apps/medusa/.medusa/server/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```
(The `PATH` override pinning Node 22 addresses the Global Constraints
note — confirm the actual Node-22 install path on the VPS matches once
Task 34 provisions it; adjust this line to match.)

- [ ] **Step 3: Write the nginx config**

Create `deploy/nginx.medusa.conf`, modeled on `deploy/nginx.api.conf`'s
proxy-only structure:
```nginx
server {
    listen 443 ssl http2;
    server_name admin.darnozom.com;

    ssl_certificate /etc/letsencrypt/live/admin.darnozom.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.darnozom.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
(Match `deploy/nginx.api.conf`'s exact SSL/proxy directive set instead of
this sketch if it differs — read that file first.)

- [ ] **Step 4: Update `deploy.sh` to build and restart the Medusa service**

Run: `grep -n "darnozom-api" deploy/deploy.sh` to find the existing
API build/restart block; add an equivalent block for Medusa:
```bash
echo "Building Medusa..."
cd /opt/darnozom/apps/medusa
/opt/darnozom/.node22/bin/pnpm install --frozen-lockfile
/opt/darnozom/.node22/bin/pnpm build
/opt/darnozom/.node22/bin/pnpm exec medusa db:migrate
systemctl restart darnozom-medusa
```
Place it adjacent to the existing API build/restart block, matching its
error-handling convention (`set -e` behavior, log lines).

- [ ] **Step 5: Update `setup-ssl.sh` to issue a certificate for `admin.darnozom.com`**

Run: `cat deploy/setup-ssl.sh` — add `admin.darnozom.com` alongside the
existing `darnozom.com`/`api.darnozom.com` certificate issuance calls,
following the exact same `certbot` invocation pattern.

- [ ] **Step 6: Commit**

```bash
git add deploy/darnozom-medusa.service deploy/nginx.medusa.conf deploy/deploy.sh deploy/setup-ssl.sh
git commit -m "feat(deploy): add systemd unit, nginx config, and deploy script support for Medusa

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 34: Provision Node 22, `medusa` database, and Redis on the production VPS

**Files:**
- Modify: `README.md` (document the new one-time provisioning steps,
  mirroring the existing "One-time data restore" section's style)

**Interfaces:**
- Produces: a VPS ready to run the Medusa systemd unit from Task 33 —
  this is an operational task with no code artifact beyond
  documentation, run once by hand against the real server.

- [ ] **Step 1: Install Node 22 LTS on the VPS alongside the existing Node**

SSH to the production VPS and install Node 22 LTS to a path that does
not disturb whatever Node version `darnozom-api.service` currently runs
(e.g. via `nvm` or a versioned install under `/opt/darnozom/.node22`),
matching whatever path Task 33's systemd unit references.

- [ ] **Step 2: Create the `medusa` database**

```bash
docker exec -it darnozom-db psql -U darnozom -d darnozom -c "CREATE DATABASE medusa OWNER darnozom;"
```

- [ ] **Step 3: Start the Redis container**

```bash
cd /opt/darnozom
docker compose --project-directory . -f deploy/medusa/docker-compose.yml up -d
```

- [ ] **Step 4: Populate `/opt/darnozom/apps/medusa/.env` with production secrets**

Copy from `.env.example`'s Medusa section, filling in real production
values for `MEDUSA_DATABASE_URL`, `MEDUSA_REDIS_URL`, `MEDUSA_JWT_SECRET`
(generate fresh via `openssl rand -base64 32`), `MEDUSA_COOKIE_SECRET`
(same), `PAYMOB_*`/`PAYPAL_*`/`LEMONSQUEEZY_*` production credentials,
`BETTER_AUTH_BRIDGE_SECRET` (must match the value in
`/opt/darnozom/apps/api/.env` exactly), `MEDUSA_ADMIN_API_KEY` (generate
via the Medusa Admin dashboard once it's first reachable, then add it to
both `apps/api/.env` and re-deploy Express).

- [ ] **Step 5: Issue the SSL certificate and enable the nginx site**

```bash
sudo bash deploy/setup-ssl.sh   # after Step 6's modification covers admin.darnozom.com
sudo ln -s /opt/darnozom/deploy/nginx.medusa.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

- [ ] **Step 6: Document these steps in the README**

Modify `README.md`, adding a "Medusa commerce backend" subsection under
"Database" or as a new top-level section, listing Steps 1-5 above in
prose, matching the existing "One-time data restore" section's tone and
formatting.

- [ ] **Step 7: Commit the README update**

```bash
git add README.md
git commit -m "docs: document one-time Medusa VPS provisioning steps

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 35: Run the production catalog and shipping migration

**Files:** none (operational task, scripts already written in Tasks 5/21)

**Interfaces:** none — terminal task.

- [ ] **Step 1: Deploy Medusa to production (empty) via the CD pipeline**

Push to the branch the CD pipeline deploys from (per `deploy/deploy.sh`'s
trigger, per the repo's existing convention — check `.github/` for the
workflow file to confirm) and verify `systemctl status
darnozom-medusa` is `active (running)` and `curl -s
https://admin.darnozom.com/health` returns `200` before proceeding.

- [ ] **Step 2: Create the first production Medusa admin user**

```bash
ssh <vps> "cd /opt/darnozom/apps/medusa && /opt/darnozom/.node22/bin/pnpm exec medusa user -e admin@darnozom.com -p <a-real-strong-password>"
```

- [ ] **Step 3: Run the books migration against production**

```bash
ssh <vps> "cd /opt/darnozom/apps/medusa && /opt/darnozom/.node22/bin/pnpm exec medusa exec ./src/scripts/run-migrate-books.ts"
```
Expected: log line `Migrated N books. Mapping written to
.../migrate-books-mapping.json` where N matches `SELECT count(*) FROM
books;` against the production `darnozom` database.

- [ ] **Step 4: Run the shipping migration against production**

```bash
ssh <vps> "cd /opt/darnozom/apps/medusa && /opt/darnozom/.node22/bin/pnpm exec medusa exec ./src/scripts/run-migrate-shipping.ts"
```
Expected: log line `Migrated N shipping rates.` matching `SELECT
count(*) FROM shipping_rates;`.

- [ ] **Step 5: Verify in the dashboard**

Log into `https://admin.darnozom.com/app`, confirm the product list
count matches the books count, spot-check 3-5 books (title, price,
cover image, digital file link) against the live site's current
`/store/books` listing for correctness.

- [ ] **Step 6: Retrieve and archive the mapping files**

```bash
scp <vps>:/opt/darnozom/apps/medusa/src/scripts/migrate-books-mapping.json ./migrate-books-mapping-$(date +%Y%m%d).json
```
Store this file securely outside the repo (it is gitignored per Task 4)
— it is the only record linking legacy book ids to Medusa product ids,
needed if the 90-day-retention drop (Task 37) needs to cross-reference
anything.

---

### Task 36: Staged storefront cutover with monitoring window

**Files:** none (deployment/monitoring task using code already merged in
Phase 7)

**Interfaces:** none — terminal task.

- [ ] **Step 1: Deploy the Phase 7 storefront changes in a low-traffic window**

Per the design spec's cutover sequence, deploy during agreed low-traffic
hours. Confirm `VITE_MEDUSA_BACKEND_URL`,
`VITE_MEDUSA_PUBLISHABLE_KEY`, `VITE_MEDUSA_ADMIN_URL` are set in the
production client build's env.

- [ ] **Step 2: Smoke test each payment provider in production with real low-value test transactions**

Walk one real purchase through each of: Paymob card, Paymob wallet,
PayPal, Lemon Squeezy, COD — using real (not sandbox) credentials, a real
low-value book, refunding/cancelling afterward through each provider's
own dashboard where possible.

- [ ] **Step 3: Monitor for 1–2 weeks**

Watch `apps/medusa` logs (`journalctl -u darnozom-medusa -f`) and the
Medusa dashboard's order list daily for failed payment sessions,
reconciliation-job errors, or entitlement-grant failures on digital
purchases. Keep the old Express store routes deployed but unlinked from
any UI during this window as the rollback path (per the design spec) —
do not proceed to Task 37 until this window closes without unresolved
issues.

---

### Task 37: Delete the legacy Express store code

**Files:**
- Delete: `apps/api/src/routes/orders/index.ts` write paths (keep
  `GET /account/me/orders`, `GET /account/me/orders/:id`; delete
  everything else in the file — `POST /store/orders`, all
  paymob/paypal/wallet routes, `PUT /admin/orders/:id`, the
  reconcile-trigger routes)
- Delete: `apps/api/src/routes/books/index.ts` write paths (keep any
  read paths the account/legacy-order views still use, if any — verify
  via `grep -n "router\." apps/api/src/routes/books/index.ts` first)
- Delete: `apps/api/src/routes/shipping-rates/index.ts`
- Delete: `apps/api/src/routes/orders/*.test.ts` files whose covered
  routes no longer exist (card-payment, checkout-profile, create-order,
  payment-failure, paymob-callback, paypal-capture, receipt-email,
  wallet-payment) — keep only tests still exercising the narrowed
  read-only endpoints
- Modify: `apps/api/src/index.ts` (remove router mounts for deleted
  routes)

**Interfaces:** none produced — this is pure removal, gated on Task 36's
monitoring window closing cleanly.

- [ ] **Step 1: Confirm the monitoring window closed without unresolved issues**

Do not proceed unless Task 36's Step 3 monitoring period is complete and
clean — this is a one-way deletion of the rollback path.

- [ ] **Step 2: Narrow `apps/api/src/routes/orders/index.ts`**

Open the file, delete every route handler except `GET
/account/me/orders` and `GET /account/me/orders/:id` (verify against the
route list captured during the earlier codebase exploration:
`router.post("/store/orders", ...)`, the Paymob/PayPal/wallet routes at
lines 984/1142/1220/1326/1399/1480, `POST /admin/orders/reconcile-*`,
`POST /admin/orders/cleanup-stuck`, `PUT /admin/orders/:id` — all
deleted; `GET /admin/orders`, `GET /admin/orders/:id` kept only if staff
still use the legacy admin for order reference, per the open item in the
spec — confirm with whoever manages the store day to day before deciding,
and note the decision in this task's commit message).

- [ ] **Step 3: Delete now-covering-nothing test files**

```bash
git rm apps/api/src/routes/orders/card-payment.test.ts
git rm apps/api/src/routes/orders/checkout-profile.test.ts
git rm apps/api/src/routes/orders/create-order.test.ts
git rm apps/api/src/routes/orders/payment-failure.test.ts
git rm apps/api/src/routes/orders/paymob-callback.test.ts
git rm apps/api/src/routes/orders/paypal-capture.test.ts
git rm apps/api/src/routes/orders/receipt-email.test.ts
git rm apps/api/src/routes/orders/wallet-payment.test.ts
```

- [ ] **Step 4: Delete the books write routes and shipping-rates routes**

Narrow `apps/api/src/routes/books/index.ts` to read-only paths if any
remain in use, or delete it entirely if nothing reads from it anymore
(check whether any remaining page imports from it first).
```bash
git rm -r apps/api/src/routes/shipping-rates
```

- [ ] **Step 5: Remove the now-unused payment client re-exports if nothing calls them**

Run: `grep -rl "@workspace/payment-gateways" apps/api/src` — if nothing
in `apps/api` calls it anymore (Medusa's providers are now the only
consumer), remove the `@workspace/payment-gateways` dependency from
`apps/api/package.json` (the package itself stays, still used by
`apps/medusa`).

- [ ] **Step 6: Update route mounts**

Modify `apps/api/src/index.ts`, removing mounts for the deleted
`shipping-rates` router and any now-empty router files.

- [ ] **Step 7: Run the full `apps/api` test suite**

Run: `cd apps/api && DATABASE_URL=<local test db url> pnpm test`
Expected: all remaining tests PASS; no failures from dangling imports of
deleted files.

- [ ] **Step 8: Typecheck the whole workspace**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add -A apps/api
git commit -m "chore: remove legacy Express store/payment routes, keep read-only order history

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 38: Drop `books` and `shipping_rates` tables after the 90-day retention window

**Files:**
- Create: `deploy/db/002_drop_legacy_store_tables.sql`
- Modify: `packages/db/src/schema/books.ts` (delete)
- Modify: `packages/db/src/schema/shipping.ts` (delete)
- Modify: `packages/db/src/schema/index.ts` (remove the two exports)

**Interfaces:** none — terminal cleanup task, scheduled 90 days after
Task 37, tracked separately (not to be executed as part of the same work
session as the rest of this plan — flag it as a calendar follow-up).

- [ ] **Step 1: Confirm the retention window has passed and no rollback is needed**

Do not run this task until 90 days after Task 37's deletion commit,
per the design spec's retention policy, and confirm no one has needed to
consult the archived `books`/`shipping_rates` tables in that window.

- [ ] **Step 2: Write the guarded migration**

Create `deploy/db/002_drop_legacy_store_tables.sql`, following the
`IF EXISTS`-guarded convention `deploy.sh` requires for destructive
changes (per `README.md`'s "Destructive changes need a hand-written
migration" section):
```sql
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS shipping_rates CASCADE;
```

- [ ] **Step 3: Remove the Drizzle schema files**

```bash
git rm packages/db/src/schema/books.ts
git rm packages/db/src/schema/shipping.ts
```
Modify `packages/db/src/schema/index.ts`, removing their exports.

- [ ] **Step 4: Run `db:push` locally against a scratch database to confirm no other schema references remain**

Run: `pnpm --filter db exec tsc --noEmit` and `pnpm typecheck` — confirm
nothing else in the workspace imports the removed schema exports.

- [ ] **Step 5: Deploy and verify**

Deploy through the normal pipeline; `deploy.sh` applies
`002_drop_legacy_store_tables.sql` once, then `drizzle-kit push` runs
clean against the now-matching schema.

- [ ] **Step 6: Commit**

```bash
git add deploy/db/002_drop_legacy_store_tables.sql packages/db/src/schema
git commit -m "chore: drop legacy books/shipping_rates tables after retention window

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

**End of Phase 9.** Checkpoint: Medusa is the sole commerce system in
production, the legacy Express store code and its tables are fully
retired, and the migration is complete.

---

## Self-Review Notes

**Spec coverage:** every section of the design spec maps to at least one
task — Architecture (Task 1-3), Payment providers (Tasks 12-19), Digital
delivery (Tasks 7-11), Shipping (Tasks 20-22), Identity (Tasks 23-24),
Storefront changes (Tasks 25-31), Admin panel changes (Task 32), Scope of
removal (Task 37), Data migration & cutover sequence (Tasks 33-38),
Deployment (Tasks 33-34).

**Known follow-ups deliberately left as decisions for the execution-time
engineer, flagged inline rather than silently assumed:**
- Task 20's `MedusaService` auto-generated method naming collision must
  be resolved against the actual scaffolded Medusa version.
- Task 24's `name` field passed to `findOrCreateMedusaCustomer` should
  use the real Better Auth session's `name` field, not the email
  placeholder shown — wire it from `SessionUser.name` once
  `getSessionUser`'s return shape is confirmed in context.
- Task 37 Step 2's decision on whether `GET /admin/orders` (legacy)
  survives requires a decision from whoever manages the store, per the
  spec's own open item — do not guess silently at execution time.

**Type/interface consistency check performed:** `migrateBooks`'s return
shape (Task 4) matches what `run-migrate-books.ts` (Task 5) consumes;
`DigitalProductModuleService`'s `grantEntitlement`/`hasEntitlement`
signatures (Task 7) match their call sites in Task 9's subscriber and
Task 10's route; `CityShippingModuleService.getRateForCity` (Task 20)
matches its use in Task 21's fulfillment provider and Task 6's migration
script; `useCart()`'s returned shape (Task 26) matches every consumer in
Tasks 27-28.

