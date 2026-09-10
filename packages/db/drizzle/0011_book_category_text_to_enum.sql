-- Fix drift: books.category was left as plain text (with legacy value 'other')
-- while the Drizzle schema declares the book_category enum
-- (shariah | management | digital_transformation). This blocked
-- `drizzle-kit push` with: invalid input value for enum book_category: "other".
--
-- Row remap: other -> shariah (the affected rows are Islamic heritage titles);
-- any other unknown value -> management (schema default).
-- Idempotent: only runs if books.category is still a text column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'books'
      AND column_name = 'category'
      AND data_type = 'text'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'book_category') THEN
      CREATE TYPE "public"."book_category" AS ENUM ('shariah', 'management', 'digital_transformation');
    END IF;
    UPDATE "books" SET "category" = CASE "category"
      WHEN 'shariah' THEN 'shariah'
      WHEN 'management' THEN 'management'
      WHEN 'digital_transformation' THEN 'digital_transformation'
      WHEN 'other' THEN 'shariah'
      ELSE 'management'
    END;
    ALTER TABLE "books" ALTER COLUMN "category" DROP DEFAULT;
    ALTER TABLE "books" ALTER COLUMN "category" TYPE "public"."book_category" USING "category"::"public"."book_category";
    ALTER TABLE "books" ALTER COLUMN "category" SET DEFAULT 'management';
    ALTER TABLE "books" ALTER COLUMN "category" SET NOT NULL;
  END IF;
END $$;
