CREATE TABLE IF NOT EXISTS "proposals" (
        "id" serial PRIMARY KEY NOT NULL,
        "assessment_id" integer NOT NULL,
        "content" text NOT NULL,
        "edited_content" text,
        "shared_with_client" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "proposals" ADD CONSTRAINT "proposals_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
