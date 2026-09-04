const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { createBusinessSubmission, getBusinessSubmission, listBusinessSubmissions, updateBusinessSubmissionStatus, getSubmissionApprovalHistory } = require('../services/businessSubmissionService');
const { AppError } = require('../middleware/error');
const { sendSuccess } = require('../utils/response');

router.post('/', authenticate, async (req, res, next) => {
  try {
    const submission = await createBusinessSubmission(req.user.id, req.body);
    sendSuccess(res, submission, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await listBusinessSubmissions({ userId: req.user.id, limit: 50 });
    sendSuccess(res, result.data);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const submission = await getBusinessSubmission(req.params.id, req.user.id);
    sendSuccess(res, submission);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
    const history = await getSubmissionApprovalHistory(req.params.id);
    sendSuccess(res, history);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    console.log('PATCH /business-submissions/:id/status hit', { id: req.params.id, body: req.body, user: req.user?.id });
    const { status, notes } = req.body;
    const submission = await updateBusinessSubmissionStatus(req.params.id, status, req.user.id, notes);
    sendSuccess(res, submission);
  } catch (error) {
    console.error('PATCH /business-submissions/:id/status error:', error);
    next(error);
  }
});

module.exports = router;
