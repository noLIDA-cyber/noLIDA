const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { listListings, getListing, createListing, updateListing, deleteListing } = require('../services/listingService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendPaginated } = require('../utils/response');

router.get('/', async (req, res, next) => {
  try {
    const result = await listListings(req.query);
    sendPaginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const listing = await getListing(req.params.id);
    sendSuccess(res, listing);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const listing = await createListing(req.body);
    sendSuccess(res, listing, 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const listing = await updateListing(req.params.id, req.body, req.user.id);
    sendSuccess(res, listing);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await deleteListing(req.params.id, req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;