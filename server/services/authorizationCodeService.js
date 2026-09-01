const crypto = require('crypto');
const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { createAuditLog } = require('../services/auditService');
const { createRiskEvent } = require('../services/riskService');

const CODE_PREFIX = 'NLDA';
const CODE_LENGTH = 8;

const generateCode = () => {
  const raw = crypto.randomBytes(CODE_LENGTH).toString('hex').toUpperCase().slice(0, CODE_LENGTH);
  return `${CODE_PREFIX}-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
};

const hashCode = (code) => {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
};

const createAuthorizationCode = async (adminId, codeData) => {
  const { intendedUserId, intendedEmail, purpose = 'business_listing', maxUses = 1, expiresInDays = 30, notes } = codeData;

  const plainCode = generateCode();
  const codeHash = hashCode(plainCode);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 30));

  const result = await query(
    `INSERT INTO authorization_codes 
     (code_hash, purpose, intended_user_id, intended_email, max_uses, expires_at, created_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, status, purpose, intended_email, max_uses, used_count, expires_at, created_at`,
    [codeHash, purpose, intendedUserId || null, intendedEmail || null, maxUses, expiresAt, adminId, notes || null]
  );

  await createAuditLog({
    actorId: adminId,
    action: 'authorization_code_created',
    targetType: 'authorization_code',
    targetId: result.rows[0].id,
    changes: JSON.stringify({ purpose, intended_email: intendedEmail, max_uses: maxUses }),
  });

  return {
    ...result.rows[0],
    code: plainCode,
  };
};

const validateAuthorizationCode = async (userId, code, ipAddress, userAgent) => {
  const normalizedCode = code.trim().toUpperCase();
  const codeHash = hashCode(normalizedCode);

  const result = await query(
    'SELECT id, status, expires_at, intended_user_id, intended_email, max_uses, used_count FROM authorization_codes WHERE code_hash = $1',
    [codeHash]
  );

  if (result.rows.length === 0) {
    await recordUsage(null, userId, 'invalid_code', ipAddress, userAgent);
    await checkBruteForce(userId, ipAddress, 'invalid_code');
    throw new AppError('This authorization code is invalid or can no longer be used.', 400);
  }

  const authCode = result.rows[0];

  if (authCode.status !== 'active') {
    await recordUsage(authCode.id, userId, 'code_not_active', ipAddress, userAgent);
    throw new AppError('This authorization code is invalid or can no longer be used.', 400);
  }

  if (new Date() > new Date(authCode.expires_at)) {
    await query('UPDATE authorization_codes SET status = $1, updated_at = NOW() WHERE id = $2', ['expired', authCode.id]);
    await recordUsage(authCode.id, userId, 'code_expired', ipAddress, userAgent);
    throw new AppError('This authorization code is invalid or can no longer be used.', 400);
  }

  if (authCode.intended_user_id && authCode.intended_user_id !== userId) {
    await recordUsage(authCode.id, userId, 'wrong_user', ipAddress, userAgent);
    throw new AppError('This authorization code is invalid or can no longer be used.', 400);
  }

  if (authCode.intended_email) {
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || userResult.rows[0].email !== authCode.intended_email) {
      await recordUsage(authCode.id, userId, 'wrong_email', ipAddress, userAgent);
      throw new AppError('This authorization code is invalid or can no longer be used.', 400);
    }
  }

  const updateResult = await query(
    'UPDATE authorization_codes SET used_count = used_count + 1, used_at = NOW(), updated_at = NOW() WHERE id = $1 AND used_count < $2 RETURNING id',
    [authCode.id, authCode.max_uses]
  );

  if (updateResult.rows.length === 0) {
    await recordUsage(authCode.id, userId, 'code_exhausted', ipAddress, userAgent);
    throw new AppError('This authorization code is invalid or can no longer be used.', 400);
  }

  await recordUsage(authCode.id, userId, 'code_validated', ipAddress, userAgent);

  return {
    id: authCode.id,
    purpose: authCode.purpose,
    intended_email: authCode.intended_email,
    expires_at: authCode.expires_at,
  };
};

const checkBruteForce = async (userId, ipAddress, action) => {
  try {
    const recentResult = await query(
      `SELECT COUNT(*) as count FROM authorization_code_usage
       WHERE (user_id = $1 OR ip_address = $2)
         AND action = $3
         AND created_at > NOW() - INTERVAL '15 minutes'`,
      [userId, ipAddress, action]
    );

    const count = parseInt(recentResult.rows[0].count);
    if (count >= 10) {
      await createRiskEvent({
        userId: userId || null,
        eventType: 'authorization_code_bruteforce',
        severity: 'high',
        description: `Multiple failed authorization code attempts (${count} in 15 minutes)`,
        metadata: JSON.stringify({ user_id: userId, ip_address: ipAddress, recent_attempts: count, action }),
      });
    }
  } catch (error) {
    console.error('Brute-force check failed:', error);
  }
};

const recordUsage = async (codeId, userId, action, ipAddress, userAgent) => {
  await query(
    'INSERT INTO authorization_code_usage (authorization_code_id, user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
    [codeId, userId, action, ipAddress || null, userAgent || null]
  );
};

const getAuthorizationCode = async (codeId) => {
  const result = await query(
    'SELECT id, status, purpose, intended_user_id, intended_email, max_uses, used_count, expires_at, used_at, revoked_at, revoked_by, created_by, notes, created_at, updated_at FROM authorization_codes WHERE id = $1',
    [codeId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Authorization code not found', 404);
  }
  return result.rows[0];
};

const listAuthorizationCodes = async (filters = {}) => {
  const { status, purpose, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = 'SELECT id, status, purpose, intended_user_id, intended_email, max_uses, used_count, expires_at, used_at, revoked_at, created_by, notes, created_at, updated_at FROM authorization_codes WHERE 1=1';
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

  sql += ` ORDER BY created_at DESC LIMIT $${index} OFFSET $${index + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  let countSql = 'SELECT COUNT(*) FROM authorization_codes WHERE 1=1';
  const countParams = [];
  let countIndex = 1;

  if (status) {
    countSql += ` AND status = $${countIndex}`;
    countParams.push(status);
    countIndex++;
  }

  if (purpose) {
    countSql += ` AND purpose = $${countIndex}`;
    countParams.push(purpose);
    countIndex++;
  }

  const countResult = await query(countSql, countParams);
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const revokeAuthorizationCode = async (adminId, codeId) => {
  const result = await query(
    'UPDATE authorization_codes SET status = $1, revoked_at = NOW(), revoked_by = $2, updated_at = NOW() WHERE id = $3 RETURNING id',
    ['revoked', adminId, codeId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Authorization code not found', 404);
  }

  await createAuditLog({
    actorId: adminId,
    action: 'authorization_code_revoked',
    targetType: 'authorization_code',
    targetId: codeId,
    changes: JSON.stringify({ code_id: codeId }),
  });

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
