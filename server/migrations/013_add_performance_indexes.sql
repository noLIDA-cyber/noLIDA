BEGIN;

-- Additional indexes for performance optimization

-- Notifications - frequently queried by user and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Messages - frequently filtered by sender, recipient, and read status
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON messages(recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at);

-- OTP Codes - cleanup queries need expires_at and purpose indexes
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose ON otp_codes(purpose);
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_purpose ON otp_codes(user_id, purpose);

-- Users - queries for active users, suspended users, etc.
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Sessions - queries for revoked sessions and expiration
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked);

-- Listings - frequently sorted by featured and category
CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings(featured);
CREATE INDEX IF NOT EXISTS idx_listings_verified ON listings(verified);
CREATE INDEX IF NOT EXISTS idx_listings_organization_id ON listings(organization_id);

-- Transactions - frequent queries by date range
CREATE INDEX IF NOT EXISTS idx_transactions_listing_id ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at_desc ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON transactions(organization_id);

-- Payments - webhook and status queries
CREATE INDEX IF NOT EXISTS idx_payments_provider_reference ON payments(provider_reference);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Payouts - daily processing queries
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_organization_id ON payouts(organization_id);

-- Disputes - review queue queries
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);

-- Verification - status queries
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification(status);

-- Risk Events - alert and investigation queries
CREATE INDEX IF NOT EXISTS idx_risk_events_severity ON risk_events(severity);
CREATE INDEX IF NOT EXISTS idx_risk_events_created_at ON risk_events(created_at DESC);

-- Audit Logs - temporal queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type_id ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON audit_logs(created_at DESC);

COMMIT;
