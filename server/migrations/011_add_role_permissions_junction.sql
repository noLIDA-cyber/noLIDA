BEGIN;

-- Create junction table for many-to-many relationship between roles and permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Populate default role permissions based on existing system roles
-- Super Admin - all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.slug = 'super_admin' 
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin - broad permissions (but not everything)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.slug = 'admin' 
  AND p.slug IN ('users.manage', 'listings.manage', 'transactions.view', 'settings.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Moderator - content moderation permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.slug = 'moderator' 
  AND p.slug IN ('listings.moderate', 'reviews.moderate', 'disputes.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Finance Admin - financial permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.slug = 'finance_admin' 
  AND p.slug IN ('transactions.view', 'payouts.manage', 'refunds.manage', 'reports.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Support Admin - user support permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.slug = 'support_admin' 
  AND p.slug IN ('users.view', 'tickets.manage', 'disputes.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Trust & Safety Admin - fraud and safety permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.slug = 'trust_safety_admin' 
  AND p.slug IN ('users.view', 'risk.view', 'verification.manage', 'disputes.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Analytics Admin - read-only analytics
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.slug = 'analytics_admin' 
  AND p.slug IN ('analytics.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
