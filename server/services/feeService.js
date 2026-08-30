const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const createFee = async (feeData) => {
  const { name, type, calculationType, value, currency, country, categoryId, providerId, minAmount, maxAmount, active, effectiveFrom, effectiveTo } = feeData;

  if (!name || !type || !calculationType || value === undefined) {
    throw new AppError('name, type, calculationType, and value are required', 400);
  }

  const result = await query(
    `INSERT INTO fees 
     (name, type, calculation_type, value, currency, country, category_id, provider_id, min_amount, max_amount, active, effective_from, effective_to)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [name, type, calculationType, value, currency || 'NGN', country || null, categoryId || null, providerId || null, minAmount || null, maxAmount || null, active !== false, effectiveFrom || new Date(), effectiveTo || null]
  );

  return result.rows[0];
};

const getFees = async (filters = {}) => {
  let sql = 'SELECT * FROM fees WHERE 1=1';
  const params = [];
  let index = 1;

  if (filters.type) {
    sql += ` AND type = $${index}`;
    params.push(filters.type);
    index++;
  }

  if (filters.categoryId) {
    sql += ` AND category_id = $${index}`;
    params.push(filters.categoryId);
    index++;
  }

  if (filters.providerId) {
    sql += ` AND provider_id = $${index}`;
    params.push(filters.providerId);
    index++;
  }

  if (filters.country) {
    sql += ` AND country = $${index}`;
    params.push(filters.country);
    index++;
  }

  if (filters.active !== undefined) {
    sql += ` AND active = $${index}`;
    params.push(filters.active);
    index++;
  }

  sql += ' ORDER BY created_at DESC';

  const result = await query(sql, params);
  return result.rows;
};

const getFee = async (feeId) => {
  const result = await query('SELECT * FROM fees WHERE id = $1', [feeId]);

  if (result.rows.length === 0) {
    throw new AppError('Fee not found', 404);
  }

  return result.rows[0];
};

const updateFee = async (feeId, updates) => {
  const allowed = ['name', 'type', 'calculation_type', 'value', 'currency', 'country', 'category_id', 'provider_id', 'min_amount', 'max_amount', 'active', 'effective_from', 'effective_to'];
  const setClause = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, (_, letter) => `_${letter.toLowerCase()}`);
    if (allowed.includes(dbKey)) {
      setClause.push(`${dbKey} = $${index}`);
      values.push(value);
      index++;
    }
  }

  if (setClause.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  setClause.push(`updated_at = NOW()`);
  values.push(feeId);

  const result = await query(
    `UPDATE fees SET ${setClause.join(', ')} WHERE id = $${index} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Fee not found', 404);
  }

  return result.rows[0];
};

const deleteFee = async (feeId) => {
  const result = await query('DELETE FROM fees WHERE id = $1 RETURNING id', [feeId]);

  if (result.rows.length === 0) {
    throw new AppError('Fee not found', 404);
  }

  return { message: 'Fee deleted successfully' };
};

module.exports = {
  createFee,
  getFees,
  getFee,
  updateFee,
  deleteFee,
};
