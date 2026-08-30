const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const createOrganization = async (userId, orgData) => {
  const { name, type, description, website, email, phone } = orgData;

  if (!name) {
    throw new AppError('Organization name is required', 400);
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const result = await query(
    `INSERT INTO organizations (name, slug, type, description, website, email, phone, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [name, slug, type || 'business', description, website, email, phone, 'active']
  );

  const organization = result.rows[0];

  const ownerRole = await query('SELECT id FROM roles WHERE slug = $1', ['owner']);
  if (ownerRole.rows.length > 0) {
    await query(
      'INSERT INTO organization_members (organization_id, user_id, role_id, status, joined_at) VALUES ($1, $2, $3, $4, NOW())',
      [organization.id, userId, ownerRole.rows[0].id, 'active']
    );
  }

  return organization;
};

const getUserOrganizations = async (userId) => {
  const result = await query(
    `SELECT o.*, r.name as role_name, r.slug as role_slug
     FROM organizations o
     JOIN organization_members om ON om.organization_id = o.id
     JOIN roles r ON r.id = om.role_id
     WHERE om.user_id = $1 AND om.status = $2 AND o.status = $3
     ORDER BY o.created_at DESC`,
    [userId, 'active', 'active']
  );

  return result.rows;
};

const getOrganization = async (orgId, userId) => {
  const result = await query(
    `SELECT o.*, r.name as role_name, r.slug as role_slug
     FROM organizations o
     JOIN organization_members om ON om.organization_id = o.id
     JOIN roles r ON r.id = om.role_id
     WHERE o.id = $1 AND om.user_id = $2 AND om.status = $3`,
    [orgId, userId, 'active']
  );

  if (result.rows.length === 0) {
    throw new AppError('Organization not found', 404);
  }

  return result.rows[0];
};

const updateOrganization = async (orgId, userId, updates) => {
  const allowed = ['name', 'type', 'description', 'logo_url', 'website', 'email', 'phone', 'metadata'];
  const setClause = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      setClause.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  }

  if (setClause.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  setClause.push(`updated_at = NOW()`);
  values.push(orgId, userId);

  const result = await query(
    `UPDATE organizations SET ${setClause.join(', ')}
     WHERE id = $${index}
       AND id IN (SELECT organization_id FROM organization_members WHERE user_id = $${index + 1} AND status = 'active')
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Organization not found', 404);
  }

  return result.rows[0];
};

const deleteOrganization = async (orgId, userId) => {
  const result = await query(
    `UPDATE organizations SET status = 'deleted', updated_at = NOW()
     WHERE id = $1
       AND id IN (SELECT organization_id FROM organization_members WHERE user_id = $2 AND status = 'active')
       AND status != 'deleted'
     RETURNING id`,
    [orgId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Organization not found', 404);
  }

  return { message: 'Organization deleted successfully' };
};

const getOrganizationMembers = async (orgId, userId) => {
  const org = await getOrganization(orgId, userId);

  const members = await query(
    `SELECT u.id, u.email, p.first_name, p.last_name, p.display_name, p.avatar_url,
            r.name as role_name, r.slug as role_slug, om.status, om.joined_at, om.invited_at
     FROM organization_members om
     JOIN users u ON u.id = om.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     JOIN roles r ON r.id = om.role_id
     WHERE om.organization_id = $1
     ORDER BY om.created_at DESC`,
    [orgId]
  );

  return members.rows;
};

const addOrganizationMember = async (orgId, userId, memberData) => {
  await getOrganization(orgId, userId);

  const { email, roleId } = memberData;

  if (!email || !roleId) {
    throw new AppError('Email and role are required', 400);
  }

  const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const roleResult = await query('SELECT id FROM roles WHERE id = $1', [roleId]);
  if (roleResult.rows.length === 0) {
    throw new AppError('Role not found', 404);
  }

  const result = await query(
    `INSERT INTO organization_members (organization_id, user_id, role_id, status, invited_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (organization_id, user_id)
     DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active', updated_at = NOW()
     RETURNING *`,
    [orgId, userResult.rows[0].id, roleId, 'active']
  );

  return result.rows[0];
};

const removeOrganizationMember = async (orgId, userId, memberId) => {
  await getOrganization(orgId, userId);

  const result = await query(
    `DELETE FROM organization_members
     WHERE id = $1 AND organization_id = $2
     RETURNING id`,
    [memberId, orgId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Member not found', 404);
  }

  return { message: 'Member removed successfully' };
};

const updateMemberRole = async (orgId, userId, memberId, roleId) => {
  await getOrganization(orgId, userId);

  const result = await query(
    `UPDATE organization_members SET role_id = $1, updated_at = NOW()
     WHERE id = $2 AND organization_id = $3
     RETURNING *`,
    [roleId, memberId, orgId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Member not found', 404);
  }

  return result.rows[0];
};

const getRoles = async () => {
  const result = await query('SELECT * FROM roles ORDER BY name ASC');
  return result.rows;
};

const getOrganizationStats = async (orgId, userId) => {
  await getOrganization(orgId, userId);

  const membersResult = await query(
    'SELECT COUNT(*) FROM organization_members WHERE organization_id = $1 AND status = $2',
    [orgId, 'active']
  );

  const listingsResult = await query(
    'SELECT COUNT(*) FROM listings WHERE organization_id = $1 AND status = $2',
    [orgId, 'active']
  );

  const bookingsResult = await query(
    `SELECT COUNT(*) FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     WHERE l.organization_id = $1 AND t.transaction_type = 'appointment'
       AND t.created_at >= NOW() - INTERVAL '30 days'`,
    [orgId]
  );

  return {
    members: parseInt(membersResult.rows[0].count),
    listings: parseInt(listingsResult.rows[0].count),
    bookings: parseInt(bookingsResult.rows[0].count),
  };
};

module.exports = {
  createOrganization,
  getUserOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  addOrganizationMember,
  removeOrganizationMember,
  updateMemberRole,
  getRoles,
  getOrganizationStats,
};
