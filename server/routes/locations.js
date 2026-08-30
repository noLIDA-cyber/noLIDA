const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM locations WHERE active = TRUE ORDER BY created_at DESC');
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM locations WHERE id = $1 AND active = TRUE', [req.params.id]);
    if (result.rows.length === 0) {
      throw new AppError('Location not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { organizationId, userId, name, addressLine1, addressLine2, city, stateProvince, postalCode, country, latitude, longitude, phone, email, timezone } = req.body;
    const result = await query(
      `INSERT INTO locations (organization_id, user_id, name, address_line1, address_line2, city, state_province, postal_code, country, latitude, longitude, phone, email, timezone, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [organizationId, userId, name, addressLine1, addressLine2, city, stateProvince, postalCode, country || 'Nigeria', latitude, longitude, phone, email, timezone || 'Africa/Lagos', TRUE]
    );
    sendSuccess(res, result.rows[0], 201);
  } catch (error) {
    next(error);
  }
});

module.exports = router;