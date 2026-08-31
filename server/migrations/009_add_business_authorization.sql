BEGIN;

CREATE TABLE IF NOT EXISTS authorization_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  code_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked', 'suspended')),
  purpose VARCHAR(100) NOT NULL DEFAULT 'business_listing',
  intended_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  intended_email VARCHAR(255),
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  revoked_at TIMESTAMP,
  revoked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS authorization_code_usage (
  id SERIAL PRIMARY KEY,
  authorization_code_id INTEGER NOT NULL REFERENCES authorization_codes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  authorization_code_id INTEGER REFERENCES authorization_codes(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'changes_requested', 'approved', 'rejected', 'suspended', 'unpublished')),
  business_name VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  services JSONB DEFAULT '[]',
  products JSONB DEFAULT '[]',
  pricing JSONB DEFAULT '{}',
  business_phone VARCHAR(50),
  business_email VARCHAR(255),
  website VARCHAR(500),
  social_media JSONB DEFAULT '{}',
  location JSONB DEFAULT '{}',
  service_areas JSONB DEFAULT '[]',
  business_hours JSONB DEFAULT '{}',
  photos JSONB DEFAULT '[]',
  logo_url VARCHAR(500),
  portfolio JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  verification_data JSONB DEFAULT '{}',
  admin_notes TEXT,
  rejection_reason TEXT,
  changes_requested TEXT,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  published_listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_records (
  id SERIAL PRIMARY KEY,
  business_submission_id INTEGER NOT NULL REFERENCES business_submissions(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(50) NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'changes_requested', 'suspended', 'unpublished', 'republished')),
  notes TEXT,
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authorization_codes_code_hash ON authorization_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_authorization_codes_status ON authorization_codes(status);
CREATE INDEX IF NOT EXISTS idx_authorization_codes_intended_user ON authorization_codes(intended_user_id);
CREATE INDEX IF NOT EXISTS idx_authorization_codes_created_by ON authorization_codes(created_by);

CREATE INDEX IF NOT EXISTS idx_authorization_code_usage_code ON authorization_code_usage(authorization_code_id);
CREATE INDEX IF NOT EXISTS idx_authorization_code_usage_user ON authorization_code_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_business_submissions_user ON business_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_business_submissions_status ON business_submissions(status);
CREATE INDEX IF NOT EXISTS idx_business_submissions_reviewed_by ON business_submissions(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_approval_records_submission ON approval_records(business_submission_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_admin ON approval_records(admin_id);

COMMIT;
