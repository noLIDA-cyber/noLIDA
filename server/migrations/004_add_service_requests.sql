BEGIN;

CREATE TABLE IF NOT EXISTS service_requests (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location TEXT,
  budget_min DECIMAL(12,2),
  budget_max DECIMAL(12,2),
  urgency VARCHAR(20) DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'matched', 'quoted', 'in_progress', 'completed', 'cancelled', 'expired')),
  matched_listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_matches (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_category_id ON service_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_request_matches_request_id ON request_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_request_matches_provider_id ON request_matches(provider_id);

COMMIT;
