DO $$ BEGIN
 CREATE TYPE "public"."job_application_status" AS ENUM('new', 'reviewing', 'accepted', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"job_title_ar" varchar(500) NOT NULL,
	"job_title_en" varchar(500) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"years_experience" integer,
	"cover_letter" text,
	"resume_path" varchar(1000) NOT NULL,
	"resume_file_name" varchar(500) NOT NULL,
	"resume_mime_type" varchar(200) NOT NULL,
	"resume_size" integer NOT NULL,
	"status" "job_application_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
