const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { generateSecureToken } = require('../utils/crypto');
const env = require('../config/env');

const createSession = async (userId, deviceInfo, ipAddress) => {
  const tokenHash = generateSecureToken(64);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const result = await query(
    'INSERT INTO sessions (user_id, token_hash, device_info, ip_address, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, device_info, ip_address, expires_at, created_at',
    [userId, tokenHash, JSON.stringify(deviceInfo || {}), ipAddress || null, expiresAt]
  );

  return result.rows[0];
};

const getSessions = async (userId) => {
  const result = await query(
    'SELECT id, device_info, ip_address, expires_at, revoked, created_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );

  return result.rows;
};

const revokeSession = async (userId, sessionId) => {
  const result = await query(
    'UPDATE sessions SET revoked = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id',
    [sessionId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Session not found', 404);
  }

  return { message: 'Session revoked successfully' };
};

const revokeAllSessions = async (userId) => {
  await query(
    'UPDATE sessions SET revoked = TRUE, updated_at = NOW() WHERE user_id = $1 AND revoked = FALSE',
    [userId]
  );

  return { message: 'All sessions revoked successfully' };
};

const validateSession = async (tokenHash) => {
  const result = await query(
    'SELECT s.id, s.user_id, s.expires_at, s.revoked, u.email, u.status FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1',
    [tokenHash]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid session', 401);
  }

  const session = result.rows[0];

  if (session.revoked) {
    throw new AppError('Session revoked', 401);
  }

  if (session.expires_at < new Date()) {
    throw new AppError('Session expired', 401);
  }

  if (session.status !== 'active') {
    throw new AppError('User account is not active', 401);
  }

  return session;
};

module.exports = {
  createSession,
  getSessions,
  revokeSession,
  revokeAllSessions,
  validateSession,
};
