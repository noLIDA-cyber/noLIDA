BEGIN;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent VARCHAR(20) DEFAULT 'default' CHECK (accent IN ('default', 'neon-green', 'sunset', 'cyan', 'sage', 'burgundy'));

COMMIT;
