const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog, getAuditLog, listAuditLogs, getAuditSummary } = require('../services/auditService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.post('/', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const log = await createAuditLog(req.body);
    sendSuccess(res, log, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/summary', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const summary = await getAuditSummary();
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, authorize(['admin', 'moderator']), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listAuditLogs({ ...req.query, page, limit });
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
    const log = await getAuditLog(req.params.id);
    sendSuccess(res, log);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
