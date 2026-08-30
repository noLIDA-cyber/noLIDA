const { query } = require('../config/database');

module.exports = {
  findById: async (userId) => {
    const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  },

  findByEmail: async (email) => {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  create: async (userData) => {
    const result = await query(
      'INSERT INTO users (email, status, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
      [userData.email, userData.status || 'active']
    );
    return result.rows[0];
  },

  update: async (userId, updates) => {
    const keys = Object.keys(updates);
    if (keys.length === 0) return null;

    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [userId, ...Object.values(updates)];

    const result = await query(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  },
};