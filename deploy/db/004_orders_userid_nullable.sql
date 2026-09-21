-- Allow guest checkout: orders.user_id may be null when the buyer
-- places an order without signing in.
--
-- Safe to re-run: only drops NOT NULL when the column is still required.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;
  END IF;
END $$;
