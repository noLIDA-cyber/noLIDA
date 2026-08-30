const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { submitVerification, getVerification, listVerifications, updateVerificationStatus, getUserVerificationStatus } = require('../services/verificationService');
const { createOTP, verifyOTP } = require('../services/authService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.post('/', authenticate, async (req, res, next) => {
  try {
    const verification = await submitVerification(req.user.id, req.body);
    sendSuccess(res, verification, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/me/status', async (req, res, next) => {
  try {
    if (!req.user) {
      return sendSuccess(res, { identity: 'none', phone: 'none', email: 'none' });
    }
    const status = await getUserVerificationStatus(req.user.id);
    sendSuccess(res, status);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listVerifications({ ...req.query, page, limit });
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const verification = await getVerification(req.params.id);
    sendSuccess(res, verification);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const verification = await updateVerificationStatus(req.params.id, status, req.user.id, notes);
    sendSuccess(res, verification);
  } catch (error) {
    next(error);
  }
});

router.post('/phone/send-otp', authenticate, async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      throw new AppError('Phone number is required', 400);
    }

    const otp = await createOTP(req.user.id, 'phone', 'phone_verification');

    const { sendSMS } = require('../services/notificationService');
    await sendSMS(phone, `Your noLIDA verification code is: ${otp}. Valid for 10 minutes.`);

    sendSuccess(res, { message: 'OTP sent to your phone number' });
  } catch (error) {
    next(error);
  }
});

router.post('/phone/verify-otp', authenticate, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError('Verification code is required', 400);
    }

    await verifyOTP(req.user.id, code, 'phone_verification');

    await require('../config/database').query(
      'UPDATE users SET phone_verified = TRUE WHERE id = $1',
      [req.user.id]
    );

    const existing = await require('../config/database').query(
      'SELECT id FROM verification WHERE user_id = $1 AND type = $2 AND status IN ($3, $4)',
      [req.user.id, 'phone', 'pending', 'under_review']
    );

    if (existing.rows.length === 0) {
      await require('../config/database').query(
        'INSERT INTO verification (user_id, type, status, metadata) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'phone', 'approved', { verified_at: new Date().toISOString(), method: 'otp' }]
      );
    } else {
      await require('../config/database').query(
        'UPDATE verification SET status = $1, updated_at = NOW(), metadata = $2 WHERE id = $3',
        ['approved', { verified_at: new Date().toISOString(), method: 'otp' }, existing.rows[0].id]
      );
    }

    sendSuccess(res, { message: 'Phone number verified successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/email/send-otp', authenticate, async (req, res, next) => {
  try {
    const user = await require('../config/database').query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user.rows.length || !user.rows[0].email) {
      throw new AppError('No email address found for this account', 400);
    }

    const otp = await createOTP(req.user.id, 'email', 'email_verification');

    const { sendVerificationEmail } = require('../services/notificationService');
    await sendVerificationEmail(user.rows[0].email, otp, 'email_verification');

    sendSuccess(res, { message: 'Verification code sent to your email' });
  } catch (error) {
    next(error);
  }
});

router.post('/email/verify-otp', authenticate, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError('Verification code is required', 400);
    }

    await verifyOTP(req.user.id, code, 'email_verification');

    await require('../config/database').query(
      'UPDATE users SET email_verified = TRUE WHERE id = $1',
      [req.user.id]
    );

    const existing = await require('../config/database').query(
      'SELECT id FROM verification WHERE user_id = $1 AND type = $2 AND status IN ($3, $4)',
      [req.user.id, 'email', 'pending', 'under_review']
    );

    if (existing.rows.length === 0) {
      await require('../config/database').query(
        'INSERT INTO verification (user_id, type, status, metadata) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'email', 'approved', { verified_at: new Date().toISOString(), method: 'otp' }]
      );
    } else {
      await require('../config/database').query(
        'UPDATE verification SET status = $1, updated_at = NOW(), metadata = $2 WHERE id = $3',
        ['approved', { verified_at: new Date().toISOString(), method: 'otp' }, existing.rows[0].id]
      );
    }

    sendSuccess(res, { message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
