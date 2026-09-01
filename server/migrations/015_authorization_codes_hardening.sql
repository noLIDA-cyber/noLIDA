BEGIN;

-- Remove plaintext authorization code column
-- NOTE: No existing records were found, but if any exist, they will be lost.
-- This is intentional: plaintext codes must not persist.
ALTER TABLE authorization_codes DROP COLUMN IF EXISTS code;

-- Ensure code_hash is the unique security identifier
ALTER TABLE authorization_codes ADD CONSTRAINT authorization_codes_code_hash_key UNIQUE (code_hash);

-- Add action column to usage table to distinguish successful redemptions from failed attempts
ALTER TABLE authorization_code_usage ADD COLUMN IF NOT EXISTS action VARCHAR(50) NOT NULL DEFAULT 'validated';

-- Add index for rate-limit / brute-force queries
CREATE INDEX IF NOT EXISTS idx_authorization_code_usage_user_action
  ON authorization_code_usage(user_id, action, created_at);

-- Add index for security-event lookups
CREATE INDEX IF NOT EXISTS idx_authorization_code_usage_ip
  ON authorization_code_usage(ip_address, created_at);

COMMIT;
