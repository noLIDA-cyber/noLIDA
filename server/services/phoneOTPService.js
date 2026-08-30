const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { generateOTP, hashOTP } = require('../utils/crypto');
const env = require('../config/env');

const sendPhoneOTP = async (userId, phone) => {
  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + env.security.otpExpiryMinutes * 60 * 1000);

  await query(
    'INSERT INTO otp_codes (user_id, type, code_hash, purpose, expires_at, max_attempts) VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, 'phone', otpHash, 'phone_verification', expiresAt, env.security.otpMaxAttempts]
  );

  const { sendSMS } = require('../services/notificationService');
  await sendSMS(phone, `Your noLIDA verification code is: ${otp}. Valid for ${env.security.otpExpiryMinutes} minutes.`);

  return { message: 'OTP sent successfully', expiresIn: env.security.otpExpiryMinutes * 60 };
};

const verifyPhoneOTP = async (userId, code) => {
  const result = await query(
    'SELECT id, code_hash, expires_at, attempts FROM otp_codes WHERE user_id = $1 AND purpose = $2 AND type = $3 AND used = FALSE AND expires_at > NOW()',
    [userId, 'phone_verification', 'phone']
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
  await query('UPDATE users SET phone_verified = TRUE WHERE id = $1', [userId]);

  return { message: 'Phone verified successfully' };
};

module.exports = { sendPhoneOTP, verifyPhoneOTP };
