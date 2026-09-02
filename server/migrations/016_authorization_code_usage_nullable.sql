-- Allow authorization_code_id to be nullable so the usage table can
-- record failed redemption attempts (where there is no matching code).
ALTER TABLE authorization_code_usage ALTER COLUMN authorization_code_id DROP NOT NULL;
