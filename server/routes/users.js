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
      return sendSuccess(res, { theme: user.theme || 'system', accent: user.accent || 'default' });
    }
    sendSuccess(res, { theme: 'system', accent: 'default' });
  } catch (error) {
    next(error);
  }
});

router.patch('/theme', authenticate, async (req, res, next) => {
  try {
    const { theme, accent } = req.body;

    if (theme && !['light', 'dark', 'system'].includes(theme)) {
      throw new AppError('Invalid theme. Must be light, dark, or system.', 400);
    }

    if (accent && !['default', 'neon-green', 'sunset', 'cyan', 'sage', 'burgundy'].includes(accent)) {
      throw new AppError('Invalid accent. Must be default, neon-green, sunset, cyan, sage, or burgundy.', 400);
    }

    const updates = {};
    if (theme) updates.theme = theme;
    if (accent) updates.accent = accent;

    const user = await updateUserProfile(req.user.id, updates);
    sendSuccess(res, { theme: user.theme, accent: user.accent });
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