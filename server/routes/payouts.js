const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const isProvider = req.query.role === 'provider';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.*, u.email as provider_email, pr.display_name as provider_name
      FROM payouts p
      JOIN users u ON u.id = p.provider_id
      LEFT JOIN profiles pr ON pr.user_id = p.provider_id
      WHERE 1=1
    `;
    const params = [];
    let index = 1;

    if (isProvider) {
      sql += ` AND p.provider_id = $${index}`;
      params.push(req.user.id);
      index++;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${index} OFFSET $${index + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    const countResult = await query(
      'SELECT COUNT(*) FROM payouts WHERE 1=1' + (isProvider ? ' AND provider_id = $1' : ''),
      isProvider ? [req.user.id] : []
    );
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

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, u.email as provider_email, pr.display_name as provider_name
       FROM payouts p
       JOIN users u ON u.id = p.provider_id
       LEFT JOIN profiles pr ON pr.user_id = p.provider_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Payout not found', 404);
    }

    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/initiate', authenticate, async (req, res, next) => {
  try {
    const { amount, currency, metadata } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      throw new AppError('Valid amount is required', 400);
    }

    const payout = await require('../services/paymentService').initiatePayout(
      req.user.id,
      amount,
      currency || 'NGN',
      metadata || {}
    );

    sendSuccess(res, payout, 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authenticate, authorize('super_admin', 'admin', 'finance_admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'processing', 'succeeded', 'failed', 'cancelled'];

    if (!allowed.includes(status)) {
      throw new AppError(`Invalid status. Allowed: ${allowed.join(', ')}`, 400);
    }

    const result = await query(
      'UPDATE payouts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Payout not found', 404);
    }

    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
