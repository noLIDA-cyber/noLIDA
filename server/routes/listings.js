const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : null;

    let sql = `
      SELECT l.id, l.title, l.description, l.status, l.verified, l.featured, l.created_at,
             c.name as category_name,
             p.display_name as provider_name,
             org.name as business_name,
             lp.pricing_type, lp.base_price, lp.currency, lp.min_price, lp.max_price
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      LEFT JOIN profiles p ON p.user_id = l.provider_id
      LEFT JOIN organizations org ON org.id = l.organization_id
      LEFT JOIN listing_pricing lp ON lp.listing_id = l.id
      WHERE l.status = 'active'
    `;
    const params = [];
    let index = 1;

    if (categoryId) {
      sql += ` AND l.category_id = $${index}`;
      params.push(categoryId);
      index++;
    }

    if (req.query.q) {
      sql += ` AND (l.title ILIKE $${index} OR l.description ILIKE $${index})`;
      params.push(`%${req.query.q}%`);
      index++;
    }

    sql += ` ORDER BY l.created_at DESC LIMIT $${index} OFFSET $${index + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    const countResult = await query('SELECT COUNT(*) FROM listings WHERE status = $1', ['active']);
    const total = parseInt(countResult.rows[0].count);

    sendPaginated(res, result.rows, total, page, limit);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT l.*, c.name as category_name,
             p.display_name as provider_name,
             org.name as business_name,
             lp.pricing_type, lp.base_price, lp.currency, lp.min_price, lp.max_price, lp.deposit_required, lp.deposit_amount, lp.deposit_percentage
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      LEFT JOIN profiles p ON p.user_id = l.provider_id
      LEFT JOIN organizations org ON org.id = l.organization_id
      LEFT JOIN listing_pricing lp ON lp.listing_id = l.id
      WHERE l.id = $1 AND l.status = 'active'
    `, [req.params.id]);

    if (result.rows.length === 0) {
      throw new AppError('Listing not found', 404);
    }

    const availability = await query('SELECT * FROM listing_availability WHERE listing_id = $1', [req.params.id]);

    sendSuccess(res, { ...result.rows[0], availability: availability.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { providerId, organizationId, categoryId, capabilityId, title, description, metadata } = req.body;

    if (!providerId || !categoryId || !title) {
      throw new AppError('providerId, categoryId, and title are required', 400);
    }

    const result = await query(
      `INSERT INTO listings (provider_id, organization_id, category_id, capability_id, title, description, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [providerId, organizationId, categoryId, capabilityId, title, description, 'active', metadata || {}]
    );

    sendSuccess(res, result.rows[0], 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'status', 'featured', 'metadata'];
    const updates = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await query(`UPDATE listings SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`, values);
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;