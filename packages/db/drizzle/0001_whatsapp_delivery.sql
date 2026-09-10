ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "phone_number" varchar(50);

DO $$ BEGIN
 CREATE TYPE "public"."whatsapp_method" AS ENUM('manual', 'auto');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "whatsapp_delivery_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"report_id" integer,
	"assessment_id" integer,
	"recipient" varchar(100) NOT NULL,
	"method" "whatsapp_method" DEFAULT 'manual' NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"note" text
);

DO $$ BEGIN
 ALTER TABLE "whatsapp_delivery_logs" ADD CONSTRAINT "whatsapp_delivery_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "whatsapp_delivery_logs" ADD CONSTRAINT "whatsapp_delivery_logs_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
