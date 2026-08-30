const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { submitVerification, getVerification, listVerifications, updateVerificationStatus, getUserVerificationStatus } = require('../services/verificationService');
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
      return sendSuccess(res, { identity: 'none', business: 'none', address: 'none', phone: 'none', email: 'none' });
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

module.exports = router;
