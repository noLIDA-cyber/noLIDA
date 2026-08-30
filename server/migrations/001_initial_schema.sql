BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated', 'deleted')),
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  display_name VARCHAR(200),
  avatar_url TEXT,
  bio TEXT,
  date_of_birth DATE,
  gender VARCHAR(20),
  country VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en',
  currency VARCHAR(10) DEFAULT 'NGN',
  timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_auth_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('email', 'google', 'apple', 'phone')),
  provider_id VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  password_hash TEXT,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'phone', 'totp')),
  code_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  device_info JSONB,
  ip_address VARCHAR(45),
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(20) DEFAULT 'business' CHECK (type IN ('individual', 'business', 'organization')),
  description TEXT,
  logo_url TEXT,
  website TEXT,
  email VARCHAR(255),
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated', 'deleted')),
  verified BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'under_review', 'approved', 'rejected')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capabilities (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  icon TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  capability_id INTEGER REFERENCES capabilities(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'under_review')),
  verified BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listing_pricing (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER UNIQUE NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  pricing_type VARCHAR(20) DEFAULT 'fixed' CHECK (pricing_type IN ('fixed', 'hourly', 'range', 'custom', 'quote')),
  base_price DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'NGN',
  unit VARCHAR(50),
  min_price DECIMAL(12,2),
  max_price DECIMAL(12,2),
  deposit_required BOOLEAN DEFAULT FALSE,
  deposit_amount DECIMAL(12,2),
  deposit_percentage DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listing_availability (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  break_start TIME,
  break_end TIME,
  max_bookings_per_slot INTEGER DEFAULT 1,
  buffer_time INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Nigeria',
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  phone VARCHAR(20),
  email VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_areas (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  country VARCHAR(100),
  state VARCHAR(100),
  city VARCHAR(100),
  radius DECIMAL(10,2),
  radius_unit VARCHAR(10) DEFAULT 'km',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('appointment', 'order', 'quote', 'reservation', 'hire', 'package', 'membership', 'gift_card', 'other')),
  transaction_status VARCHAR(20) DEFAULT 'pending' CHECK (transaction_status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded', 'disputed', 'failed')),
  customer_id INTEGER NOT NULL REFERENCES users(id),
  provider_id INTEGER NOT NULL REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  customer_fee DECIMAL(12,2) DEFAULT 0,
  provider_commission DECIMAL(12,2) DEFAULT 0,
  platform_fee DECIMAL(12,2) DEFAULT 0,
  processing_fee DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  provider_earnings DECIMAL(12,2) DEFAULT 0,
  net_payout DECIMAL(12,2) DEFAULT 0,
  fee_snapshot JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  payment_provider VARCHAR(30) NOT NULL DEFAULT 'flutterwave',
  payment_method VARCHAR(50),
  provider_reference VARCHAR(255) UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'expired', 'cancelled')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('commission', 'platform_fee', 'processing', 'fixed', 'custom')),
  calculation_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (calculation_type IN ('percentage', 'fixed', 'tiered')),
  value DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  country VARCHAR(100),
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  provider_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  min_amount DECIMAL(12,2),
  max_amount DECIMAL(12,2),
  active BOOLEAN DEFAULT TRUE,
  effective_from TIMESTAMP DEFAULT NOW(),
  effective_to TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_applications (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  fee_id INTEGER REFERENCES fees(id),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  calculation JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payouts (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  payment_provider VARCHAR(30) NOT NULL DEFAULT 'flutterwave',
  provider_reference VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER UNIQUE NOT NULL REFERENCES transactions(id),
  customer_id INTEGER NOT NULL REFERENCES users(id),
  provider_id INTEGER NOT NULL REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  content TEXT,
  response TEXT,
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'pending')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  opened_by INTEGER NOT NULL REFERENCES users(id),
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed', 'escalated')),
  resolution TEXT,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  provider_id INTEGER NOT NULL REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  recipient_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  attachments JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('push', 'email', 'sms', 'whatsapp', 'in_app')),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('identity', 'business', 'address', 'phone', 'email')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  document_type VARCHAR(100),
  document_url TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id INTEGER,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_methods_user_id ON user_auth_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_capabilities_category_id ON capabilities(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_provider_id ON listings(provider_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listing_pricing_listing_id ON listing_pricing(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_availability_listing_id ON listing_availability(listing_id);
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_provider_id ON service_areas(provider_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_id ON transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_fees_category_id ON fees(category_id);
CREATE INDEX IF NOT EXISTS idx_fees_active ON fees(active);
CREATE INDEX IF NOT EXISTS idx_fee_applications_transaction_id ON fee_applications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payouts_provider_id ON payouts(provider_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_reviews_transaction_id ON reviews(transaction_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_disputes_transaction_id ON disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider_id ON conversations(provider_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_user_id ON verification(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_user_id ON risk_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

INSERT INTO roles (name, slug, description, permissions, is_system) VALUES
  ('Super Admin', 'super_admin', 'Full platform control', '["*"]', TRUE),
  ('Admin', 'admin', 'Broad management access', '["users.manage", "listings.manage", "transactions.view", "settings.manage"]', TRUE),
  ('Moderator', 'moderator', 'Content and listing moderation', '["listings.moderate", "reviews.moderate", "disputes.view"]', TRUE),
  ('Finance Admin', 'finance_admin', 'Financial operations', '["transactions.view", "payouts.manage", "refunds.manage", "reports.view"]', TRUE),
  ('Support Admin', 'support_admin', 'User support', '["users.view", "tickets.manage", "disputes.view"]', TRUE),
  ('Trust & Safety Admin', 'trust_safety_admin', 'Fraud and safety', '["users.view", "risk.view", "verification.manage", "disputes.manage"]', TRUE),
  ('Analytics Admin', 'analytics_admin', 'Read-only analytics', '["analytics.view"]', TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO permissions (name, slug, description) VALUES
  ('Manage Users', 'users.manage', 'Create, update, suspend users'),
  ('View Users', 'users.view', 'View user profiles and data'),
  ('Manage Listings', 'listings.manage', 'Create and manage listings'),
  ('Moderate Listings', 'listings.moderate', 'Review and moderate listings'),
  ('View Transactions', 'transactions.view', 'View transaction records'),
  ('Manage Payouts', 'payouts.manage', 'Process and manage payouts'),
  ('Manage Refunds', 'refunds.manage', 'Process refunds'),
  ('View Reports', 'reports.view', 'View financial reports'),
  ('Manage Tickets', 'tickets.manage', 'Manage support tickets'),
  ('View Disputes', 'disputes.view', 'View dispute cases'),
  ('Manage Disputes', 'disputes.manage', 'Resolve disputes'),
  ('View Analytics', 'analytics.view', 'View platform analytics'),
  ('Manage Verification', 'verification.manage', 'Review verification documents'),
  ('View Risk', 'risk.view', 'View risk events and signals'),
  ('Manage Settings', 'settings.manage', 'Modify platform configuration')
ON CONFLICT (slug) DO NOTHING;

COMMIT;