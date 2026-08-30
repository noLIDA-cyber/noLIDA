const crypto = require('crypto');
const axios = require('axios');
const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { generateTokens } = require('../utils/crypto');
const env = require('../config/env');

const authenticateWithApple = async (identityToken) => {
  const applePublicKeyUrl = 'https://appleid.apple.com/auth/keys';
  const { data } = await axios.get(applePublicKeyUrl);
  const keys = data.keys;

  const decoded = jwtDecode(identityToken);
  const key = keys.find(k => k.kid === decoded.header.kid);

  if (!key) {
    throw new AppError('Invalid Apple token', 400);
  }

  const publicKey = crypto.createPublicKey({
    key: `-----BEGIN PUBLIC KEY-----\n${key.x5c[0]}\n-----END PUBLIC KEY-----`,
    format: 'pem',
    type: 'spki',
  });

  const payload = jwtVerify(identityToken, publicKey, decoded.header.alg);

  const { email, sub } = payload;

  if (!email) {
    throw new AppError('Apple account email is required', 400);
  }

  let result = await query('SELECT * FROM users WHERE email = $1', [email]);
  let user = result.rows[0];

  if (!user) {
    result = await query(
      'INSERT INTO users (email, email_verified, status) VALUES ($1, $2, $3) RETURNING *',
      [email, true, 'active']
    );
    user = result.rows[0];

    await query(
      'INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)',
      [user.id, email.split('@')[0]]
    );

    await query(
      'INSERT INTO user_auth_methods (user_id, provider, provider_id, email) VALUES ($1, $2, $3, $4)',
      [user.id, 'apple', sub, email]
    );
  } else {
    const authMethod = await query(
      'SELECT id FROM user_auth_methods WHERE user_id = $1 AND provider = $2',
      [user.id, 'apple']
    );

    if (authMethod.rows.length === 0) {
      await query(
        'INSERT INTO user_auth_methods (user_id, provider, provider_id, email) VALUES ($1, $2, $3, $4)',
        [user.id, 'apple', sub, email]
      );
    }
  }

  await query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);

  const tokens = generateTokens(user.id);

  return {
    user: { id: user.id, email: user.email, email_verified: user.email_verified },
    tokens,
  };
};

const jwtDecode = (token) => {
  const parts = token.split('.');
  const header = Buffer.from(parts[0], 'base64').toString('utf-8');
  return JSON.parse(header);
};

const jwtVerify = (token, publicKey, algorithm) => {
  const parts = token.split('.');
  const [headerB64, payloadB64, signatureB64] = parts;
  const signature = Buffer.from(signatureB64, 'base64');

  const verifyingBase = `${headerB64}.${payloadB64}`;
  const verifyingBuffer = Buffer.from(verifyingBase);

  const verifier = crypto.createVerify(algorithm === 'RS256' ? 'RSA-SHA256' : algorithm);
  verifier.update(verifyingBuffer);
  verifier.end();

  const valid = verifier.verify(publicKey, signature);

  if (!valid) {
    throw new AppError('Invalid Apple token signature', 400);
  }

  return JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'));
};

module.exports = { authenticateWithApple };
