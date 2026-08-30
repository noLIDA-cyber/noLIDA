const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiry,
  });

  const refreshToken = jwt.sign({ userId, tokenVersion: 1 }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiry,
  });

  return { accessToken, refreshToken };
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwt.accessSecret);
};

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const generateTOTPSecret = () => {
  return crypto.randomBytes(20).toString('base64').replace(/\+/g, '').replace(/\//g, '').replace(/=/g, '').substring(0, 32);
};

const verifyTOTP = (secret, code) => {
  const timeStep = 30;
  const currentTime = Math.floor(Date.now() / 1000 / timeStep);

  for (let i = -1; i <= 1; i++) {
    const counter = currentTime + i;
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(counter), 0);
    const digest = hmac.update(timeBuffer).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    const otp = (binary % 1000000).toString().padStart(6, '0');
    if (otp === code) return true;
  }

  return false;
};

const generateSecureToken = (length) => {
  return crypto.randomBytes(length).toString('hex');
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  generateOTP,
  hashOTP,
  generateTOTPSecret,
  verifyTOTP,
  generateSecureToken,
};