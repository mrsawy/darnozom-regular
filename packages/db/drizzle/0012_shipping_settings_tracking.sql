-- Generic admin-editable settings (key/value), seeded with the default
-- shipping cost/currency used for display purposes.
CREATE TABLE IF NOT EXISTS "site_settings" (
  "key" varchar(100) PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "value_type" varchar(20) DEFAULT 'string' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "updated_by" varchar(255)
);
--> statement-breakpoint

INSERT INTO "site_settings" ("key", "value", "value_type")
VALUES ('default_shipping_cost', '50', 'number')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

INSERT INTO "site_settings" ("key", "value", "value_type")
VALUES ('default_shipping_currency', 'EGP', 'string')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- Live tracking fields on orders, set by an admin once an order ships.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_url" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_carrier" varchar(100);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipped_at" timestamp;
