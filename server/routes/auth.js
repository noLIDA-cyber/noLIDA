const router = require('express').Router();
const { AppError } = require('../middleware/error');
const { registerUser, authenticateUser, refreshAccessToken, createOTP, verifyOTP, changePassword } = require('../services/authService');
const { generateTokens, generateSecureToken } = require('../utils/crypto');
const { sendSuccess, sendError } = require('../utils/response');
const { authenticate } = require('../middleware/auth');
const { createSession } = require('../services/sessionService');

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      throw new AppError('All fields are required', 400);
    }

    const user = await registerUser({ email, password, firstName, lastName });
    const otp = await createOTP(user.id, 'email', 'email_verification');

    const { sendVerificationEmail } = require('../services/notificationService');
    await sendVerificationEmail(user.email, otp, 'email_verification');

    const jti = generateSecureToken(32);
    const tokens = generateTokens(user.id, jti);
    await createSession(user.id, { browser: req.headers['user-agent'], os: 'unknown' }, req.ip, jti);

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const { user, tokens } = await authenticateUser(email, password);

    const jti = generateSecureToken(32);
    const deviceInfo = { browser: req.headers['user-agent'], os: 'unknown' };
    await createSession(user.id, deviceInfo, req.ip, jti);

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, email_verified: user.email_verified },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    const tokens = await refreshAccessToken(refreshToken);
    res.json({ success: true, data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const { sendPasswordReset } = require('../services/notificationService');
    await sendPasswordReset(email, `${process.env.APP_URL}/reset-password?token=example`);

    res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, message: 'Reset password not yet implemented' });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      throw new AppError('User ID and code are required', 400);
    }

    const valid = await verifyOTP(userId, code, 'email_verification');
    if (valid) {
      await require('../config/database').query('UPDATE users SET email_verified = TRUE WHERE id = $1', [userId]);
    }

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    await changePassword(req.user.id, currentPassword, newPassword);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;