const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const bookingsResult = await query(
      `SELECT COUNT(*) as total, 
              COUNT(CASE WHEN transaction_status = 'confirmed' THEN 1 END) as confirmed,
              COUNT(CASE WHEN transaction_status = 'completed' THEN 1 END) as completed,
              SUM(total_amount) as revenue
       FROM transactions 
       WHERE provider_id = $1 AND transaction_type = 'appointment' AND created_at >= NOW() - INTERVAL '30 days'`,
      [userId]
    );

    const listingsResult = await query(
      'SELECT COUNT(*) as total FROM listings WHERE provider_id = $1 AND status = $2',
      [userId, 'active']
    );

    const reviewsResult = await query(
      `SELECT COUNT(*) as total, AVG(rating) as avg_rating 
       FROM reviews 
       WHERE provider_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [userId]
    );

    const upcomingBookings = await query(
      `SELECT t.*, l.title as listing_title, c.name as category_name,
              p.display_name as customer_name
       FROM transactions t
       JOIN listings l ON l.id = t.listing_id
       JOIN categories c ON c.id = l.category_id
       LEFT JOIN profiles p ON p.user_id = t.customer_id
       WHERE t.provider_id = $1 AND t.transaction_type = 'appointment' 
             AND t.transaction_status IN ('confirmed', 'in_progress')
             AND t.booking_date >= CURRENT_DATE
       ORDER BY t.booking_date ASC, t.start_time ASC
       LIMIT 10`,
      [userId]
    );

    const stats = {
      bookings: bookingsResult.rows[0],
      listings: listingsResult.rows[0],
      reviews: reviewsResult.rows[0],
      upcomingBookings: upcomingBookings.rows,
    };

    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
});

router.get('/listings', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT l.*, c.name as category_name,
              lp.pricing_type, lp.base_price, lp.currency
       FROM listings l
       JOIN categories c ON c.id = l.category_id
       LEFT JOIN listing_pricing lp ON lp.listing_id = l.id
       WHERE l.provider_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );

    sendSuccess(res, result.rows);
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
