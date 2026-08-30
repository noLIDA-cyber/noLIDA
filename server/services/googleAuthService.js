const axios = require('axios');
const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { generateTokens } = require('../utils/crypto');
const env = require('../config/env');

const authenticateWithGoogle = async (accessToken) => {
  const googleResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const { email, name, picture, sub } = googleResponse.data;

  if (!email) {
    throw new AppError('Google account email is required', 400);
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
      'INSERT INTO profiles (user_id, first_name, last_name, display_name, avatar_url) VALUES ($1, $2, $3, $4, $5)',
      [user.id, name?.split(' ')[0] || null, name?.split(' ')[1] || null, name, picture]
    );

    await query(
      'INSERT INTO user_auth_methods (user_id, provider, provider_id, email) VALUES ($1, $2, $3, $4)',
      [user.id, 'google', sub, email]
    );
  } else {
    const authMethod = await query(
      'SELECT id FROM user_auth_methods WHERE user_id = $1 AND provider = $2',
      [user.id, 'google']
    );

    if (authMethod.rows.length === 0) {
      await query(
        'INSERT INTO user_auth_methods (user_id, provider, provider_id, email) VALUES ($1, $2, $3, $4)',
        [user.id, 'google', sub, email]
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

module.exports = { authenticateWithGoogle };
