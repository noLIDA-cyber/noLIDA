const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM categories WHERE active = TRUE ORDER BY sort_order, name');
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM categories WHERE id = $1 AND active = TRUE', [req.params.id]);
    if (result.rows.length === 0) {
      throw new AppError('Category not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/capabilities', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM capabilities WHERE category_id = $1 AND active = TRUE ORDER BY name',
      [req.params.id]
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;