# Darnozom

Monorepo for Darnozom (دار نظم): the React + Vite website and the Express API
that backs it, deployed together to a single VPS with Postgres in Docker.

**Live:** https://darnozom.com/ · **API:** https://api.darnozom.com/

## Monorepo layout

```
apps/
  client/            React + Vite SPA (was the repo root)
  api/               Express API, bundled with esbuild -> dist/index.mjs
packages/
  db/                Drizzle schema + pg pool  (@workspace/db)
  api-zod/           Shared zod request/response schemas (@workspace/api-zod)
  ai-server/         OpenAI client wrapper (@workspace/ai-server)
deploy/
  db/docker-compose.yml   Postgres 16 — same file for local dev and production
  nginx.conf              darnozom.com: static SPA + /api proxy
  nginx.api.conf          api.darnozom.com: proxy only (installed once its cert exists)
  nginx.bootstrap.conf    HTTP-only config used before the first certificate
  setup-ssl.sh            Issues/renews two separate certificates
  darnozom-api.service    systemd unit for the API
  deploy.sh               Everything the CD pipeline runs on the server
```

## Local development

Requires Node 22+, pnpm 10, and Docker.

```bash
pnpm install
cp .env.example .env          # root: database + API settings
cp apps/client/.env.example apps/client/.env   # client: VITE_* settings

pnpm dev:db                   # start Postgres 16 in Docker
pnpm db:push                  # create/sync the schema
pnpm dev:api                  # API on http://localhost:8080
pnpm dev:client               # SPA on http://localhost:5173
```

Vite proxies `/api` to `VITE_API_PROXY_TARGET`, so point that at the API port.

**Port conflicts:** `POSTGRES_PORT` in the root `.env` sets the host port for the
container. If you already run Postgres natively on 5432, set it to something
free (5433, 5434…) and match it in `DATABASE_URL`.

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:db` / `dev:db:down` / `dev:db:logs` | Postgres container lifecycle |
| `pnpm dev:client` / `pnpm dev:api` | Run one app in dev |
| `pnpm build` | Typecheck, then build every package |
| `pnpm build:client` / `pnpm build:api` | Build one app |
| `pnpm typecheck` | Typecheck the whole workspace |
| `pnpm db:push` | `drizzle-kit push` against `DATABASE_URL` |
| `pnpm test` | Run all package tests |

### Tests

The API suite (101 tests) is integration-style: it needs a real `DATABASE_URL`
and **writes rows** to that database.

```bash
cd apps/api
DATABASE_URL=postgresql://darnozom:darnozom@localhost:5434/darnozom pnpm test
```

Never point it at production.

## Database

Postgres 16 runs in Docker in **both** environments from the same
`deploy/db/docker-compose.yml`, bound to `127.0.0.1` only.

Schema changes are applied with `drizzle-kit push` (diff the live DB against
`packages/db/src/schema`), not with the numbered files in `packages/db/drizzle/`
— those are historical artifacts of the original Replit project and are not
replayed by this pipeline.

### One-time data restore

`dar-website/backup.sql` (real store/orders data) is **not committed** — it
contains customer PII. To carry it over, copy it to the server once, before the
first deploy:

```bash
scp backup.sql root@13.140.148.197:/opt/darnozom/db/backup.sql
```

On the next deploy `deploy.sh` restores it and writes `/opt/darnozom/db/.seeded`;
every later deploy skips the step. The restore also handles two quirks of that
dump automatically:

- it references Neon roles (`neondb_owner`, `neon_superuser`, `cloud_admin`)
  that don't exist on stock Postgres — they're created as no-login roles first;
- `books.category` is already `text` but its `DEFAULT` still casts through the
  orphaned `book_category` enum, which otherwise makes `drizzle-kit push` fail
  with *"cannot drop type book_category because other objects depend on it"* —
  the default is rewritten and the dead type dropped.

To force a re-import (destructive), delete `/opt/darnozom/db/.seeded` and redeploy.

## Production CI/CD

Pushing to the `production` branch runs `.github/workflows/deploy-production.yml`:

1. Install, typecheck, build both apps
2. Upload `apps/client/dist` → `/var/www/darnozom`
3. Upload `apps/api/dist` (+ `package.runtime.json` as `dist/package.json`) → `/opt/darnozom/api`
4. Upload `packages/db/src` → `/opt/darnozom/db-schema` and `deploy/` → `/opt/darnozom/deploy`
5. Run `deploy.sh` over SSH, which does:
   Postgres container up → wait for `pg_isready` → one-time restore →
   `drizzle-kit push` → install API externals → write `/etc/darnozom-api.env` →
   `systemctl restart darnozom-api` → **gate on `/api/healthz` returning 200** →
   issue/renew certificates → reload nginx
6. Smoke-test both domains

The deploy fails loudly if Postgres never becomes ready or the API doesn't pass
its health check.

### GitHub Secrets

Repo → **Settings → Secrets and variables → Actions**.

**Required**

| Secret | Value |
|--------|--------|
| `DEPLOY_HOST` | `13.140.148.197` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | Full deploy **private** key (entire PEM) |
| `POSTGRES_PASSWORD` | Password for the `darnozom` database role |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_…`) — used by both the client build and the API |

**Optional**

| Secret | Default / effect if unset |
|--------|---------------------------|
| `DEPLOY_DOMAIN` | `darnozom.com` |
| `API_DOMAIN` | `api.darnozom.com` |
| `DEPLOY_SSL_EMAIL` | `info@darnozom.com` |
| `CLERK_SECRET_KEY` | Auth disabled; protected routes answer 401 |
| `ADMIN_EMAILS`, `ADMIN_CLERK_USER_IDS` | No bootstrap admins seeded |
| `AI_INTEGRATIONS_OPENAI_API_KEY` / `_BASE_URL` | AI routes fail on call; server still boots |
| `PAYMOB_*` | Card + wallet checkout disabled |
| `PAYPAL_CLIENT_ID` / `_SECRET` / `PAYPAL_ENVIRONMENT` | PayPal checkout disabled |
| `GOOGLE_CALENDAR_*` | Consultation calendar sync disabled |
| `RESEND_API_KEY` | Transactional email disabled |
| `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` | Object storage uploads disabled |
| `BOOKS_ADMIN_SECRET` | Book import endpoint disabled |
| `PUBLIC_SITE_URL` | Used in generated links/emails |

Every optional secret is genuinely optional: the API boots and serves all
unrelated routes without it, and only the specific feature fails.

Never commit private keys or server passwords.

## Domains

- `darnozom.com` serves the SPA and proxies `/api/` to `127.0.0.1:8080`, so the
  frontend's relative `fetch("/api/…")` calls stay same-origin.
- `api.darnozom.com` proxies everything to the same process, for webhooks and
  payment-provider callbacks. Paths are identical — `/api/healthz`, not `/healthz`.
- The two domains use **separate** certificates on purpose, so a DNS problem on
  the API subdomain can never block renewing the main site's certificate. If
  `api.darnozom.com` doesn't resolve yet, the deploy logs a warning, skips that
  server block, and leaves the main site untouched — re-deploy once DNS is live.
- HTTP redirects to HTTPS; certs auto-renew via `certbot.timer`.

## Known limitations

These features are wired but inert until their credentials are supplied:
object storage uploads, PayPal and Paymob checkout, Google Calendar sync,
Resend email, and all OpenAI-backed routes.

The API also carries Replit-specific fallbacks (`objectStorage.ts`,
`paypal.ts`'s connector lookup, `email.ts`'s domain guess) inherited from the
original project. They're inert outside Replit and are left in place rather than
rewritten.
