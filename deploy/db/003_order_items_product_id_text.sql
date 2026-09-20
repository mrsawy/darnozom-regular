-- order_items.product_id: integer -> text.
--
-- Books are now Medusa-native products, whose ids are strings
-- ("prod_01H..."), not the legacy `books` table's serial integer ids. This
-- column previously held only integer legacy book/course/app ids; it now
-- holds either a Medusa product id or the decimal-string form of a legacy
-- numeric id (see legacyNumericProductId in apps/api/src/routes/orders/index.ts).
--
-- drizzle-kit push refuses this destructive-looking type change unattended
-- (stdin is deliberately closed in deploy.sh), even though the actual cast
-- is lossless (every existing value is already a small integer, trivially
-- representable as text). Runs once, before push, like 001/002.
--
-- Safe to re-run: the column is only altered if it isn't already text.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items'
      AND column_name = 'product_id'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE "order_items"
      ALTER COLUMN "product_id" TYPE text USING "product_id"::text;
  END IF;
END $$;
