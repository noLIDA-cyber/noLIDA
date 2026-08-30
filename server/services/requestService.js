const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const createServiceRequest = async (userId, requestData) => {
  const { categoryId, title, description, location, budgetMin, budgetMax, urgency } = requestData;

  if (!title) {
    throw new AppError('Title is required', 400);
  }

  const result = await query(
    `INSERT INTO service_requests 
     (customer_id, category_id, title, description, location, budget_min, budget_max, urgency, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [userId, categoryId || null, title, description || null, location || null, budgetMin || null, budgetMax || null, urgency || 'normal', 'open']
  );

  return result.rows[0];
};

const getServiceRequest = async (requestId, userId) => {
  const result = await query(
    'SELECT * FROM service_requests WHERE id = $1 AND customer_id = $2',
    [requestId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Request not found', 404);
  }

  return result.rows[0];
};

const listServiceRequests = async (userId, role = 'customer', page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const whereClause = role === 'provider' ? 'sr.customer_id = $1' : 'sr.customer_id = $1';

  const result = await query(
    `SELECT sr.*, c.name as category_name
     FROM service_requests sr
     LEFT JOIN categories c ON c.id = sr.category_id
     WHERE ${whereClause}
     ORDER BY sr.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM service_requests sr WHERE ${whereClause}`,
    [userId]
  );

  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const updateServiceRequest = async (requestId, userId, updates) => {
  const allowed = ['title', 'description', 'location', 'budget_min', 'budget_max', 'urgency', 'status', 'matched_listing_id'];
  const setClause = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      setClause.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  }

  if (setClause.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  setClause.push(`updated_at = NOW()`);
  values.push(requestId, userId);

  const result = await query(
    `UPDATE service_requests SET ${setClause.join(', ')} WHERE id = $${index} AND customer_id = $${index + 1} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Request not found', 404);
  }

  return result.rows[0];
};

const matchRequestToListing = async (requestId, listingId, providerId, matchScore, message) => {
  const result = await query(
    `INSERT INTO request_matches (request_id, listing_id, provider_id, match_score, message)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [requestId, listingId, providerId, matchScore || 0, message || null]
  );

  await query(
    'UPDATE service_requests SET status = $1, updated_at = NOW() WHERE id = $2',
    ['matched', requestId]
  );

  return result.rows[0];
};

module.exports = {
  createServiceRequest,
  getServiceRequest,
  listServiceRequests,
  updateServiceRequest,
  matchRequestToListing,
};
