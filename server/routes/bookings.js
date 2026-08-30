const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { createBooking, getBooking, listBookings, updateBookingStatus } = require('../services/bookingService');
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

    const result = await listBookings(req.user.id, role, page, limit);
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
    const { status } = req.body;
    const booking = await updateBookingStatus(req.params.id, status, req.user.id);
    sendSuccess(res, booking);
  } catch (error) {
    next(error);
  }
});

module.exports = router;