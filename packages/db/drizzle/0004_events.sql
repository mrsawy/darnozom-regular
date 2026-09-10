CREATE TYPE "public"."event_status" AS ENUM('upcoming', 'past');

CREATE TABLE IF NOT EXISTS "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_ar" varchar(500) NOT NULL,
	"title_en" varchar(500) NOT NULL,
	"date_ar" varchar(200) NOT NULL,
	"date_en" varchar(200) NOT NULL,
	"time_ar" varchar(200),
	"time_en" varchar(200),
	"location_ar" varchar(500),
	"location_en" varchar(500),
	"category_ar" varchar(200),
	"category_en" varchar(200),
	"description_ar" text,
	"description_en" text,
	"status" "event_status" DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
