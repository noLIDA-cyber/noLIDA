const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

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

  const bookingDateTime = new Date(`${bookingDate}T${startTime}`);
  if (bookingDateTime < new Date()) {
    throw new AppError('Cannot book a slot in the past', 400);
  }

  const availabilityCheck = await query(
    `SELECT la.*, l.title as listing_title
     FROM listing_availability la
     JOIN listings l ON l.id = la.listing_id
     WHERE la.listing_id = $1 
       AND la.day_of_week = $2
       AND la.start_time <= $3
       AND la.end_time >= $4`,
    [listingId, bookingDateTime.getDay(), startTime, endTime || startTime]
  );

  if (availabilityCheck.rows.length === 0) {
    throw new AppError('The requested time is outside provider availability', 400);
  }

  const slot = availabilityCheck.rows[0];

  const conflictCheck = await query(
    `SELECT COUNT(*) as count FROM transactions 
     WHERE provider_id = $1 
       AND listing_id = $2 
       AND booking_date = $3
       AND transaction_status NOT IN ('cancelled', 'refunded', 'failed')
       AND (
         (start_time < $4 AND end_time > $4) OR
         (start_time < $5 AND end_time > $5) OR
         (start_time >= $4 AND end_time <= $5)
       )`,
    [providerId, listingId, bookingDate, startTime, endTime || startTime]
  );

  const existingBookings = parseInt(conflictCheck.rows[0].count);
  if (existingBookings >= (slot.max_bookings_per_slot || 1)) {
    throw new AppError('This time slot is fully booked', 409);
  }

  const result = await query(
    `INSERT INTO transactions (
      transaction_type, transaction_status, customer_id, provider_id, organization_id, listing_id,
      currency, subtotal, total_amount, fee_snapshot, metadata,
      booking_date, start_time, end_time, timezone, location, notes,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()) RETURNING *`,
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
      bookingDate,
      startTime,
      endTime || null,
      timezone || 'Africa/Lagos',
      location ? JSON.stringify(location) : '{}',
      notes || null,
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
            p.display_name as provider_name, p.phone as provider_phone, p.email as provider_email,
            org.name as organization_name, org.phone as org_phone
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

const listBookings = async (userId, role = 'customer', page = 1, limit = 20, filters = {}) => {
  const offset = (page - 1) * limit;
  const whereClause = role === 'provider' ? 't.provider_id = $1' : 't.customer_id = $1';
  const params = [userId];
  let paramIndex = 2;

  let filterSql = '';
  if (filters.status) {
    filterSql += ` AND t.transaction_status = $${paramIndex++}`;
    params.push(filters.status);
  }
  if (filters.listingId) {
    filterSql += ` AND t.listing_id = $${paramIndex++}`;
    params.push(filters.listingId);
  }
  if (filters.dateFrom) {
    filterSql += ` AND t.booking_date >= $${paramIndex++}`;
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    filterSql += ` AND t.booking_date <= $${paramIndex++}`;
    params.push(filters.dateTo);
  }

  const result = await query(
    `SELECT t.*, l.title as listing_title, c.name as category_name,
            p.display_name as provider_name, org.name as organization_name
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     JOIN categories c ON c.id = l.category_id
     LEFT JOIN profiles p ON p.user_id = t.provider_id
     LEFT JOIN organizations org ON org.id = t.organization_id
     WHERE ${whereClause} AND t.transaction_type = 'appointment'${filterSql}
     ORDER BY t.booking_date DESC NULLS LAST, t.start_time DESC NULLS LAST
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM transactions t WHERE ${whereClause} AND t.transaction_type = 'appointment'${filterSql}`,
    params
  );

  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const updateBookingStatus = async (bookingId, status, userId, options = {}) => {
  const allowed = ['confirmed', 'in_progress', 'completed', 'cancelled', 'refunded', 'disputed'];
  if (!allowed.includes(status)) {
    throw new AppError(`Invalid booking status: ${status}`, 400);
  }

  let updateFields = 'transaction_status = $1, updated_at = NOW()';
  const params = [status, bookingId];

  if (status === 'cancelled') {
    updateFields += ', cancelled_at = NOW(), cancellation_reason = $3';
    params.push(options.reason || null);
  }

  const result = await query(
    `UPDATE transactions SET ${updateFields} WHERE id = $2 AND (customer_id = $3 OR provider_id = $3) RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new AppError('Booking not found', 404);
  }

  return result.rows[0];
};

const getAvailableSlots = async (listingId, date) => {
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();

  const availabilityResult = await query(
    `SELECT la.*, l.title as listing_title, l.provider_id
     FROM listing_availability la
     JOIN listings l ON l.id = la.listing_id
     WHERE la.listing_id = $1 AND la.day_of_week = $2`,
    [listingId, dayOfWeek]
  );

  if (availabilityResult.rows.length === 0) {
    return [];
  }

  const availability = availabilityResult.rows[0];

  const bookingsResult = await query(
    `SELECT start_time, end_time FROM transactions 
     WHERE listing_id = $1 
       AND booking_date = $2 
       AND transaction_status NOT IN ('cancelled', 'refunded', 'failed')`,
    [listingId, date]
  );

  const bookings = bookingsResult.rows;

  const slots = [];
  const slotDuration = 60;
  const bufferTime = availability.buffer_time || 0;
  const maxBookings = availability.max_bookings_per_slot || 1;

  let currentTime = new Date(`${date}T${availability.start_time}`);
  const endTime = new Date(`${date}T${availability.end_time}`);

  if (availability.break_start && availability.break_end) {
    const breakStart = new Date(`${date}T${availability.break_start}`);
    const breakEnd = new Date(`${date}T${availability.break_end}`);
  }

  while (currentTime < endTime) {
    const slotStart = currentTime.toTimeString().slice(0, 5);
    const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
    const slotEndStr = slotEnd.toTimeString().slice(0, 5);

    if (slotEnd > endTime) break;

    if (availability.break_start && availability.break_end) {
      const breakStart = new Date(`${date}T${availability.break_start}`);
      const breakEnd = new Date(`${date}T${availability.break_end}`);
      if (currentTime < breakEnd && slotEnd > breakStart) {
        currentTime = slotEnd;
        continue;
      }
    }

    const overlappingBookings = bookings.filter(b => {
      const bStart = new Date(`${date}T${b.start_time}`);
      const bEnd = new Date(`${date}T${b.end_time}`);
      return currentTime < bEnd && slotEnd > bStart;
    }).length;

    const isAvailable = overlappingBookings < maxBookings;

    slots.push({
      start_time: slotStart,
      end_time: slotEndStr,
      available: isAvailable,
      booking_count: overlappingBookings,
      max_bookings: maxBookings,
    });

    currentTime = slotEnd;
  }

  return {
    availability,
    slots,
    date,
    listingId,
  };
};

const getProviderAvailableDates = async (providerId, listingId, days = 30) => {
  const today = new Date();
  const dates = [];

  const availabilityResult = await query(
    `SELECT DISTINCT day_of_week FROM listing_availability 
     WHERE listing_id = $1`,
    [listingId]
  );

  const availableDays = new Set(availabilityResult.rows.map(r => r.day_of_week));

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    if (availableDays.has(date.getDay())) {
      const bookingsResult = await query(
        `SELECT COUNT(*) as count FROM transactions 
         WHERE provider_id = $1 
           AND listing_id = $2 
           AND booking_date = $3
           AND transaction_status NOT IN ('cancelled', 'refunded', 'failed')`,
        [providerId, listingId, dateStr]
      );

      const availabilityCheck = await query(
        `SELECT max_bookings_per_slot FROM listing_availability 
         WHERE listing_id = $1 AND day_of_week = $2`,
        [listingId, date.getDay()]
      );

      const maxBookings = availabilityCheck.rows[0]?.max_bookings_per_slot || 1;
      const bookingCount = parseInt(bookingsResult.rows[0].count);

      dates.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        available: bookingCount < maxBookings * 10,
      });
    }
  }

  return dates;
};

module.exports = {
  createBooking,
  getBooking,
  listBookings,
  updateBookingStatus,
  getAvailableSlots,
  getProviderAvailableDates,
};
