-- New enum used by order_items.format
DO $$ BEGIN
  CREATE TYPE "public"."order_item_format" AS ENUM('paper', 'digital');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

-- Per-format pricing/availability + uploaded PDF reference for books.
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "paper_available" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "paper_price" varchar(50);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "digital_available" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "digital_price" varchar(50);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "digital_file_url" text;
--> statement-breakpoint

-- Shipping totals captured on the order at checkout time.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_total" varchar(50) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_city" varchar(200);
--> statement-breakpoint

-- Per-item format and snapshot of the digital file URL at purchase time.
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "format" "order_item_format";
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "digital_file_url_snapshot" text;
--> statement-breakpoint

-- Per-city shipping rate table used by the admin shipping page and the
-- /api/shipping-rates/lookup endpoint at checkout.
CREATE TABLE IF NOT EXISTS "shipping_rates" (
  "id" serial PRIMARY KEY NOT NULL,
  "city" varchar(200) NOT NULL,
  "price" numeric(10, 2) DEFAULT '0' NOT NULL,
  "currency" varchar(10) DEFAULT 'SAR' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "shipping_rates_city_unique" UNIQUE("city")
);
