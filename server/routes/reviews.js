const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { createReview, getReview, listReviews, updateReview, deleteReview, getProviderRating } = require('../services/reviewService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.post('/', authenticate, async (req, res, next) => {
  try {
    const review = await createReview(req.user.id, req.body.providerId, req.body);
    sendSuccess(res, review, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { providerId, customerId } = req.query;

    const result = await listReviews({ providerId, customerId, page, limit });
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/provider/:providerId', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listReviews({ providerId: req.params.providerId, page, limit });
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

    const result = await listReviews({ customerId: req.user.id, page, limit });
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
    const review = await getReview(req.params.id);
    sendSuccess(res, review);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const review = await updateReview(req.params.id, req.user.id, req.body);
    sendSuccess(res, review);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await deleteReview(req.params.id, req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.get('/rating/:providerId', async (req, res, next) => {
  try {
    const rating = await getProviderRating(req.params.providerId);
    sendSuccess(res, rating);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
