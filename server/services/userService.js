const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const getUserProfile = async (userId) => {
  const result = await query(
    'SELECT u.id, u.email, u.email_verified, u.phone_verified, u.status, u.last_login_at, u.created_at, p.first_name, p.last_name, p.display_name, p.avatar_url, p.bio, p.country, p.language, p.currency, p.timezone, p.theme FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1',
    [userId]
  );
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }
  return result.rows[0];
};

const updateUserProfile = async (userId, updates) => {
  const allowedFields = ['first_name', 'last_name', 'display_name', 'bio', 'country', 'language', 'currency', 'timezone', 'theme', 'accent'];
  const profileUpdates = [];
  const profileValues = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      profileUpdates.push(`${key} = $${index}`);
      profileValues.push(value);
      index++;
    }
  }

  if (profileUpdates.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  profileUpdates.push(`updated_at = NOW()`);
  profileValues.push(userId);

  await query(`UPDATE profiles SET ${profileUpdates.join(', ')} WHERE user_id = $${index}`, profileValues);
  return await getUserProfile(userId);
};

const listUsers = async (page = 1, limit = 20, filters = {}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let index = 1;

  if (filters.status) {
    conditions.push(`u.status = $${index}`);
    values.push(filters.status);
    index++;
  }

  if (filters.email) {
    conditions.push(`u.email ILIKE $${index}`);
    values.push(`%${filters.email}%`);
    index++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT u.id, u.email, u.status, u.email_verified, u.phone_verified, u.last_login_at, u.created_at, p.display_name FROM users u LEFT JOIN profiles p ON p.user_id = u.id ${whereClause} ORDER BY u.created_at DESC LIMIT $${index} OFFSET $${index + 1}`,
    [...values, limit, offset]
  );

  const countResult = await query(`SELECT COUNT(*) FROM users u ${whereClause}`, values);
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const isAdmin = async (userId) => {
  const result = await query(
    `SELECT COUNT(*) as count FROM organization_members om
     JOIN roles r ON r.id = om.role_id
     WHERE om.user_id = $1 AND om.status = 'active' AND r.is_system = TRUE`,
    [userId]
  );
  return parseInt(result.rows[0].count) > 0;
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  listUsers,
  isAdmin,
};