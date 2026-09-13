#!/usr/bin/env bash
# Single entry point the CD pipeline runs over SSH.
#
#   docker db up -> wait healthy -> one-time restore -> schema push
#   -> api deps -> env file -> systemd restart -> health gate -> ssl -> nginx
#
# Safe to re-run: every step is idempotent.
set -euo pipefail

ROOT=/opt/darnozom
DB_DIR="$ROOT/db"
API_DIR="$ROOT/api"
DEPLOY_DIR="$ROOT/deploy"
DBTOOLS_DIR="$ROOT/dbtools"
ENV_FILE=/etc/darnozom-api.env
COMPOSE="docker compose --project-directory $DB_DIR -f $DEPLOY_DIR/db/docker-compose.yml"

API_PORT="${API_PORT:-8080}"
POSTGRES_USER="${POSTGRES_USER:-darnozom}"
POSTGRES_DB="${POSTGRES_DB:-darnozom}"

log() { echo "==> $*"; }

# ---------------------------------------------------------------------------
# 0. Docker + Compose (install if missing)
# ---------------------------------------------------------------------------
ensure_docker() {
  if command -v docker >/dev/null 2>&1 \
    && docker compose version >/dev/null 2>&1 \
    && systemctl is-active --quiet docker 2>/dev/null; then
    log "Docker already installed and running ($(docker --version))"
    return 0
  fi

  log "Docker and/or Compose missing — installing via get.docker.com"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y ca-certificates curl
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker

  if ! docker compose version >/dev/null 2>&1; then
    # Rare: older installs without the compose plugin. Force a retry of the
    # convenience script packages, then fall back to the apt plugin.
    apt-get install -y docker-compose-plugin || true
  fi

  if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
    echo "Docker install finished but 'docker compose' is still unavailable." >&2
    exit 1
  fi

  log "Docker ready ($(docker --version); $(docker compose version))"
}

ensure_docker

# ---------------------------------------------------------------------------
# 0b. Node.js (API runtime + drizzle-kit)
# ---------------------------------------------------------------------------
ensure_node() {
  if command -v node >/dev/null 2>&1; then
    major=$(node -v | sed 's/^v//' | cut -d. -f1)
    if [ "${major:-0}" -ge 20 ] && command -v npm >/dev/null 2>&1; then
      log "Node already installed ($(node -v); npm $(npm -v))"
      return 0
    fi
  fi

  log "Installing Node.js 22 via NodeSource"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs

  if ! command -v node >/dev/null 2>&1; then
    echo "Node install finished but 'node' is still unavailable." >&2
    exit 1
  fi
  log "Node ready ($(node -v); npm $(npm -v))"
}

ensure_node

# ---------------------------------------------------------------------------
# 1. Postgres container
# ---------------------------------------------------------------------------
mkdir -p "$DB_DIR" "$API_DIR" "$DBTOOLS_DIR"

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "POSTGRES_PASSWORD is required but was not provided." >&2
  exit 1
fi

# Compose reads this; keeping it on disk means `docker compose` also works when
# an operator runs it by hand later.
umask 077
cat > "$DB_DIR/.env" <<EOF
POSTGRES_DB=$POSTGRES_DB
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_PORT=5432
EOF
umask 022

log "Starting Postgres container"
$COMPOSE up -d db

log "Waiting for Postgres to accept connections"
for i in $(seq 1 60); do
  if docker exec darnozom-db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    log "Postgres ready after ${i}s"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Postgres did not become ready within 60s" >&2
    $COMPOSE logs --tail=50 db >&2 || true
    exit 1
  fi
  sleep 1
done

