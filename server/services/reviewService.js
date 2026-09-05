const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');
const { createNotification } = require('./notificationService');

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
    'INSERT INTO reviews (transaction_id, customer_id, provider_id, organization_id, rating, title, content, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
    [transactionId, customerId, providerId, organizationId || null, rating, title || null, content, 'pending']
  );

  try {
    const providerResult = await query('SELECT email FROM users WHERE id = $1', [providerId]);
    const providerEmail = providerResult.rows[0]?.email || 'a provider';
    const stars = '★'.repeat(Math.max(1, Math.min(5, parseInt(rating, 10) || 0)));
    const admins = await query(
      `SELECT u.id FROM users u
       JOIN organization_members om ON om.user_id = u.id
       JOIN role_permissions rp ON rp.role_id = om.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE p.slug = 'reviews.moderate' AND om.status = 'active'`
    );
    for (const admin of admins.rows) {
      await createNotification(admin.id, {
        type: 'review_pending',
        title: `New review awaiting moderation (${stars})`,
        body: `A ${rating}-star review was left for ${providerEmail}.`,
        channel: 'in_app',
        data: { link: '/admin', review_id: result.rows[0].id },
      });
    }
  } catch (err) {
    console.error('Failed to create review-pending notification:', err.message);
  }

  return result.rows[0];
};

const getReview = async (reviewId, includeAllStatuses = false) => {
  const sql = includeAllStatuses
    ? 'SELECT * FROM reviews WHERE id = $1'
    : "SELECT * FROM reviews WHERE id = $1 AND status = 'published'";
  const result = await query(sql, [reviewId]);
  if (result.rows.length === 0) {
    throw new AppError('Review not found', 404);
  }
  return result.rows[0];
};

const listReviews = async (filters = {}) => {
  const { providerId, customerId, status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let index = 1;

  // Public callers don't pass a status. Default to 'published'.
  const effectiveStatus = status || 'published';

  conditions.push(`status = $${index}`);
  values.push(effectiveStatus);
  index++;

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

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

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

const listPendingReviews = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT r.*, u.email as customer_email, p.display_name as customer_name,
            pu.email as provider_email, pp.display_name as provider_name
     FROM reviews r
     JOIN users u ON u.id = r.customer_id
     LEFT JOIN profiles p ON p.user_id = r.customer_id
     JOIN users pu ON pu.id = r.provider_id
     LEFT JOIN profiles pp ON pp.user_id = r.provider_id
     WHERE r.status = 'pending'
     ORDER BY r.created_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const countResult = await query("SELECT COUNT(*) FROM reviews WHERE status = 'pending'");
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const moderateReview = async (adminId, reviewId, action, notes = null) => {
  const allowed = { approve: 'published', reject: 'hidden' };
  if (!allowed[action]) {
    throw new AppError(`Invalid action. Allowed: ${Object.keys(allowed).join(', ')}`, 400);
  }
  const newStatus = allowed[action];

  const reviewResult = await query('SELECT id, status FROM reviews WHERE id = $1', [reviewId]);
  if (reviewResult.rows.length === 0) {
    throw new AppError('Review not found', 404);
  }

  await query(
    `UPDATE reviews
     SET status = $1, reviewed_by = $2, reviewed_at = NOW(), moderation_notes = $3, updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [newStatus, adminId, notes || null, reviewId]
  );

  await query(
    `INSERT INTO audit_logs (actor_id, action, target_type, target_id, changes)
     VALUES ($1, $2, 'review', $3, $4)`,
    [adminId, `review_${action}`, reviewId, JSON.stringify({ new_status: newStatus, notes })]
  );

  try {
    const reviewRow = reviewResult.rows[0];
    const stars = '★'.repeat(Math.max(1, Math.min(5, parseInt(reviewRow.rating, 10) || 0)));
    if (action === 'approve') {
      await createNotification(reviewRow.provider_id, {
        type: 'review_approved',
        title: `You received a new ${stars} review`,
        body: reviewRow.title || 'A customer left a review for your business.',
        channel: 'in_app',
        data: { link: '/reviews', review_id: reviewId },
      });
    } else if (action === 'reject') {
      await createNotification(reviewRow.customer_id, {
        type: 'review_rejected',
        title: 'Your review was not published',
        body: notes ? `Reason: ${notes}` : 'Please review our community guidelines and resubmit.',
        channel: 'in_app',
        data: { link: '/reviews', review_id: reviewId },
      });
    }
  } catch (err) {
    console.error('Failed to create review moderation notification:', err.message);
  }

  return await getReview(reviewId, true);
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

  return getReview(reviewId, true);
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
  listPendingReviews,
  moderateReview,
  updateReview,
  deleteReview,
  getProviderRating,
};
