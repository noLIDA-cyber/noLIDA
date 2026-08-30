const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getUserProfile, updateUserProfile } = require('../services/userService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await getUserProfile(req.user.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

router.get('/theme', async (req, res, next) => {
  try {
    if (req.user) {
      const user = await getUserProfile(req.user.id);
      return sendSuccess(res, { theme: user.theme || 'system' });
    }
    sendSuccess(res, { theme: 'system' });
  } catch (error) {
    next(error);
  }
});

router.patch('/theme', authenticate, async (req, res, next) => {
  try {
    const { theme } = req.body;

    if (!theme || !['light', 'dark', 'system'].includes(theme)) {
      throw new AppError('Invalid theme. Must be light, dark, or system.', 400);
    }

    const user = await updateUserProfile(req.user.id, { theme });
    sendSuccess(res, { theme: user.theme });
  } catch (error) {
    next(error);
  }
});

router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const user = await updateUserProfile(req.user.id, req.body);
    sendSuccess(res, { message: 'Profile updated', data: user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;