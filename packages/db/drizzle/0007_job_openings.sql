DO $$ BEGIN
 CREATE TYPE "public"."job_opening_status" AS ENUM('active', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_openings" (
        "id" serial PRIMARY KEY NOT NULL,
        "title_ar" varchar(500) NOT NULL,
        "title_en" varchar(500) NOT NULL,
        "dept_ar" varchar(200) NOT NULL,
        "dept_en" varchar(200) NOT NULL,
        "location_ar" varchar(300) NOT NULL,
        "location_en" varchar(300) NOT NULL,
        "type" varchar(50) NOT NULL,
        "type_ar" varchar(100) NOT NULL,
        "type_en" varchar(100) NOT NULL,
        "posted" date NOT NULL,
        "remote" boolean DEFAULT false NOT NULL,
        "desc_ar" text DEFAULT '' NOT NULL,
        "desc_en" text DEFAULT '' NOT NULL,
        "skills_ar" text[] DEFAULT ARRAY[]::text[] NOT NULL,
        "skills_en" text[] DEFAULT ARRAY[]::text[] NOT NULL,
        "category" varchar(100) NOT NULL,
        "status" "job_opening_status" DEFAULT 'active' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
);
