const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const createBooking = async (userId, bookingData) => {
  const {
    listingId,
    organizationId,
    customerId,
    providerId,
    bookingDate,
    startTime,
    endTime,
    timezone,
    location,
    notes,
    metadata = {},
  } = bookingData;

  if (!listingId || !providerId || !bookingDate || !startTime) {
    throw new AppError('listingId, providerId, bookingDate, and startTime are required', 400);
  }

  const result = await query(
    `INSERT INTO transactions (
      transaction_type, transaction_status, customer_id, provider_id, organization_id, listing_id,
      currency, subtotal, total_amount, fee_snapshot, metadata, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) RETURNING *`,
    [
      'appointment',
      'pending',
      customerId || userId,
      providerId,
      organizationId || null,
      listingId,
      metadata.currency || 'NGN',
      metadata.subtotal || 0,
      metadata.totalAmount || 0,
      metadata.feeSnapshot || {},
      metadata,
    ]
  );

  const transaction = result.rows[0];

  await query(
    `INSERT INTO payments (
      transaction_id, payment_provider, payment_method, amount, currency, status, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      transaction.id,
      'flutterwave',
      null,
      metadata.totalAmount || 0,
      metadata.currency || 'NGN',
      'pending',
      {},
    ]
  );

  return transaction;
};

const getBooking = async (bookingId, userId) => {
  const result = await query(
    `SELECT t.*, l.title as listing_title, c.name as category_name,
            p.display_name as provider_name, org.name as organization_name
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     JOIN categories c ON c.id = l.category_id
     LEFT JOIN profiles p ON p.user_id = t.provider_id
     LEFT JOIN organizations org ON org.id = t.organization_id
     WHERE t.id = $1 AND t.transaction_type = 'appointment' AND (t.customer_id = $2 OR t.provider_id = $2)`,
    [bookingId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Booking not found', 404);
  }

  return result.rows[0];
};

const listBookings = async (userId, role = 'customer', page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const whereClause = role === 'provider' ? 't.provider_id = $1' : 't.customer_id = $1';

  const result = await query(
    `SELECT t.*, l.title as listing_title, c.name as category_name,
            p.display_name as provider_name, org.name as organization_name
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     JOIN categories c ON c.id = l.category_id
     LEFT JOIN profiles p ON p.user_id = t.provider_id
     LEFT JOIN organizations org ON org.id = t.organization_id
     WHERE ${whereClause} AND t.transaction_type = 'appointment'
     ORDER BY t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM transactions t WHERE ${whereClause} AND t.transaction_type = 'appointment'`,
    [userId]
  );

  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const updateBookingStatus = async (bookingId, status, userId) => {
  const allowed = ['confirmed', 'in_progress', 'completed', 'cancelled', 'refunded', 'disputed'];
  if (!allowed.includes(status)) {
    throw new AppError(`Invalid booking status: ${status}`, 400);
  }

  const result = await query(
    'UPDATE transactions SET transaction_status = $1, updated_at = NOW() WHERE id = $2 AND (customer_id = $3 OR provider_id = $3) RETURNING *',
    [status, bookingId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Booking not found', 404);
  }

  return result.rows[0];
};

module.exports = {
  createBooking,
  getBooking,
  listBookings,
  updateBookingStatus,
};