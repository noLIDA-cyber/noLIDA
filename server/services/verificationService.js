const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const submitVerification = async (userId, data) => {
  const { type, documentType, documentUrl, documentCategory, metadata = {} } = data;

  if (!type) {
    throw new AppError('Verification type is required', 400);
  }

  const allowedTypes = ['identity', 'phone', 'email'];
  if (!allowedTypes.includes(type)) {
    throw new AppError('Invalid verification type', 400);
  }

  if (type === 'identity') {
    if (!documentType || !documentUrl) {
      throw new AppError('Document type and document URL are required for identity verification', 400);
    }
  }

  const existingVerification = await query(
    'SELECT id FROM verification WHERE user_id = $1 AND type = $2 AND status IN ($3, $4)',
    [userId, type, 'pending', 'under_review']
  );

  if (existingVerification.rows.length > 0) {
    throw new AppError('You already have a pending verification of this type', 409);
  }

  const result = await query(
    `INSERT INTO verification (user_id, type, document_type, document_url, document_category, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, type, documentType || null, documentUrl || null, documentCategory || null, { ...metadata, submitted_at: new Date().toISOString() }]
  );

  return result.rows[0];
};

const getVerification = async (verificationId) => {
  const result = await query('SELECT * FROM verification WHERE id = $1', [verificationId]);
  if (result.rows.length === 0) {
    throw new AppError('Verification request not found', 404);
  }
  return result.rows[0];
};

const listVerifications = async (filters = {}) => {
  const { userId, status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let index = 1;

  if (userId) {
    conditions.push(`v.user_id = $${index}`);
    values.push(userId);
    index++;
  }

  if (status) {
    conditions.push(`v.status = $${index}`);
    values.push(status);
    index++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT v.*, u.email, p.display_name FROM verification v LEFT JOIN users u ON u.id = v.user_id LEFT JOIN profiles p ON p.user_id = v.user_id ${whereClause} ORDER BY v.created_at DESC LIMIT $${index} OFFSET $${index + 1}`,
    [...values, limit, offset]
  );

  const countResult = await query(`SELECT COUNT(*) FROM verification v ${whereClause}`, values);
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const updateVerificationStatus = async (verificationId, status, reviewerId, notes) => {
  const verificationResult = await query('SELECT * FROM verification WHERE id = $1', [verificationId]);
  if (verificationResult.rows.length === 0) {
    throw new AppError('Verification request not found', 404);
  }

  const allowedStatuses = ['approved', 'rejected'];
  if (!allowedStatuses.includes(status)) {
    throw new AppError('Invalid verification status', 400);
  }

  const updates = ['status = $1', 'updated_at = NOW()'];
  const values = [status];
  let index = 2;

  if (reviewerId) {
    updates.push(`reviewed_by = $${index}`);
    values.push(reviewerId);
    index++;
  }

  if (notes) {
    updates.push(`notes = $${index}`);
    values.push(notes);
    index++;
  }

  values.push(verificationId);

  await query(`UPDATE verification SET ${updates.join(', ')} WHERE id = $${index}`, values);

  return getVerification(verificationId);
};

const getUserVerificationStatus = async (userId) => {
  const result = await query('SELECT type, status FROM verification WHERE user_id = $1', [userId]);
  const verifications = result.rows.reduce((acc, row) => {
    acc[row.type] = row.status;
    return acc;
  }, {});

  return {
    identity: verifications.identity || 'none',
    phone: verifications.phone || 'none',
    email: verifications.email || 'none',
  };
};

module.exports = {
  submitVerification,
  getVerification,
  listVerifications,
  updateVerificationStatus,
  getUserVerificationStatus,
};
