const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getNotifications, getUnreadCount, markAsRead, markAllAsRead } = require('../services/notificationService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await getNotifications(req.user.id, page, limit);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const result = await getUnreadCount(req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await markAsRead(req.params.id, req.user.id);
    sendSuccess(res, notification);
  } catch (error) {
    next(error);
  }
});

router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    const result = await markAllAsRead(req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
