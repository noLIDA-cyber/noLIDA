const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { createBooking, getBooking, listBookings, updateBookingStatus, getAvailableSlots, getProviderAvailableDates } = require('../services/bookingService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.post('/', authenticate, async (req, res, next) => {
  try {
    const booking = await createBooking(req.user.id, req.body);
    sendSuccess(res, booking, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const booking = await getBooking(req.params.id, req.user.id);
    sendSuccess(res, booking);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const role = req.query.role || 'customer';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      status: req.query.status,
      listingId: req.query.listingId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    };

    const result = await listBookings(req.user.id, role, page, limit, filters);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const booking = await updateBookingStatus(req.params.id, status, req.user.id, { reason });
    sendSuccess(res, booking);
  } catch (error) {
    next(error);
  }
});

router.get('/available/slots/:listingId', authenticate, async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { date } = req.query;

    if (!date) {
      throw new AppError('date query parameter is required', 400);
    }

    const slots = await getAvailableSlots(listingId, date);
    sendSuccess(res, slots);
  } catch (error) {
    next(error);
  }
});

router.get('/available/dates/:listingId', authenticate, async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const days = parseInt(req.query.days) || 30;

    const listing = await require('../config/database').query(
      'SELECT provider_id FROM listings WHERE id = $1',
      [listingId]
    );

    if (listing.rows.length === 0) {
      throw new AppError('Listing not found', 404);
    }

    const dates = await getProviderAvailableDates(listing.rows[0].provider_id, listingId, days);
    sendSuccess(res, dates);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
