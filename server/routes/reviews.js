const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireOwnership } = require('../middleware/ownership');
const { createReview, getReview, listReviews, updateReview, deleteReview, getProviderRating } = require('../services/reviewService');
const { asyncHandler } = require('../middleware/error');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response');
const { validateRequest, validateParams, validateQuery, paginationSchema, reviewSchemas, schemas } = require('../utils/validation');

// Create review (customer who participated in transaction)
router.post('/',
  authenticate,
  validateRequest(reviewSchemas.create),
  asyncHandler(async (req, res) => {
    const review = await createReview(req.user.id, req.body.providerId, req.body);
    sendCreated(res, review, 'Review created successfully');
  })
);

// List reviews
router.get('/',
  validateQuery(paginationSchema.keys({
    providerId: schemas.id.optional(),
    customerId: schemas.id.optional(),
  }), { presence: 'optional' }),
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { providerId, customerId } = req.query;

    const result = await listReviews({ providerId, customerId, page, limit });
    sendPaginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit, 'Reviews retrieved successfully');
  })
);

// List reviews for specific provider
router.get('/provider/:providerId',
  validateParams(Joi.object({ providerId: schemas.id }),
  validateQuery(paginationSchema, { presence: 'optional' }),
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listReviews({ providerId: req.params.providerId, page, limit });
    sendPaginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit, 'Provider reviews retrieved successfully');
  })
);

// List my reviews (customer)
router.get('/me',
  authenticate,
  validateQuery(paginationSchema, { presence: 'optional' }),
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listReviews({ customerId: req.user.id, page, limit });
    sendPaginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit, 'Your reviews retrieved successfully');
  })
);

// Get single review
router.get('/:id',
  authenticate,
  validateParams(Joi.object({ id: schemas.id }),
  asyncHandler(async (req, res) => {
    const review = await getReview(req.params.id);
    sendSuccess(res, review, 200, 'Review retrieved successfully');
  })
);

// Update review (owner only)
router.patch('/:id',
  authenticate,
  validateParams(Joi.object({ id: schemas.id }),
  requireOwnership('review'),
  validateRequest(reviewSchemas.update),
  asyncHandler(async (req, res) => {
    const review = await updateReview(req.params.id, req.user.id, req.body);
    sendSuccess(res, review, 200, 'Review updated successfully');
  })
);

// Delete review (owner only)
router.delete('/:id',
  authenticate,
  validateParams(Joi.object({ id: schemas.id }),
  requireOwnership('review'),
  asyncHandler(async (req, res) => {
    const result = await deleteReview(req.params.id, req.user.id);
    sendSuccess(res, result, 200, 'Review deleted successfully');
  })
);

// Get provider rating summary
router.get('/rating/:providerId',
  validateParams(Joi.object({ providerId: schemas.id }),
  asyncHandler(async (req, res) => {
    const rating = await getProviderRating(req.params.providerId);
    sendSuccess(res, rating, 200, 'Provider rating retrieved successfully');
  })
);

module.exports = router;
