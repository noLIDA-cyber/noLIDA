const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const listCustomers = async (providerId, filters = {}) => {
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;
  const search = filters.search?.trim();

  let whereSql = 't.provider_id = $1';
  const params = [providerId];
  let paramIndex = 2;

  if (search) {
    whereSql += ` AND (p.display_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR p.phone ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const countResult = await query(
    `SELECT COUNT(DISTINCT t.customer_id) as total
     FROM transactions t
     JOIN users u ON u.id = t.customer_id
     LEFT JOIN profiles p ON p.user_id = t.customer_id
     WHERE ${whereSql}`,
    params
  );

  const result = await query(
    `SELECT 
      u.id, u.email, u.status, u.last_login_at, u.created_at,
      p.display_name, p.avatar_url, p.phone, p.country, p.bio,
      COUNT(t.id) as total_bookings,
      SUM(t.total_amount) as total_spend,
      MAX(t.created_at) as last_activity,
      MIN(t.created_at) as first_booking
     FROM transactions t
     JOIN users u ON u.id = t.customer_id
     LEFT JOIN profiles p ON p.user_id = t.customer_id
     WHERE ${whereSql}
     GROUP BY u.id, p.display_name, p.avatar_url, p.phone, p.country, u.email, u.status, u.last_login_at, u.created_at, p.bio
     ORDER BY last_activity DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  const total = parseInt(countResult.rows[0].total);

  return {
    data: result.rows.map(c => ({
      ...c,
      total_spend: parseFloat(c.total_spend || 0),
      total_bookings: parseInt(c.total_bookings || 0),
      last_activity: c.last_activity ? new Date(c.last_activity).toISOString() : null,
      first_booking: c.first_booking ? new Date(c.first_booking).toISOString() : null,
    })),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const getCustomerDetail = async (providerId, customerId) => {
  const customerResult = await query(
    `SELECT 
      u.id, u.email, u.status, u.last_login_at, u.created_at,
      p.display_name, p.avatar_url, p.phone, p.country, p.bio, p.timezone, p.currency
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [customerId]
  );

  if (customerResult.rows.length === 0) {
    throw new AppError('Customer not found', 404);
  }

  const customer = customerResult.rows[0];

  const statsResult = await query(
    `SELECT 
      COUNT(*) as total_bookings,
      SUM(total_amount) as total_spend,
      MAX(created_at) as last_activity,
      MIN(created_at) as first_booking
     FROM transactions 
     WHERE provider_id = $1 AND customer_id = $2 AND transaction_type IN ('appointment', 'order')`,
    [providerId, customerId]
  );

  const stats = statsResult.rows[0];

  const bookingsResult = await query(
    `SELECT t.*, l.title as listing_title, c.name as category_name
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     JOIN categories c ON c.id = l.category_id
     WHERE t.provider_id = $1 AND t.customer_id = $2 AND t.transaction_type = 'appointment'
     ORDER BY t.booking_date DESC, t.start_time DESC
     LIMIT 10`,
    [providerId, customerId]
  );

  const ordersResult = await query(
    `SELECT t.*, l.title as listing_title, c.name as category_name
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     JOIN categories c ON c.id = l.category_id
     WHERE t.provider_id = $1 AND t.customer_id = $2 AND t.transaction_type = 'order'
     ORDER BY t.created_at DESC
     LIMIT 10`,
    [providerId, customerId]
  );

  const reviewsResult = await query(
    `SELECT r.*, l.title as listing_title
     FROM reviews r
     JOIN transactions t ON t.id = r.transaction_id
     JOIN listings l ON l.id = t.listing_id
     WHERE r.provider_id = $1 AND r.customer_id = $2
     ORDER BY r.created_at DESC
     LIMIT 10`,
    [providerId, customerId]
  );

  return {
    customer: {
      ...customer,
      total_spend: parseFloat(stats.total_spend || 0),
      total_bookings: parseInt(stats.total_bookings || 0),
      last_activity: stats.last_activity ? new Date(stats.last_activity).toISOString() : null,
      first_booking: stats.first_booking ? new Date(stats.first_booking).toISOString() : null,
    },
    bookings: bookingsResult.rows,
    orders: ordersResult.rows,
    reviews: reviewsResult.rows,
  };
};

const getCustomerActivity = async (providerId, customerId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT t.*, l.title as listing_title, c.name as category_name
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     JOIN categories c ON c.id = l.category_id
     WHERE t.provider_id = $1 AND t.customer_id = $2 AND t.transaction_type IN ('appointment', 'order')
     ORDER BY t.created_at DESC
     LIMIT $3 OFFSET $4`,
    [providerId, customerId, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM transactions 
     WHERE provider_id = $1 AND customer_id = $2 AND transaction_type IN ('appointment', 'order')`,
    [providerId, customerId]
  );

  return {
    data: result.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      pages: Math.ceil(countResult.rows[0].count / limit),
    },
  };
};

const getProviderStats = async (providerId) => {
  const statsResult = await query(
    `SELECT 
      COUNT(DISTINCT customer_id) as total_customers,
      COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN customer_id END) as new_customers_30d,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as avg_booking_value,
      COUNT(*) as total_transactions
     FROM transactions 
     WHERE provider_id = $1 AND transaction_type IN ('appointment', 'order')`,
    [providerId]
  );

  const repeatResult = await query(
    `SELECT COUNT(DISTINCT customer_id) as repeat_customers
     FROM transactions 
     WHERE provider_id = $1 AND transaction_type IN ('appointment', 'order')
     GROUP BY customer_id
     HAVING COUNT(*) > 1`,
    [providerId]
  );

  const topCustomersResult = await query(
    `SELECT 
      u.id, u.email,
      p.display_name, p.avatar_url,
      COUNT(t.id) as booking_count,
      SUM(t.total_amount) as total_spend
     FROM transactions t
     JOIN users u ON u.id = t.customer_id
     LEFT JOIN profiles p ON p.user_id = t.customer_id
     WHERE t.provider_id = $1 AND t.transaction_type IN ('appointment', 'order')
     GROUP BY u.id, p.display_name, p.avatar_url, u.email
     ORDER BY total_spend DESC
     LIMIT 5`,
    [providerId]
  );

  return {
    ...statsResult.rows[0],
    repeat_customers: repeatResult.rows.length,
    total_customers: parseInt(statsResult.rows[0].total_customers || 0),
    new_customers_30d: parseInt(statsResult.rows[0].new_customers_30d || 0),
    top_customers: topCustomersResult.rows,
  };
};

module.exports = {
  listCustomers,
  getCustomerDetail,
  getCustomerActivity,
  getProviderStats,
};
