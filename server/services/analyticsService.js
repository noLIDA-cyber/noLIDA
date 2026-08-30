const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const getOverview = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [usersResult, transactionsResult, bookingsResult, listingsResult, reviewsResult] = await Promise.all([
    query(`SELECT COUNT(*) as total, COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_users FROM users`, [since]),
    query(`SELECT COUNT(*) as total, SUM(total_amount) as revenue, SUM(platform_fee) as platform_fees FROM transactions WHERE created_at >= $1`, [since]),
    query(`SELECT COUNT(*) as total, COUNT(CASE WHEN transaction_status = 'completed' THEN 1 END) as completed, COUNT(CASE WHEN transaction_status = 'cancelled' THEN 1 END) as cancelled FROM transactions WHERE transaction_type = 'appointment' AND created_at >= $1`, [since]),
    query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'active' THEN 1 END) as active FROM listings`),
    query(`SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM reviews WHERE created_at >= $1`, [since]),
  ]);

  return {
    users: usersResult.rows[0],
    transactions: transactionsResult.rows[0],
    bookings: bookingsResult.rows[0],
    listings: listingsResult.rows[0],
    reviews: reviewsResult.rows[0],
  };
};

const getRevenueTrend = async (days = 30) => {
  const result = await query(
    `SELECT DATE(created_at) as date, 
            SUM(total_amount) as revenue,
            SUM(platform_fee) as platform_fees,
            COUNT(*) as transactions
     FROM transactions 
     WHERE created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    []
  );

  return result.rows.map(r => ({
    date: r.date,
    revenue: parseFloat(r.revenue || 0),
    platform_fees: parseFloat(r.platform_fees || 0),
    transactions: parseInt(r.transactions || 0),
  }));
};

const getUserGrowth = async (days = 30) => {
  const result = await query(
    `SELECT DATE(created_at) as date, COUNT(*) as new_users
     FROM users 
     WHERE created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    []
  );

  return result.rows.map(r => ({
    date: r.date,
    new_users: parseInt(r.new_users || 0),
  }));
};

const getBookingAnalytics = async (days = 30) => {
  const byStatus = await query(
    `SELECT transaction_status, COUNT(*) as count, SUM(total_amount) as revenue
     FROM transactions 
     WHERE transaction_type = 'appointment' AND created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY transaction_status`,
    []
  );

  const byCategory = await query(
    `SELECT c.name as category, COUNT(t.id) as bookings, SUM(t.total_amount) as revenue
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     JOIN categories c ON c.id = l.category_id
     WHERE t.transaction_type = 'appointment' AND t.created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY c.name
     ORDER BY bookings DESC
     LIMIT 10`,
    []
  );

  return {
    by_status: byStatus.rows.map(r => ({
      status: r.transaction_status,
      count: parseInt(r.count || 0),
      revenue: parseFloat(r.revenue || 0),
    })),
    by_category: byCategory.rows.map(r => ({
      category: r.category,
      bookings: parseInt(r.bookings || 0),
      revenue: parseFloat(r.revenue || 0),
    })),
  };
};

const getProviderAnalytics = async (days = 30) => {
  const topProviders = await query(
    `SELECT u.id, u.email, p.display_name, p.avatar_url,
            COUNT(t.id) as bookings, SUM(t.total_amount) as revenue, AVG(t.total_amount) as avg_booking
     FROM transactions t
     JOIN users u ON u.id = t.provider_id
     LEFT JOIN profiles p ON p.user_id = t.provider_id
     WHERE t.transaction_type = 'appointment' AND t.created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY u.id, p.display_name, p.avatar_url, u.email
     ORDER BY revenue DESC
     LIMIT 10`,
    []
  );

  const providerGrowth = await query(
    `SELECT DATE(t.created_at) as date, COUNT(DISTINCT t.provider_id) as active_providers
     FROM transactions t
     WHERE t.transaction_type = 'appointment' AND t.created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY DATE(t.created_at)
     ORDER BY date ASC`,
    []
  );

  return {
    top_providers: topProviders.rows.map(r => ({
      id: r.id,
      display_name: r.display_name || r.email,
      avatar_url: r.avatar_url,
      bookings: parseInt(r.bookings || 0),
      revenue: parseFloat(r.revenue || 0),
      avg_booking: parseFloat(r.avg_booking || 0),
    })),
    provider_growth: providerGrowth.rows.map(r => ({
      date: r.date,
      active_providers: parseInt(r.active_providers || 0),
    })),
  };
};

const getCategoryAnalytics = async () => {
  const result = await query(
    `SELECT c.name as category, c.slug,
            COUNT(l.id) as total_listings,
            COUNT(CASE WHEN l.status = 'active' THEN 1 END) as active_listings,
            COUNT(t.id) as total_bookings,
            SUM(t.total_amount) as total_revenue
     FROM categories c
     LEFT JOIN listings l ON l.category_id = c.id
     LEFT JOIN transactions t ON t.listing_id = l.id AND t.transaction_type = 'appointment'
     GROUP BY c.name, c.slug
     ORDER BY total_bookings DESC`,
    []
  );

  return result.rows.map(r => ({
    category: r.category,
    slug: r.slug,
    total_listings: parseInt(r.total_listings || 0),
    active_listings: parseInt(r.active_listings || 0),
    total_bookings: parseInt(r.total_bookings || 0),
    total_revenue: parseFloat(r.total_revenue || 0),
  }));
};

const getGeographicAnalytics = async () => {
  const result = await query(
    `SELECT l.country, l.state, l.city, COUNT(t.id) as bookings, SUM(t.total_amount) as revenue
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     WHERE t.transaction_type = 'appointment'
     GROUP BY l.country, l.state, l.city
     ORDER BY bookings DESC
     LIMIT 20`,
    []
  );

  return result.rows.map(r => ({
    country: r.country || 'Unknown',
    state: r.state,
    city: r.city,
    bookings: parseInt(r.bookings || 0),
    revenue: parseFloat(r.revenue || 0),
  }));
};

module.exports = {
  getOverview,
  getRevenueTrend,
  getUserGrowth,
  getBookingAnalytics,
  getProviderAnalytics,
  getCategoryAnalytics,
  getGeographicAnalytics,
};
