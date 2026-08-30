const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM organizations WHERE status = $1 ORDER BY created_at DESC', ['active']);
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM organizations WHERE id = $1 AND status = $2', [req.params.id, 'active']);
    if (result.rows.length === 0) {
      throw new AppError('Organization not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, type, description, website, email, phone } = req.body;
    const result = await query(
      `INSERT INTO organizations (name, type, description, website, email, phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, type || 'business', description, website, email, phone, 'active']
    );
    sendSuccess(res, result.rows[0], 201);
  } catch (error) {
    next(error);
  }
});

module.exports = router;