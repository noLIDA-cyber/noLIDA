-- Reviews: send new reviews to admin moderation instead of
-- auto-publishing. Existing reviews keep their current status.
--
-- Idempotent: re-running is safe.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'status'
  ) THEN
    -- Update existing reviews default to 'published' explicitly, then
    -- change the column default so future inserts go to 'pending'.
    ALTER TABLE reviews ALTER COLUMN status SET DEFAULT 'pending';

    -- Add admin moderation columns
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'reviews' AND column_name = 'reviewed_by'
    ) THEN
      ALTER TABLE reviews ADD COLUMN reviewed_by INTEGER REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'reviews' AND column_name = 'reviewed_at'
    ) THEN
      ALTER TABLE reviews ADD COLUMN reviewed_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'reviews' AND column_name = 'moderation_notes'
    ) THEN
      ALTER TABLE reviews ADD COLUMN moderation_notes TEXT;
    END IF;

    -- Index for the admin queue (oldest pending first)
    CREATE INDEX IF NOT EXISTS idx_reviews_status_created
      ON reviews(status, created_at DESC);
  END IF;
END
$$;
