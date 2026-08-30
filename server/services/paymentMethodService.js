const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const listPaymentMethods = async (userId) => {
  const result = await query(
    'SELECT * FROM payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
    [userId]
  );

  return result.rows;
};

const getPaymentMethod = async (userId, methodId) => {
  const result = await query(
    'SELECT * FROM payment_methods WHERE id = $1 AND user_id = $2',
    [methodId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Payment method not found', 404);
  }

  return result.rows[0];
};

const createPaymentMethod = async (userId, methodData) => {
  const { type, provider_method_id, last_four, brand, exp_month, exp_year, is_default, metadata = {} } = methodData;

  if (is_default) {
    await query('UPDATE payment_methods SET is_default = FALSE WHERE user_id = $1', [userId]);
  }

  const result = await query(
    `INSERT INTO payment_methods 
     (user_id, type, provider, provider_method_id, last_four, brand, exp_month, exp_year, is_default, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      userId,
      type,
      'flutterwave',
      provider_method_id || null,
      last_four || null,
      brand || null,
      exp_month || null,
      exp_year || null,
      is_default || false,
      metadata,
    ]
  );

  return result.rows[0];
};

const updatePaymentMethod = async (userId, methodId, updates) => {
  const existing = await getPaymentMethod(userId, methodId);

  if (updates.is_default) {
    await query('UPDATE payment_methods SET is_default = FALSE WHERE user_id = $1', [userId]);
  }

  const allowed = ['type', 'provider', 'provider_method_id', 'last_four', 'brand', 'exp_month', 'exp_year', 'is_default', 'metadata'];
  const setClause = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      setClause.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (setClause.length === 0) {
    return existing;
  }

  setClause.push(`updated_at = NOW()`);
  values.push(methodId, userId);

  const result = await query(
    `UPDATE payment_methods SET ${setClause.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} RETURNING *`,
    values
  );

  return result.rows[0];
};

const deletePaymentMethod = async (userId, methodId) => {
  const result = await query(
    'DELETE FROM payment_methods WHERE id = $1 AND user_id = $2 RETURNING id',
    [methodId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Payment method not found', 404);
  }

  return { message: 'Payment method removed' };
};

const setDefaultPaymentMethod = async (userId, methodId) => {
  await query('UPDATE payment_methods SET is_default = FALSE WHERE user_id = $1', [userId]);

  const result = await query(
    'UPDATE payment_methods SET is_default = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
    [methodId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Payment method not found', 404);
  }

  return result.rows[0];
};

module.exports = {
  listPaymentMethods,
  getPaymentMethod,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
};
