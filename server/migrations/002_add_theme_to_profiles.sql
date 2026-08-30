BEGIN;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system'));

COMMIT;