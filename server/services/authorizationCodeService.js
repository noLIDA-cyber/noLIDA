const crypto = require('crypto');
const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const generateCode = () => {
  const segment1 = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
  const segment2 = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
  return `NLDA-${segment1}-${segment2}`;
};

const hashCode = (code) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

const createAuthorizationCode = async (adminId, codeData) => {
  const { intendedUserId, intendedEmail, purpose = 'business_listing', maxUses = 1, expiresInDays = 30, notes } = codeData;

  const plainCode = generateCode();
  const codeHash = hashCode(plainCode);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 30));

  const result = await query(
    `INSERT INTO authorization_codes 
     (code, code_hash, purpose, intended_user_id, intended_email, max_uses, expires_at, created_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, code, status, purpose, intended_email, max_uses, used_count, expires_at, created_at`,
    [plainCode, codeHash, purpose, intendedUserId || null, intendedEmail || null, maxUses, expiresAt, adminId, notes || null]
  );

  await query(
    'INSERT INTO audit_logs (actor_id, action, target_type, target_id, changes) VALUES ($1, $2, $3, $4, $5)',
    [adminId, 'authorization_code_created', 'authorization_code', result.rows[0].id, JSON.stringify({ code: plainCode, purpose, intended_email: intendedEmail, max_uses: maxUses })]
  );

  return result.rows[0];
};

const validateAuthorizationCode = async (userId, code, ipAddress, userAgent) => {
  const codeHash = hashCode(code);

  const codeResult = await query(
    'SELECT * FROM authorization_codes WHERE code_hash = $1',
    [codeHash]
  );

  if (codeResult.rows.length === 0) {
    await recordUsage(null, userId, 'invalid_code', ipAddress, userAgent);
    throw new AppError('Invalid authorization code', 400);
  }

  const authCode = codeResult.rows[0];

  if (authCode.status !== 'active') {
    await recordUsage(authCode.id, userId, 'code_not_active', ipAddress, userAgent);
    throw new AppError('This authorization code is no longer valid', 400);
  }

  if (new Date() > new Date(authCode.expires_at)) {
    await query('UPDATE authorization_codes SET status = $1, updated_at = NOW() WHERE id = $2', ['expired', authCode.id]);
    await recordUsage(authCode.id, userId, 'code_expired', ipAddress, userAgent);
    throw new AppError('This authorization code has expired', 400);
  }

  if (authCode.used_count >= authCode.max_uses) {
    throw new AppError('This authorization code has reached its maximum uses', 400);
  }

  if (authCode.intended_user_id && authCode.intended_user_id !== userId) {
    await recordUsage(authCode.id, userId, 'wrong_user', ipAddress, userAgent);
    throw new AppError('This authorization code is not valid for this account', 400);
  }

  if (authCode.intended_email) {
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || userResult.rows[0].email !== authCode.intended_email) {
      await recordUsage(authCode.id, userId, 'wrong_email', ipAddress, userAgent);
      throw new AppError('This authorization code is not valid for this account', 400);
    }
  }

  await query(
    'UPDATE authorization_codes SET used_count = used_count + 1, used_at = NOW(), updated_at = NOW() WHERE id = $1',
    [authCode.id]
  );

  await recordUsage(authCode.id, userId, 'code_validated', ipAddress, userAgent);

  return {
    id: authCode.id,
    purpose: authCode.purpose,
    intended_email: authCode.intended_email,
    expires_at: authCode.expires_at,
  };
};

const recordUsage = async (codeId, userId, action, ipAddress, userAgent) => {
  await query(
    'INSERT INTO authorization_code_usage (authorization_code_id, user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
    [codeId, userId, action, ipAddress || null, userAgent || null]
  );
};

const getAuthorizationCode = async (codeId) => {
  const result = await query('SELECT * FROM authorization_codes WHERE id = $1', [codeId]);
  if (result.rows.length === 0) {
    throw new AppError('Authorization code not found', 404);
  }
  return result.rows[0];
};

const listAuthorizationCodes = async (filters = {}) => {
  const { status, purpose, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM authorization_codes WHERE 1=1';
  const params = [];
  let index = 1;

  if (status) {
    sql += ` AND status = $${index}`;
    params.push(status);
    index++;
  }

  if (purpose) {
    sql += ` AND purpose = $${index}`;
    params.push(purpose);
    index++;
  }

  sql += ` ORDER BY created_at DESC LIMIT $${index} OFFSET ${index + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  const countResult = await query('SELECT COUNT(*) FROM authorization_codes WHERE 1=1' + (status ? ' AND status = $1' : '') + (purpose ? ' AND purpose = $2' : ''), status && purpose ? [status, purpose] : status ? [status] : purpose ? [purpose] : []);
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows.map(c => ({ ...c, code: undefined })),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const revokeAuthorizationCode = async (adminId, codeId) => {
  const result = await query(
    'UPDATE authorization_codes SET status = $1, revoked_at = NOW(), revoked_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    ['revoked', adminId, codeId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Authorization code not found', 404);
  }

  await query(
    'INSERT INTO audit_logs (actor_id, action, target_type, target_id, changes) VALUES ($1, $2, $3, $4, $5)',
    [adminId, 'authorization_code_revoked', 'authorization_code', codeId, JSON.stringify({ code_id: codeId })]
  );

  return result.rows[0];
};

module.exports = {
  generateCode,
  hashCode,
  createAuthorizationCode,
  validateAuthorizationCode,
  getAuthorizationCode,
  listAuthorizationCodes,
  revokeAuthorizationCode,
};
