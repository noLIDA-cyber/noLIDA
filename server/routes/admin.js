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

router.patch('/users/:userId/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'suspended', 'deactivated'];

    if (!allowed.includes(status)) {
      throw new AppError(`Invalid status. Allowed: ${allowed.join(', ')}`, 400);
    }

    const result = await query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, status',
      [status, req.params.userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    await query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, changes) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'user_status_updated', 'user', req.params.userId, JSON.stringify({ new_status: status })]
    );

    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/risk', async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      'SELECT * FROM risk_events ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) FROM risk_events');
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

router.patch('/risk/:id/resolve', async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    const result = await query(
      'UPDATE risk_events SET status = $1, resolved_at = NOW(), resolved_by = $2, metadata = $3 WHERE id = $4 RETURNING *',
      [status || 'resolved', req.user.id, JSON.stringify({ notes: notes || '' }), req.params.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Risk event not found', 404);
    }

    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/audit-logs', async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) FROM audit_logs');
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