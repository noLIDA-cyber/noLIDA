const { query } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const seedAdmin = async () => {
  const adminEmail = 'nolidacreations@gmail.com';
  const adminPassword = 'nolidaiscomingsoon100.';

  let userId;
  const existing = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await query('UPDATE user_auth_methods SET password_hash = $1 WHERE user_id = $2', [passwordHash, userId]);
    await query('UPDATE users SET status = $1 WHERE id = $2', ['active', userId]);
    console.log('Admin user already exists, password updated');
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const userResult = await query(
      'INSERT INTO users (email, status) VALUES ($1, $2) RETURNING id',
      [adminEmail, 'active']
    );

    userId = userResult.rows[0].id;

    await query(
      'INSERT INTO profiles (user_id, first_name, last_name, display_name) VALUES ($1, $2, $3, $4)',
      [userId, 'Super', 'Admin', 'Super Admin']
    );

    await query(
      'INSERT INTO user_auth_methods (user_id, provider, email, password_hash) VALUES ($1, $2, $3, $4)',
      [userId, 'email', adminEmail, passwordHash]
    );
  }

  let orgId;
  const orgResult = await query('SELECT id FROM organizations WHERE slug = $1', ['nolida-platform']);
  if (orgResult.rows.length > 0) {
    orgId = orgResult.rows[0].id;
  } else {
    const newOrg = await query(
      'INSERT INTO organizations (name, slug, type, status) VALUES ($1, $2, $3, $4) RETURNING id',
      ['noLIDA Platform', 'nolida-platform', 'organization', 'active']
    );
    orgId = newOrg.rows[0].id;
  }

  const roles = ['super_admin', 'admin', 'moderator', 'finance_admin', 'support_admin', 'trust_safety_admin', 'analytics_admin', 'owner'];
  for (const slug of roles) {
    await query(
      `INSERT INTO roles (name, slug, description) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
      [slug.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), slug, `Role: ${slug.replace('_', ' ')}`]
    );
  }

  const roleResult = await query('SELECT id FROM roles WHERE slug = $1', ['super_admin']);
  if (roleResult.rows.length > 0) {
    const permissions = await query('SELECT id FROM permissions');
    for (const perm of permissions.rows) {
      await query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [roleResult.rows[0].id, perm.id]
      );
    }

    const authPermissions = ['authorization_codes.view', 'authorization_codes.create', 'authorization_codes.revoke', 'authorization_codes.manage'];
    for (const slug of authPermissions) {
      const permResult = await query('SELECT id FROM permissions WHERE slug = $1', [slug]);
      if (permResult.rows.length === 0) {
        const newPerm = await query(
          `INSERT INTO permissions (name, slug, description) VALUES ($1, $2, $3) RETURNING id`,
          [slug.replace('authorization_codes.', 'Authorization Code ').replace(/\b\w/g, l => l.toUpperCase()), slug, `Permission: ${slug}`]
        );
        await query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [roleResult.rows[0].id, newPerm.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [roleResult.rows[0].id, permResult.rows[0].id]
        );
      }
    }

    const memberResult = await query(
      'SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [orgId, userId]
    );
    if (memberResult.rows.length === 0) {
      await query(
        'INSERT INTO organization_members (organization_id, user_id, role_id, status, joined_at) VALUES ($1, $2, $3, $4, NOW())',
        [orgId, userId, roleResult.rows[0].id, 'active']
      );
      console.log('Admin added to organization with super_admin role');
    }
  }

  const token = jwt.sign({ userId, jti: `${userId}-${Date.now()}` }, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiry });

  console.log('Admin user created successfully');
  console.log('Email:', adminEmail);
  console.log('Password:', adminPassword);
  console.log('Access Token:', token);
  console.log('\nUse this token to access admin routes:');
  console.log(`Authorization: Bearer ${token}`);
  console.log('\nOr use these credentials to log in at /auth');

  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error('Failed to seed admin:', err);
  process.exit(1);
});
