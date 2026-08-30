const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { createServiceRequest, getServiceRequest, listServiceRequests, updateServiceRequest, matchRequestToListing } = require('../services/requestService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.post('/', authenticate, async (req, res, next) => {
  try {
    const request = await createServiceRequest(req.user.id, req.body);
    sendSuccess(res, request, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await getServiceRequest(req.params.id, req.user.id);
    sendSuccess(res, request);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const role = req.query.role || 'customer';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listServiceRequests(req.user.id, role, page, limit);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await updateServiceRequest(req.params.id, req.user.id, req.body);
    sendSuccess(res, request);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/match', authenticate, async (req, res, next) => {
  try {
    const { listingId, matchScore, message } = req.body;
    const result = await matchRequestToListing(req.params.id, listingId, req.user.id, matchScore, message);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