psql_db() {
  docker exec -i darnozom-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

# ---------------------------------------------------------------------------
# 2. One-time restore of the legacy dump
# ---------------------------------------------------------------------------
# backup.sql is NOT in git (it holds real customer PII) — scp it to
# $DB_DIR/backup.sql once, before the first deploy, to carry the old data over.
if [ -f "$DB_DIR/backup.sql" ] && [ ! -f "$DB_DIR/.seeded" ]; then
  log "First run with a backup present — restoring $DB_DIR/backup.sql"

  # The dump came from Neon and assigns ownership/grants to roles that do not
  # exist on a stock Postgres. Create them as plain no-login roles so the
  # ALTER ... OWNER TO / GRANT statements resolve.
  for role in neondb_owner neon_superuser cloud_admin; do
    psql_db -q -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='$role') THEN CREATE ROLE $role; END IF; END \$\$;"
  done

  psql_db -v ON_ERROR_STOP=1 -f - < "$DB_DIR/backup.sql"

  # The dump predates the books.category enum-to-text migration: the column is
  # already text but its DEFAULT still casts through book_category, which pins
  # the now-orphaned type and makes drizzle-kit push fail with
  # "cannot drop type book_category because other objects depend on it".
  psql_db -v ON_ERROR_STOP=1 \
    -c "ALTER TABLE books ALTER COLUMN category SET DEFAULT 'management';" \
    -c "DROP TYPE IF EXISTS book_category;"

  touch "$DB_DIR/.seeded"
  log "Restore complete — marker written, future deploys skip this"
else
  log "Skipping restore (no backup.sql, or already seeded)"
fi

# ---------------------------------------------------------------------------
# 2b. Pre-push destructive migrations
# ---------------------------------------------------------------------------
# drizzle-kit push refuses destructive changes with stdin closed (see below), so
# drops and column removals have to be applied by hand first. Each file runs at
# most once, tracked by a marker, and every statement inside is guarded so a
# re-run is harmless even if the marker is lost.
for sql in "$DEPLOY_DIR/db"/[0-9][0-9][0-9]_*.sql; do
  [ -f "$sql" ] || continue
  marker="$DB_DIR/.migrated-$(basename "$sql" .sql)"
  if [ -f "$marker" ]; then
    log "Pre-push migration $(basename "$sql") already applied"
    continue
  fi
  log "Applying pre-push migration $(basename "$sql")"
  psql_db -v ON_ERROR_STOP=1 -f - < "$sql"
  touch "$marker"
done

# ---------------------------------------------------------------------------
# 3. Schema sync (drizzle-kit push)
# ---------------------------------------------------------------------------
# drizzle-kit and the schema's own deps live in a persistent directory, so this
# is a real install only when the pinned versions below change.
cat > "$DBTOOLS_DIR/package.json" <<'EOF'
{
  "name": "darnozom-dbtools",
  "private": true,
  "version": "1.0.0",
  "dependencies": {
    "drizzle-kit": "0.31.10",
    "drizzle-orm": "0.45.2",
    "drizzle-zod": "0.8.3",
    "pg": "8.23.0",
    "zod": "3.25.76"
  }
}
EOF

if [ ! -d "$DBTOOLS_DIR/node_modules" ] || \
   ! cmp -s "$DBTOOLS_DIR/package.json" "$DBTOOLS_DIR/.installed.json" 2>/dev/null; then
  log "Installing drizzle-kit toolchain"
  (cd "$DBTOOLS_DIR" && npm install --no-audit --no-fund)
  cp "$DBTOOLS_DIR/package.json" "$DBTOOLS_DIR/.installed.json"
else
  log "drizzle-kit toolchain already current"
fi

# Config lives beside the toolchain. drizzle-kit resolves `schema` relative to
# the config file, and forward slashes keep its globbing happy.
cat > "$DBTOOLS_DIR/drizzle.config.ts" <<'EOF'
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../db-schema/src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
EOF

DB_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB"

log "Pushing Drizzle schema"
# stdin is closed deliberately: drizzle-kit prompts before destructive changes,
# and in CI that must fail loudly rather than hang or silently truncate data.
# NODE_PATH is required so schema files under ../db-schema can resolve
# drizzle-orm from dbtools/node_modules (they are not a package of their own).
(cd "$DBTOOLS_DIR" && DATABASE_URL="$DB_URL" NODE_PATH="$DBTOOLS_DIR/node_modules" \
  ./node_modules/.bin/drizzle-kit push --config ./drizzle.config.ts < /dev/null)

