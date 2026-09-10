CREATE TYPE "public"."assessment_service_type" AS ENUM('management', 'sharia', 'digital', 'full');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessments" (
        "id" serial PRIMARY KEY NOT NULL,
        "client_id" integer,
        "service_type" "assessment_service_type" NOT NULL,
        "answers" jsonb NOT NULL,
        "report_content" text,
        "executive_summary" text,
        "scores" jsonb,
        "status" varchar(50) DEFAULT 'pending' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
