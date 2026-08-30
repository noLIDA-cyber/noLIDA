const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const createReview = async (customerId, providerId, data) => {
  const { transactionId, rating, title, content, organizationId } = data;

  if (!transactionId || !rating || !content) {
    throw new AppError('Transaction ID, rating, and content are required', 400);
  }

  if (rating < 1 || rating > 5) {
    throw new AppError('Rating must be between 1 and 5', 400);
  }

  const transactionCheck = await query('SELECT id, customer_id, provider_id FROM transactions WHERE id = $1', [transactionId]);
  if (transactionCheck.rows.length === 0) {
    throw new AppError('Transaction not found', 404);
  }

  const transaction = transactionCheck.rows[0];
  if (transaction.customer_id !== customerId) {
    throw new AppError('You can only review transactions you participated in', 403);
  }
  if (transaction.provider_id !== providerId) {
    throw new AppError('Provider ID does not match transaction', 400);
  }

  const existingReview = await query('SELECT id FROM reviews WHERE transaction_id = $1', [transactionId]);
  if (existingReview.rows.length > 0) {
    throw new AppError('You have already reviewed this transaction', 409);
  }

  const result = await query(
    'INSERT INTO reviews (transaction_id, customer_id, provider_id, organization_id, rating, title, content) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [transactionId, customerId, providerId, organizationId || null, rating, title || null, content]
  );

  return result.rows[0];
};

const getReview = async (reviewId) => {
  const result = await query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
  if (result.rows.length === 0) {
    throw new AppError('Review not found', 404);
  }
  return result.rows[0];
};

const listReviews = async (filters = {}) => {
  const { providerId, customerId, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let index = 1;

  if (providerId) {
    conditions.push(`provider_id = $${index}`);
    values.push(providerId);
    index++;
  }

  if (customerId) {
    conditions.push(`customer_id = $${index}`);
    values.push(customerId);
    index++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT * FROM reviews ${whereClause} ORDER BY created_at DESC LIMIT $${index} OFFSET $${index + 1}`,
    [...values, limit, offset]
  );

  const countResult = await query(`SELECT COUNT(*) FROM reviews ${whereClause}`, values);
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const updateReview = async (reviewId, customerId, updates) => {
  const allowedFields = ['rating', 'title', 'content', 'response'];
  const reviewUpdates = [];
  const reviewValues = [];
  let index = 1;

  const reviewResult = await query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
  if (reviewResult.rows.length === 0) {
    throw new AppError('Review not found', 404);
  }

  const review = reviewResult.rows[0];
  if (review.customer_id !== customerId) {
    throw new AppError('You can only update your own reviews', 403);
  }

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      if (key === 'rating' && (value < 1 || value > 5)) {
        throw new AppError('Rating must be between 1 and 5', 400);
      }
      reviewUpdates.push(`${key} = $${index}`);
      reviewValues.push(value);
      index++;
    }
  }

  if (reviewUpdates.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  reviewUpdates.push(`updated_at = NOW()`);
  reviewValues.push(reviewId);

  await query(`UPDATE reviews SET ${reviewUpdates.join(', ')} WHERE id = $${index}`, reviewValues);

  return getReview(reviewId);
};

const deleteReview = async (reviewId, customerId) => {
  const reviewResult = await query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
  if (reviewResult.rows.length === 0) {
    throw new AppError('Review not found', 404);
  }

  const review = reviewResult.rows[0];
  if (review.customer_id !== customerId) {
    throw new AppError('You can only delete your own reviews', 403);
  }

  await query('DELETE FROM reviews WHERE id = $1', [reviewId]);
  return { message: 'Review deleted successfully' };
};

const getProviderRating = async (providerId) => {
  const result = await query(
    'SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews FROM reviews WHERE provider_id = $1 AND status = $2',
    [providerId, 'published']
  );

  const stats = result.rows[0];
  return {
    averageRating: parseFloat(stats.average_rating) || 0,
    totalReviews: parseInt(stats.total_reviews) || 0,
  };
};

module.exports = {
  createReview,
  getReview,
  listReviews,
  updateReview,
  deleteReview,
  getProviderRating,
};