# ---------------------------------------------------------------------------
# 4. API runtime deps + environment
# ---------------------------------------------------------------------------
# package.runtime.json is uploaded as dist/package.json, alongside the bundle,
# so node resolves dist/node_modules walking up from dist/index.mjs.
if [ -f "$API_DIR/dist/package.json" ]; then
  log "Installing API runtime externals"
  (cd "$API_DIR/dist" && npm install --omit=dev --no-audit --no-fund)
else
  log "No dist/package.json — skipping runtime externals install"
fi

log "Writing $ENV_FILE"
umask 077
cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=$API_PORT
LOG_LEVEL=${LOG_LEVEL:-info}
DATABASE_URL=$DB_URL
PUBLIC_SITE_URL=${PUBLIC_SITE_URL:-}
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET:-}
ADMIN_EMAILS=${ADMIN_EMAILS:-}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
BOOKS_ADMIN_SECRET=${BOOKS_ADMIN_SECRET:-}
AI_INTEGRATIONS_OPENAI_API_KEY=${AI_INTEGRATIONS_OPENAI_API_KEY:-}
AI_INTEGRATIONS_OPENAI_BASE_URL=${AI_INTEGRATIONS_OPENAI_BASE_URL:-}
PAYMOB_API_KEY=${PAYMOB_API_KEY:-}
PAYMOB_HMAC_SECRET=${PAYMOB_HMAC_SECRET:-}
PAYMOB_IFRAME_ID=${PAYMOB_IFRAME_ID:-}
PAYMOB_INTEGRATION_ID=${PAYMOB_INTEGRATION_ID:-}
PAYMOB_WALLET_INTEGRATION_ID=${PAYMOB_WALLET_INTEGRATION_ID:-}
PAYPAL_CLIENT_ID=${PAYPAL_CLIENT_ID:-}
PAYPAL_CLIENT_SECRET=${PAYPAL_CLIENT_SECRET:-}
PAYPAL_ENVIRONMENT=${PAYPAL_ENVIRONMENT:-live}
GOOGLE_CALENDAR_CLIENT_ID=${GOOGLE_CALENDAR_CLIENT_ID:-}
GOOGLE_CALENDAR_CLIENT_SECRET=${GOOGLE_CALENDAR_CLIENT_SECRET:-}
GOOGLE_CALENDAR_REFRESH_TOKEN=${GOOGLE_CALENDAR_REFRESH_TOKEN:-}
GOOGLE_CALENDAR_ID=${GOOGLE_CALENDAR_ID:-}
RESEND_API_KEY=${RESEND_API_KEY:-}
PRIVATE_OBJECT_DIR=${PRIVATE_OBJECT_DIR:-}
PUBLIC_OBJECT_SEARCH_PATHS=${PUBLIC_OBJECT_SEARCH_PATHS:-}
EOF
chmod 600 "$ENV_FILE"
umask 022

# ---------------------------------------------------------------------------
# 5. systemd
# ---------------------------------------------------------------------------
log "Installing systemd unit"
cp "$DEPLOY_DIR/darnozom-api.service" /etc/systemd/system/darnozom-api.service
systemctl daemon-reload
systemctl enable darnozom-api >/dev/null 2>&1 || true
systemctl restart darnozom-api

# ---------------------------------------------------------------------------
# 6. Health gate
# ---------------------------------------------------------------------------
log "Waiting for /api/healthz"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$API_PORT/api/healthz" || true)
  if [ "$code" = "200" ]; then
    log "API healthy after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "API did not become healthy within 30s (last HTTP $code)" >&2
    journalctl -u darnozom-api -n 60 --no-pager >&2 || true
    exit 1
  fi
  sleep 1
done

# ---------------------------------------------------------------------------
# 7. TLS + nginx
# ---------------------------------------------------------------------------
chown -R www-data:www-data /var/www/darnozom || true
chmod +x "$DEPLOY_DIR/setup-ssl.sh"
"$DEPLOY_DIR/setup-ssl.sh" \
  "$DEPLOY_DIR/nginx.conf" \
  "$DEPLOY_DIR/nginx.bootstrap.conf" \
  "$DEPLOY_DIR/nginx.api.conf"

log "Deploy complete $(date -u +%Y-%m-%dT%H:%M:%SZ)"
