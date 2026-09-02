const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { requireOwnershipOrPermission } = require('../middleware/ownership');
const { createOrder, getOrder, listOrders, updateOrderStatus } = require('../services/orderService');
const { asyncHandler } = require('../middleware/error');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response');
const { validateRequest, validateParams, validateQuery, paginationSchema, schemas } = require('../utils/validation');

// Create new order
const createOrderSchema = Joi.object({
  listingId: schemas.id,
  quantity: Joi.number().integer().min(1).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  notes: Joi.string().max(1000).optional(),
  locationId: schemas.id.optional(),
});

router.post('/',
  authenticate,
  validateRequest(createOrderSchema),
  asyncHandler(async (req, res) => {
    const order = await createOrder(req.user.id, req.body);
    sendCreated(res, order, 'Order created successfully');
  })
);

// Get single order by ID (customer or provider only, or admin)
router.get('/:id',
  authenticate,
  validateParams(Joi.object({ id: schemas.id })),
  asyncHandler(async (req, res) => {
    const order = await getOrder(req.params.id, req.user.id);
    sendSuccess(res, order);
  })
);

// List orders for authenticated user
const listOrdersQuerySchema = paginationSchema.keys({
  role: Joi.string().valid('customer', 'provider').default('customer'),
  status: Joi.string().optional(),
});

router.get('/',
  authenticate,
  validateQuery(listOrdersQuerySchema, { presence: 'optional' }),
  asyncHandler(async (req, res) => {
    const role = req.query.role || 'customer';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listOrders(req.user.id, role, page, limit);
    sendPaginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit);
  })
);

// Update order status (customer/provider only, admin can override)
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')
    .required(),
  notes: Joi.string().max(500).optional(),
});

router.patch('/:id/status',
  authenticate,
  validateParams(Joi.object({ id: schemas.id })),
  requireOwnershipOrPermission('order', 'orders.manage'),
  validateRequest(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const order = await updateOrderStatus(req.params.id, req.body.status, req.user.id);
    sendSuccess(res, order, 200, 'Order status updated successfully');
  })
);

// Get order receipt (customer/provider only, or admin)
router.get('/:id/receipt',
  authenticate,
  validateParams(Joi.object({ id: schemas.id })),
  asyncHandler(async (req, res) => {
    const { query } = require('../config/database');
    
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

    sendSuccess(res, receipt, 200, 'Receipt retrieved successfully');
  })
);

module.exports = router;