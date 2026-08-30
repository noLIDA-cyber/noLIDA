const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { createOrder, getOrder, listOrders, updateOrderStatus } = require('../services/orderService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.post('/', authenticate, async (req, res, next) => {
  try {
    const order = await createOrder(req.user.id, req.body);
    sendSuccess(res, order, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await getOrder(req.params.id, req.user.id);
    sendSuccess(res, order);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const role = req.query.role || 'customer';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listOrders(req.user.id, role, page, limit);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await updateOrderStatus(req.params.id, status, req.user.id);
    sendSuccess(res, order);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/receipt', authenticate, async (req, res, next) => {
  try {
    const order = await getOrder(req.params.id, req.user.id);

    const payment = await query(
      'SELECT * FROM payments WHERE transaction_id = $1 ORDER BY created_at DESC LIMIT 1',
      [order.id]
    );

    const receipt = {
      receipt_number: `RCP-${order.id}-${Date.now().toString(36).toUpperCase()}`,
      order_id: order.id,
      transaction_status: order.transaction_status,
      customer_id: order.customer_id,
      provider_id: order.provider_id,
      listing_title: order.listing_title,
      category_name: order.category_name,
      currency: order.currency || 'NGN',
      subtotal: parseFloat(order.subtotal || 0),
      tax_amount: parseFloat(order.tax_amount || 0),
      discount_amount: parseFloat(order.discount_amount || 0),
      customer_fee: parseFloat(order.customer_fee || 0),
      provider_commission: parseFloat(order.provider_commission || 0),
      platform_fee: parseFloat(order.platform_fee || 0),
      processing_fee: parseFloat(order.processing_fee || 0),
      total_amount: parseFloat(order.total_amount || 0),
      provider_earnings: parseFloat(order.provider_earnings || 0),
      payment_status: payment.rows.length > 0 ? payment.rows[0].status : 'pending',
      payment_method: payment.rows.length > 0 ? payment.rows[0].payment_method : null,
      created_at: order.created_at,
      fee_snapshot: order.fee_snapshot || {},
    };

    sendSuccess(res, receipt);
  } catch (error) {
    next(error);
  }
});

module.exports = router;