BEGIN;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_sessions_token_id ON sessions(token_id);

COMMIT;
