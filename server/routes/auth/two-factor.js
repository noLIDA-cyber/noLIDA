const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { enable2FA, verify2FA, disable2FA, is2FAEnabled } = require('../../services/twoFactorService');
const { AppError } = require('../../middleware/error');
const { sendSuccess, sendError } = require('../../utils/response');

router.post('/enable-2fa', authenticate, async (req, res, next) => {
  try {
    const { secret } = await enable2FA(req.user.id);
    sendSuccess(res, { secret }, 201);
  } catch (error) {
    next(error);
  }
});

router.post('/verify-2fa', authenticate, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError('2FA code is required', 400);
    }

    const result = await verify2FA(req.user.id, code);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.post('/disable-2fa', authenticate, async (req, res, next) => {
  try {
    const result = await disable2FA(req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.get('/2fa-status', authenticate, async (req, res, next) => {
  try {
    const enabled = await is2FAEnabled(req.user.id);
    sendSuccess(res, { enabled });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
