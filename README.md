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
pnpm db:seed:users            # create the dev sign-in accounts
pnpm dev:api                  # API on http://localhost:8087
pnpm dev:client               # SPA on http://localhost:5173
```

### Auth

Auth is self-hosted — no external provider and no publishable key, so the
client needs no auth configuration at all. Set `BETTER_AUTH_SECRET` in the root
`.env` (any random string locally; `openssl rand -base64 32` for real use).

`pnpm db:seed:users` creates one account per role, all pre-verified, sharing the
password `darnozom-dev-1234`:

| Email | Role |
|-------|------|
| `superadmin@darnozom.test` | `super_admin` |
| `admin@darnozom.test` | `admin` |
| `consultant@darnozom.test` | `consultant` |
| `client@darnozom.test` | `client` |

Sign-ups outside the seed require email verification, which needs
`RESEND_API_KEY`. Without it the send is skipped and logged — mark the account
verified by hand to sign in:

```bash
docker exec -i darnozom-db psql -U darnozom -d darnozom \n  -c "UPDATE users SET email_verified = true WHERE email='you@example.com';"
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
| `pnpm db:seed:users` | Create the four dev accounts below (refuses to run with `NODE_ENV=production`) |
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

**Destructive changes need a hand-written migration.** `deploy.sh` runs push
with stdin closed so it fails loudly rather than silently dropping data, which
means drops and column removals are refused. Put those in a numbered file in
`deploy/db/` (e.g. `001_own_auth.sql`); `deploy.sh` applies each one once before
the push, tracked by a marker in `/opt/darnozom/db/`. Write every statement
`IF EXISTS`-guarded so a re-run is harmless.

### One-time data restore

`dar-website/backup.sql` (real store/orders data) is **not committed** — it
contains customer PII. Copy it to the server once, before the first deploy:

```bash
scp backup.sql root@13.140.148.197:/opt/darnozom/db/backup.sql
```

This has already been done for the current VPS. On the next deploy `deploy.sh`
restores it and writes `/opt/darnozom/db/.seeded`; every later deploy skips
the step. The restore also handles two quirks of that dump automatically:

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
   **install Docker if missing** → Postgres container up → wait for `pg_isready` →
   one-time restore → `drizzle-kit push` → install API externals → write
   `/etc/darnozom-api.env` → `systemctl restart darnozom-api` → **gate on
   `/api/healthz` returning 200** → issue/renew certificates → reload nginx
6. Smoke-test both domains

The deploy fails loudly if Postgres never becomes ready or the API doesn't pass
its health check. Docker itself is no longer a manual pre-req: `deploy.sh`
detects a missing `docker` / `docker compose` and installs them via
get.docker.com before continuing.

### GitHub Secrets

Repo → **Settings → Secrets and variables → Actions**.

**Required**

| Secret | Value |
|--------|--------|
| `DEPLOY_HOST` | `13.140.148.197` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | Full deploy **private** key (entire PEM) |
| `POSTGRES_PASSWORD` | Password for the `darnozom` database role |
| `BETTER_AUTH_SECRET` | Signing key for session cookies. Generate with `openssl rand -base64 32`. The API **refuses to boot** in production without it |

**Optional**

| Secret | Default / effect if unset |
|--------|---------------------------|
| `DEPLOY_DOMAIN` | `darnozom.com` |
| `API_DOMAIN` | `api.darnozom.com` |
| `DEPLOY_SSL_EMAIL` | `info@darnozom.com` |
| `ADMIN_EMAILS` | No bootstrap admins granted; nobody can reach `/admin` on a fresh database |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in disabled and the button hidden; email+password and email codes still work |
| `AI_INTEGRATIONS_OPENAI_API_KEY` / `_BASE_URL` | AI routes fail on call; server still boots |
| `PAYMOB_*` | Card + wallet checkout disabled |
| `PAYPAL_CLIENT_ID` / `_SECRET` / `PAYPAL_ENVIRONMENT` | PayPal checkout disabled |
| `GOOGLE_CALENDAR_*` | Consultation calendar sync disabled |
| `RESEND_API_KEY` | Transactional email disabled |
| `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` | Object storage uploads disabled |
| `BOOKS_ADMIN_SECRET` | `/store/apps` write endpoints return 503 (see Security note below) |
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

## Security notes

Auth is self-hosted (Better Auth) against this project's own Postgres — there is
no external identity provider. Sessions are httpOnly, `SameSite=Lax` cookies
backed by the `sessions` table, so a session can be revoked server-side.
Passwords are argon2 hashes in `accounts`.

Authorization is the single `users.role` column (`client` / `consultant` /
`admin` / `super_admin`). `role`, `client_id` and `tenant_id` are declared
`input: false`, so a crafted sign-up body cannot set them — Better Auth rejects
the request outright with `FIELD_NOT_ALLOWED`.

`ADMIN_EMAILS` is **bootstrap only**: listed addresses are granted `admin` when
they sign up, and on boot if they already have an account. It never demotes —
removing an address does not revoke anything, so a typo cannot lock every admin
out. Revoke from the admin panel instead.

Most admin write endpoints (books, academy, events, jobs, shipping rates) are
guarded by `requireAdmin`, which fails closed — no session or a non-admin role
answers 401/403 rather than opening up.

`/store/apps` is the exception: it sits above the auth gate and is guarded
only by an `x-admin-secret` header compared against `BOOKS_ADMIN_SECRET`. That
check now fails closed too — with no secret configured the write endpoints
return 503. Set `BOOKS_ADMIN_SECRET` to a strong random value if you need them.

### Open issues inherited from the original project

These are pre-existing and **not** fixed here, because fixing them changes
application behaviour and, in the first case, the database schema:

- **Conversations have no ownership model, so the router is not mounted.** The
  `conversations` table has no owner column and `/conversations*` filtered only
  by conversation id, which let any signed-in user list, read, and delete *any*
  user's conversations, messages, and attachments. The router is therefore
  commented out in `routes/index.ts`. Nothing deployed here used it: the web
  client never calls it, and the mobile app uses the separate
  `/api/mobile/chat/conversations` router. Only the (undeployed)
  `darnozom-agent` artifact did. To re-enable, add an owner column, backfill it,
  and filter every query by the signed-in user.
- **Consultation bookings trust client-supplied identity.** `POST` on bookings
  takes `userId` from the request body rather than the session, and
  `/account/me/bookings` matches on the session's email address — so a booking
  made with someone else's address can be attached to, or read from, the wrong
  account. (The migration off Clerk narrowed this: an account now has exactly
  one address, and it is verified before a session is ever issued.)

## Known limitations

These features are wired but inert until their credentials are supplied:
object storage uploads, PayPal and Paymob checkout, Google Calendar sync,
Resend email, and all OpenAI-backed routes.

The API also carries Replit-specific fallbacks (`objectStorage.ts`,
`paypal.ts`'s connector lookup, `email.ts`'s domain guess) inherited from the
original project. They're inert outside Replit and are left in place rather than
rewritten.
