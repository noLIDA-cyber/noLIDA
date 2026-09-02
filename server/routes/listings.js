const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { requireOwnership } = require('../middleware/ownership');
const { listListings, getListing, createListing, updateListing, deleteListing } = require('../services/listingService');
const { asyncHandler } = require('../middleware/error');
const { sendSuccess, sendPaginated, sendCreated } = require('../utils/response');
const { validateRequest, validateParams, validateQuery, paginationSchema, listingSchemas, schemas } = require('../utils/validation');

// Get all listings with pagination
router.get('/',
  validateQuery(paginationSchema.keys({
    providerId: schemas.id.optional(),
    includeUnapproved: Joi.boolean().default(false),
  }), { presence: 'optional' }),
  asyncHandler(async (req, res) => {
    const isProvider = req.query.providerId === 'true' || req.query.providerId;
    const includeUnapproved = req.query.includeUnapproved === 'true';
    const result = await listListings({ ...req.query, includeUnapproved: includeUnapproved || isProvider });
    sendPaginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit);
  })
);

// Get single listing by ID
router.get('/:id',
  validateParams(Joi.object({ id: schemas.id })),
  asyncHandler(async (req, res) => {
    const isOwner = req.query.owner === 'true';
    const listing = await getListing(req.params.id, false, isOwner);
    sendSuccess(res, listing);
  })
);

// Create new listing
router.post('/',
  authenticate,
  validateRequest(listingSchemas.create),
  asyncHandler(async (req, res) => {
    const listing = await createListing(req.body, req.user.id);
    sendCreated(res, listing, 'Listing created successfully');
  })
);

// Update listing (owner only or admin override)
router.patch('/:id',
  authenticate,
  validateParams(Joi.object({ id: schemas.id })),
  requireOwnership('listing'),
  validateRequest(listingSchemas.update),
  asyncHandler(async (req, res) => {
    const listing = await updateListing(req.params.id, req.body, req.user.id);
    sendSuccess(res, listing, 200, 'Listing updated successfully');
  })
);

// Delete listing (owner only)
router.delete('/:id',
  authenticate,
  validateParams(Joi.object({ id: schemas.id })),
  requireOwnership('listing'),
  asyncHandler(async (req, res) => {
    const result = await deleteListing(req.params.id, req.user.id);
    sendSuccess(res, result, 200, 'Listing deleted successfully');
  })
);

module.exports = router;