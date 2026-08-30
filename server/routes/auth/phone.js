const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { sendPhoneOTP, verifyPhoneOTP } = require('../../services/phoneOTPService');
const { AppError } = require('../../middleware/error');
const { sendSuccess, sendError } = require('../../utils/response');

router.post('/send-otp', authenticate, async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      throw new AppError('Phone number is required', 400);
    }

    const result = await sendPhoneOTP(req.user.id, phone);

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-phone', authenticate, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError('OTP code is required', 400);
    }

    const result = await verifyPhoneOTP(req.user.id, code);

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
