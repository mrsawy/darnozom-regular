-- Rename book categories to match Darnozom's core fields.
-- Old enum: islamic, management, leadership, training, tools, other
-- New enum: shariah, management, digital_transformation
-- Row remap: islamic -> shariah, management -> management,
--            tools -> digital_transformation, leadership/training/other -> management
-- Idempotent: only runs the transition if the enum still contains legacy values.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'book_category'
      AND e.enumlabel IN ('islamic', 'leadership', 'training', 'tools', 'other')
  ) THEN
    ALTER TABLE "books" ALTER COLUMN "category" DROP DEFAULT;
    ALTER TABLE "books" ALTER COLUMN "category" TYPE text;
    UPDATE "books" SET "category" = CASE "category"
      WHEN 'islamic' THEN 'shariah'
      WHEN 'management' THEN 'management'
      WHEN 'tools' THEN 'digital_transformation'
      ELSE 'management'
    END;
    DROP TYPE "public"."book_category";
    CREATE TYPE "public"."book_category" AS ENUM ('shariah', 'management', 'digital_transformation');
    ALTER TABLE "books" ALTER COLUMN "category" TYPE "public"."book_category" USING "category"::"public"."book_category";
    ALTER TABLE "books" ALTER COLUMN "category" SET DEFAULT 'management';
  END IF;
END $$;
