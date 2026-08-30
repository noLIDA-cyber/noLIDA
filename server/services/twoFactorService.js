const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { generateOTP, hashOTP, generateTOTPSecret, verifyTOTP } = require('../utils/crypto');
const env = require('../config/env');

const enable2FA = async (userId) => {
  const secret = generateTOTPSecret();

  await query(
    'INSERT INTO user_auth_methods (user_id, provider, provider_id, metadata) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = EXCLUDED.provider_id, metadata = EXCLUDED.metadata, updated_at = NOW()',
    [userId, 'totp', secret, JSON.stringify({ enabled: true })]
  );

  return { secret };
};

const verify2FA = async (userId, code) => {
  const result = await query(
    'SELECT provider_id FROM user_auth_methods WHERE user_id = $1 AND provider = $2',
    [userId, 'totp']
  );

  if (result.rows.length === 0) {
    throw new AppError('2FA not enabled', 400);
  }

  const secret = result.rows[0].provider_id;
  const isValid = verifyTOTP(secret, code);

  if (!isValid) {
    throw new AppError('Invalid 2FA code', 400);
  }

  return { message: '2FA verified successfully' };
};

const disable2FA = async (userId) => {
  await query(
    'DELETE FROM user_auth_methods WHERE user_id = $1 AND provider = $2',
    [userId, 'totp']
  );

  return { message: '2FA disabled successfully' };
};

const is2FAEnabled = async (userId) => {
  const result = await query(
    'SELECT id FROM user_auth_methods WHERE user_id = $1 AND provider = $2',
    [userId, 'totp']
  );

  return result.rows.length > 0;
};

module.exports = { enable2FA, verify2FA, disable2FA, is2FAEnabled };
