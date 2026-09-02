const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorization');
const { asyncHandler } = require('../middleware/error');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { validateParams, validateQuery, validateRequest, paginationSchema, adminSchemas, schemas } = require('../utils/validation');

// Admin routes - require authentication
router.use(authenticate);

// List all users (admin only)
router.get('/users',
  requirePermission('users.view'),
  validateQuery(paginationSchema, { presence: 'optional' }),
  asyncHandler(async (req, res) => {
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

    sendPaginated(res, result.rows, total, page, limit, 'Users retrieved successfully');
  })
);

// List all transactions (admin only)
router.get('/transactions',
  requirePermission('transactions.view'),
  validateQuery(paginationSchema, { presence: 'optional' }),
  asyncHandler(async (req, res) => {
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

    sendPaginated(res, result.rows, total, page, limit, 'Transactions retrieved successfully');
  })
);

// Update user status (admin only - requires users.manage permission)
router.patch('/users/:userId/status',
  requirePermission('users.manage'),
  validateParams(Joi.object({ userId: schemas.id })),
  validateRequest(adminSchemas.updateUserStatus),
  asyncHandler(async (req, res) => {
    const { query } = require('../config/database');
    const { status, reason } = req.body;

    const result = await query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, status, created_at',
      [status, req.params.userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Audit log the change
    await query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'user_status_updated', 'user', req.params.userId, JSON.stringify({ new_status: status, reason })]
    );

    sendSuccess(res, result.rows[0], 200, 'User status updated successfully');
  })
);

// List risk events (admin only)
router.get('/risk',
  requirePermission('risk.view'),
  validateQuery(paginationSchema, { presence: 'optional' }),
  asyncHandler(async (req, res) => {
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

    sendPaginated(res, result.rows, total, page, limit, 'Risk events retrieved successfully');
  })
);

// Resolve risk event (admin only - requires risk.manage permission)
router.patch('/risk/:id/resolve',
  requirePermission('risk.manage'),
  validateParams(Joi.object({ id: schemas.id })),
  validateRequest(adminSchemas.updateRiskEvent),
  asyncHandler(async (req, res) => {
    const { query } = require('../config/database');
    const { status, notes, action } = req.body;

    const result = await query(
      'UPDATE risk_events SET status = $1, resolved_at = NOW(), resolved_by = $2, metadata = $3 WHERE id = $4 RETURNING *',
      [status || 'resolved', req.user.id, JSON.stringify({ notes: notes || '', action }), req.params.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Risk event not found');
    }

    sendSuccess(res, result.rows[0], 200, 'Risk event resolved successfully');
  })
);

// List audit logs (admin only)
router.get('/audit-logs',
  requirePermission('admin.audit'),
  validateQuery(paginationSchema, { presence: 'optional' }),
  asyncHandler(async (req, res) => {
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

    sendPaginated(res, result.rows, total, page, limit, 'Audit logs retrieved successfully');
  })
);

module.exports = router;