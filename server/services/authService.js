const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const env = require('../config/env');
const { generateTokens, generateOTP, hashOTP } = require('../utils/crypto');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const hashPassword = async (password) => {
  return bcrypt.hash(password, env.security.bcryptRounds);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const registerUser = async (userData) => {
  const existing = await query('SELECT id FROM users WHERE email = $1', [userData.email]);
  if (existing.rows.length > 0) {
    throw new AppError('Email already registered', 409);
  }

  const result = await query(
    'INSERT INTO users (email, status) VALUES ($1, $2) RETURNING *',
    [userData.email, 'active']
  );
  const user = result.rows[0];

  await query(
    'INSERT INTO profiles (user_id, first_name, last_name) VALUES ($1, $2, $3)',
    [user.id, userData.firstName, userData.lastName]
  );

  await query(
    'INSERT INTO user_auth_methods (user_id, provider, email, password_hash) VALUES ($1, $2, $3, $4)',
    [user.id, 'email', userData.email, await hashPassword(userData.password)]
  );

  return user;
};

const authenticateUser = async (email, password) => {
  const result = await query('SELECT * FROM users WHERE email = $1 AND status = $2', [email, 'active']);
  const user = result.rows[0];

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const authResult = await query(
    'SELECT password_hash FROM user_auth_methods WHERE user_id = $1 AND provider = $2',
    [user.id, 'email']
  );

  if (authResult.rows.length === 0 || !authResult.rows[0].password_hash) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValid = await comparePassword(password, authResult.rows[0].password_hash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  await query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);

  const tokens = generateTokens(user.id);

  return { user, tokens };
};

const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);

    const result = await query('SELECT id FROM users WHERE id = $1 AND status = $2', [decoded.userId, 'active']);
    if (result.rows.length === 0) {
      throw new AppError('Invalid refresh token', 401);
    }

    const tokens = generateTokens(decoded.userId);
    return tokens;
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
};

const createOTP = async (userId, type, purpose) => {
  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + env.security.otpExpiryMinutes * 60 * 1000);

  await query(
    'INSERT INTO otp_codes (user_id, type, code_hash, purpose, expires_at, max_attempts) VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, type, otpHash, purpose, expiresAt, env.security.otpMaxAttempts]
  );

  return otp;
};

const verifyOTP = async (userId, code, purpose) => {
  const result = await query(
    'SELECT id, code_hash, expires_at, attempts FROM otp_codes WHERE user_id = $1 AND purpose = $2 AND used = FALSE AND expires_at > NOW()',
    [userId, purpose]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  const otpRecord = result.rows[0];
  const codeHash = hashOTP(code);

  if (otpRecord.code_hash !== codeHash) {
    await query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [otpRecord.id]);
    throw new AppError('Invalid OTP', 400);
  }

  await query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otpRecord.id]);
  return true;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const authResult = await query(
    'SELECT password_hash FROM user_auth_methods WHERE user_id = $1 AND provider = $2',
    [userId, 'email']
  );

  if (authResult.rows.length === 0 || !authResult.rows[0].password_hash) {
    throw new AppError('No password set for this account', 400);
  }

  const isValid = await comparePassword(currentPassword, authResult.rows[0].password_hash);
  if (!isValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  const newHash = await hashPassword(newPassword);

  await query(
    'UPDATE user_auth_methods SET password_hash = $1, updated_at = NOW() WHERE user_id = $2 AND provider = $3',
    [newHash, userId, 'email']
  );

  await query(
    'INSERT INTO audit_logs (actor_id, action, target_type, target_id, changes) VALUES ($1, $2, $3, $4, $5)',
    [userId, 'password_changed', 'user', userId, JSON.stringify({ changed_at: new Date().toISOString() })]
  );

  return true;
};

module.exports = {
  hashPassword,
  comparePassword,
  registerUser,
  authenticateUser,
  refreshAccessToken,
  createOTP,
  verifyOTP,
  changePassword,
};