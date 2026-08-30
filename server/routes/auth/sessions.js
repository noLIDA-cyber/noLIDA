const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { getSessions, revokeSession, revokeAllSessions } = require('../../services/sessionService');
const { AppError } = require('../../middleware/error');
const { sendSuccess, sendError } = require('../../utils/response');

router.delete('/', authenticate, async (req, res, next) => {
  try {
    const excludeSessionId = req.user.jti || null;
    const result = await revokeAllSessions(req.user.id, excludeSessionId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:sessionId', authenticate, async (req, res, next) => {
  try {
    const result = await revokeSession(req.user.id, req.params.sessionId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const sessions = await getSessions(req.user.id);
    sendSuccess(res, sessions);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
