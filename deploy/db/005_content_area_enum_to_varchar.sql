-- content_items.area moved from the content_area enum to varchar(64) (slug of a
-- content_areas row). drizzle-kit push refuses to drop the enum unattended, so
-- convert the column and drop the type here. Guarded: safe to re-run, and a no-op
-- on a database that never had the enum or the table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_items'
      AND column_name = 'area' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE content_items ALTER COLUMN area TYPE varchar(64) USING area::text;
  END IF;
END $$;

DROP TYPE IF EXISTS content_area;
