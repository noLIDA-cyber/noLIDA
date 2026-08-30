const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createRiskEvent, getRiskEvent, listRiskEvents, resolveRiskEvent, getRiskSummary } = require('../services/riskService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.post('/', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const event = await createRiskEvent(req.body);
    sendSuccess(res, event, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/summary', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const summary = await getRiskSummary();
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listRiskEvents({ ...req.query, page, limit });
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const event = await getRiskEvent(req.params.id);
    sendSuccess(res, event);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/resolve', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const event = await resolveRiskEvent(req.params.id, req.user.id);
    sendSuccess(res, event);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
