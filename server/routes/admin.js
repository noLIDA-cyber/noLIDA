const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/error');

router.use(authenticate);
router.use(authorize('super_admin', 'admin'));

router.get('/users', async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      'SELECT id, email, status, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) FROM users');
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

router.get('/transactions', async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      'SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) FROM transactions');
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

module.exports = router;