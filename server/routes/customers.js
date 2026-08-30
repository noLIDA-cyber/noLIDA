const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { listCustomers, getCustomerDetail, getCustomerActivity, getProviderStats } = require('../services/customerService');
const { AppError } = require('../middleware/error');
const { sendSuccess } = require('../utils/response');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await listCustomers(req.user.id, req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await getProviderStats(req.user.id);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const detail = await getCustomerDetail(req.user.id, req.params.id);
    sendSuccess(res, detail);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/activity', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await getCustomerActivity(req.user.id, req.params.id, page, limit);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
