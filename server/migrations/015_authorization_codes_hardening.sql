-- Authorization code security hardening.
--
-- Idempotent: every statement is safe to re-run.

-- Remove plaintext authorization code column if it still exists
ALTER TABLE authorization_codes DROP COLUMN IF EXISTS code;

-- Ensure code_hash is the unique security identifier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'authorization_codes_code_hash_key'
      AND conrelid = 'authorization_codes'::regclass
  ) THEN
    ALTER TABLE authorization_codes
      ADD CONSTRAINT authorization_codes_code_hash_key UNIQUE (code_hash);
  END IF;
END
$$;

-- Add action column to usage table to distinguish successful redemptions from failed attempts
ALTER TABLE authorization_code_usage ADD COLUMN IF NOT EXISTS action VARCHAR(50) NOT NULL DEFAULT 'validated';

-- Add index for rate-limit / brute-force queries
CREATE INDEX IF NOT EXISTS idx_authorization_code_usage_user_action
  ON authorization_code_usage(user_id, action, created_at);

-- Add index for security-event lookups
CREATE INDEX IF NOT EXISTS idx_authorization_code_usage_ip
  ON authorization_code_usage(ip_address, created_at);
