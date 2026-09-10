ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "self_registered" boolean DEFAULT false NOT NULL;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "clerk_id" varchar(255);
CREATE INDEX IF NOT EXISTS "clients_clerk_id_idx" ON "clients" ("clerk_id");
