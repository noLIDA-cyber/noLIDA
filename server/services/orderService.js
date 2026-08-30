const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const createOrder = async (userId, orderData) => {
  const {
    listingId,
    organizationId,
    customerId,
    providerId,
    items = [],
    shippingAddress,
    metadata = {},
  } = orderData;

  if (!listingId || !providerId || !items || items.length === 0) {
    throw new AppError('listingId, providerId, and items are required', 400);
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = metadata.taxAmount || 0;
  const discountAmount = metadata.discountAmount || 0;
  const totalAmount = subtotal + taxAmount - discountAmount;

  const result = await query(
    `INSERT INTO transactions (
      transaction_type, transaction_status, customer_id, provider_id, organization_id, listing_id,
      currency, subtotal, tax_amount, discount_amount, total_amount, fee_snapshot, metadata, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()) RETURNING *`,
    [
      'order',
      'pending',
      customerId || userId,
      providerId,
      organizationId || null,
      listingId,
      metadata.currency || 'NGN',
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      metadata.feeSnapshot || {},
      { ...metadata, items, shippingAddress },
    ]
  );

  const transaction = result.rows[0];

  await query(
    `INSERT INTO payments (
      transaction_id, payment_provider, payment_method, amount, currency, status, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      transaction.id,
      'flutterwave',
      null,
      totalAmount,
      metadata.currency || 'NGN',
      'pending',
      {},
    ]
  );

  return transaction;
};

const getOrder = async (orderId, userId) => {
  const result = await query(
    `SELECT t.*, l.title as listing_title, c.name as category_name,
            p.display_name as provider_name, org.name as organization_name
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     JOIN categories c ON c.id = l.category_id
     LEFT JOIN profiles p ON p.user_id = t.provider_id
     LEFT JOIN organizations org ON org.id = t.organization_id
     WHERE t.id = $1 AND t.transaction_type = 'order' AND (t.customer_id = $2 OR t.provider_id = $2)`,
    [orderId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  return result.rows[0];
};

const listOrders = async (userId, role = 'customer', page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const whereClause = role === 'provider' ? 't.provider_id = $1' : 't.customer_id = $1';

  const result = await query(
    `SELECT t.*, l.title as listing_title, c.name as category_name,
            p.display_name as provider_name, org.name as organization_name
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     JOIN categories c ON c.id = l.category_id
     LEFT JOIN profiles p ON p.user_id = t.provider_id
     LEFT JOIN organizations org ON org.id = t.organization_id
     WHERE ${whereClause} AND t.transaction_type = 'order'
     ORDER BY t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM transactions t WHERE ${whereClause} AND t.transaction_type = 'order'`,
    [userId]
  );

  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const updateOrderStatus = async (orderId, status, userId) => {
  const allowed = ['confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
  if (!allowed.includes(status)) {
    throw new AppError(`Invalid order status: ${status}`, 400);
  }

  const result = await query(
    'UPDATE transactions SET transaction_status = $1, updated_at = NOW() WHERE id = $2 AND (customer_id = $3 OR provider_id = $3) RETURNING *',
    [status, orderId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  return result.rows[0];
};

module.exports = {
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
};