const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createDispute, getDispute, listDisputes, updateDisputeStatus } = require('../services/disputeService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.post('/', authenticate, async (req, res, next) => {
  try {
    const dispute = await createDispute(req.user.id, req.body);
    sendSuccess(res, dispute, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listDisputes({ ...req.query, page, limit });
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listDisputes({ openedBy: req.user.id, page, limit });
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
    const dispute = await getDispute(req.params.id);
    sendSuccess(res, dispute);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const { status, resolution } = req.body;
    const dispute = await updateDisputeStatus(req.params.id, status, req.user.id, resolution);
    sendSuccess(res, dispute);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
