BEGIN;

ALTER TABLE authorization_code_usage ALTER COLUMN authorization_code_id DROP NOT NULL;

COMMIT;
