BEGIN;

-- Account obligations/restrictions table
-- Prevents account deletion while obligations exist
CREATE TABLE IF NOT EXISTS account_obligations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  obligation_type VARCHAR(50) NOT NULL CHECK (obligation_type IN (
    'pending_refund', 
    'pending_payout', 
    'open_dispute', 
    'pending_payment',
    'unresolved_chargeback',
    'fraud_investigation',
    'legal_hold',
    'compliance_review',
    'other'
  )),
  related_id INTEGER,
  related_type VARCHAR(50),
  description TEXT,
  amount DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'NGN',
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'review', 'resolved', 'closed')),
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_obligations_user_id ON account_obligations(user_id);
CREATE INDEX IF NOT EXISTS idx_account_obligations_status ON account_obligations(status);
CREATE INDEX IF NOT EXISTS idx_account_obligations_obligation_type ON account_obligations(obligation_type);
CREATE INDEX IF NOT EXISTS idx_account_obligations_created_at ON account_obligations(created_at);

COMMIT;
