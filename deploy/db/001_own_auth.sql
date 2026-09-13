-- Clerk -> self-hosted auth teardown.
--
-- Runs ONCE, before `drizzle-kit push`, because every statement here is
-- destructive and push refuses destructive changes when stdin is closed (which
-- it is, deliberately, in deploy.sh). After this file has run the schema is
-- close enough that push can create the new tables on its own.
--
-- Safe to re-run: every statement is IF EXISTS / IF NOT EXISTS guarded.
--
-- NOTE ON ORPHANS: orders.user_id, checkout_profiles.user_id and
-- consultation_bookings.user_id are unconstrained varchar(255) columns that
-- held Clerk user ids. They are deliberately left untouched — there is no
-- foreign key to violate, and blanking real order history to tidy up dead
-- identity strings would destroy more than it fixes. New rows get Better Auth
-- ids; old rows keep a string that no longer resolves to a user.

BEGIN;

-- 1. The old app-side user table. Nothing has a foreign key to users.id, so
--    this drops cleanly; CASCADE only exists to catch the indexes.
DROP TABLE IF EXISTS "users" CASCADE;

-- 2. The two-value enum is replaced by a four-value one of the same name.
DROP TYPE IF EXISTS "user_role";

-- 3. The email allowlist is superseded by users.role. The audit log
--    (admin_user_events) is intentionally NOT dropped.
DROP TABLE IF EXISTS "admin_users" CASCADE;

-- 4. Clients lose their Clerk linkage and gain an owning auth user.
DROP INDEX IF EXISTS "clients_clerk_id_idx";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "clerk_id";
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "owner_user_id" text;

COMMIT;
