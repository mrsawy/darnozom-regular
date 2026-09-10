CREATE TABLE IF NOT EXISTS "academy_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_ar" varchar(500) NOT NULL,
	"title_en" varchar(500) NOT NULL,
	"description_ar" text,
	"description_en" text,
	"price" varchar(100),
	"start_date" varchar(100),
	"image_url" varchar(1000),
	"registration_url" varchar(1000),
	"created_at" timestamp DEFAULT now() NOT NULL
);
