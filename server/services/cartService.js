const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const getCart = async (userId) => {
  const result = await query(
    `SELECT c.*, l.title as listing_title, l.description as listing_description,
            lp.pricing_type, lp.base_price, lp.currency,
            p.display_name as provider_name, org.name as organization_name
     FROM carts c
     JOIN listings l ON l.id = c.listing_id
     LEFT JOIN listing_pricing lp ON lp.listing_id = c.listing_id
     LEFT JOIN profiles p ON p.user_id = l.provider_id
     LEFT JOIN organizations org ON org.id = l.organization_id
     WHERE c.user_id = $1 AND c.checked_out = FALSE
     ORDER BY c.created_at ASC`,
    [userId]
  );

  const subtotal = result.rows.reduce((sum, item) => sum + (item.quantity * (item.unit_price || item.base_price || 0)), 0);

  return {
    items: result.rows,
    subtotal,
    itemCount: result.rows.reduce((sum, item) => sum + item.quantity, 0),
  };
};

const addToCart = async (userId, cartData) => {
  const { listingId, quantity = 1, unitPrice, metadata = {} } = cartData;

  if (!listingId) {
    throw new AppError('listingId is required', 400);
  }

  const existing = await query(
    'SELECT * FROM carts WHERE user_id = $1 AND listing_id = $2 AND checked_out = FALSE',
    [userId, listingId]
  );

  if (existing.rows.length > 0) {
    const result = await query(
      'UPDATE carts SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [quantity, existing.rows[0].id]
    );
    return result.rows[0];
  }

  const result = await query(
    `INSERT INTO carts (user_id, listing_id, quantity, unit_price, metadata)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, listingId, quantity, unitPrice, metadata]
  );

  return result.rows[0];
};

const updateCartItem = async (cartItemId, userId, updates) => {
  const allowed = ['quantity', 'unit_price', 'metadata'];
  const setClause = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      setClause.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  }

  if (setClause.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  setClause.push(`updated_at = NOW()`);
  values.push(cartItemId, userId);

  const result = await query(
    `UPDATE carts SET ${setClause.join(', ')} WHERE id = $${index} AND user_id = $${index + 1} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Cart item not found', 404);
  }

  return result.rows[0];
};

const removeFromCart = async (cartItemId, userId) => {
  const result = await query(
    'DELETE FROM carts WHERE id = $1 AND user_id = $2 RETURNING id',
    [cartItemId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Cart item not found', 404);
  }

  return { success: true };
};

const clearCart = async (userId) => {
  await query('DELETE FROM carts WHERE user_id = $1 AND checked_out = FALSE', [userId]);
  return { success: true };
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};