const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getProviderProfile, updateProviderProfile, getProviderStats } = require('../services/providerService');
const { listListings } = require('../services/listingService');
const { listBookings, getAvailableSlots, getProviderAvailableDates } = require('../services/bookingService');
const { AppError } = require('../middleware/error');
const { sendSuccess } = require('../utils/response');

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const profile = await getProviderProfile(req.user.id);
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
});

router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const profile = await updateProviderProfile(req.user.id, req.body);
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const stats = await getProviderStats(req.user.id);
    const bookings = await listBookings(req.user.id, 'provider', 1, 20, { status: 'confirmed' });
    const upcomingBookings = bookings.data.filter(b => ['confirmed', 'in_progress'].includes(b.transaction_status) && b.booking_date >= new Date().toISOString().split('T')[0]);

    sendSuccess(res, {
      ...stats,
      upcomingBookings: upcomingBookings.slice(0, 10),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/listings', authenticate, async (req, res, next) => {
  try {
    const result = await listListings({ providerId: req.user.id, limit: 100 });
    sendSuccess(res, result.data);
  } catch (error) {
    next(error);
  }
});

router.get('/bookings', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT t.*, l.title as listing_title, c.name as category_name,
              p.display_name as customer_name
       FROM transactions t
       JOIN listings l ON l.id = t.listing_id
       JOIN categories c ON c.id = l.category_id
       LEFT JOIN profiles p ON p.user_id = t.customer_id
       WHERE t.provider_id = $1 AND t.transaction_type = 'appointment'
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM transactions WHERE provider_id = $1 AND transaction_type = $2',
      [req.user.id, 'appointment']
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/availability', authenticate, async (req, res, next) => {
  try {
    const { listingId } = req.query;

    let sql = 'SELECT * FROM listing_availability WHERE listing_id IN (SELECT id FROM listings WHERE provider_id = $1)';
    const params = [req.user.id];

    if (listingId) {
      sql += ' AND listing_id = $2';
      params.push(listingId);
    }

    const result = await query(sql, params);
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/availability', authenticate, async (req, res, next) => {
  try {
    const { listingId, day_of_week, start_time, end_time, break_start, break_end, max_bookings_per_slot, buffer_time } = req.body;

    if (!listingId || day_of_week === undefined || !start_time || !end_time) {
      throw new AppError('listingId, day_of_week, start_time, and end_time are required', 400);
    }

    const listing = await query('SELECT id FROM listings WHERE id = $1 AND provider_id = $2', [listingId, req.user.id]);
    if (listing.rows.length === 0) {
      throw new AppError('Listing not found', 404);
    }

    const result = await query(
      `INSERT INTO listing_availability 
       (listing_id, day_of_week, start_time, end_time, break_start, break_end, max_bookings_per_slot, buffer_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (listing_id, day_of_week) 
       DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
                     break_start = EXCLUDED.break_start, break_end = EXCLUDED.break_end,
                     max_bookings_per_slot = EXCLUDED.max_bookings_per_slot, buffer_time = EXCLUDED.buffer_time,
                     updated_at = NOW()
       RETURNING *`,
      [listingId, day_of_week, start_time, end_time, break_start, break_end, max_bookings_per_slot || 1, buffer_time || 0]
    );

    sendSuccess(res, result.rows[0], 201);
  } catch (error) {
    next(error);
  }
});

router.delete('/availability/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM listing_availability WHERE id = $1 AND listing_id IN (SELECT id FROM listings WHERE provider_id = $2) RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Availability not found', 404);
    }

    sendSuccess(res, { message: 'Availability removed successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/earnings', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DATE(created_at) as date, 
              SUM(total_amount) as revenue,
              SUM(provider_earnings) as earnings,
              SUM(platform_fee) as platform_fees,
              COUNT(*) as bookings
       FROM transactions 
       WHERE provider_id = $1 AND transaction_type = 'appointment'
             AND created_at >= NOW() - INTERVAL '90 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [req.user.id]
    );

    const totalResult = await query(
      `SELECT SUM(total_amount) as total_revenue, SUM(provider_earnings) as total_earnings
       FROM transactions 
       WHERE provider_id = $1 AND transaction_type = 'appointment'`,
      [req.user.id]
    );

    sendSuccess(res, {
      daily: result.rows,
      totals: totalResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
