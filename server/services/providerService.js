const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const getProviderProfile = async (providerId) => {
  const userResult = await query(
    `SELECT u.id, u.email, u.status, u.email_verified, u.phone_verified, u.created_at,
            p.display_name, p.first_name, p.last_name, p.phone, p.avatar_url, p.bio, p.country, p.timezone
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [providerId]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('Provider not found', 404);
  }

  const organizationResult = await query(
    `SELECT om.role_id, r.name as role_name, r.slug as role_slug, o.name as org_name
     FROM organization_members om
     JOIN roles r ON r.id = om.role_id
     JOIN organizations o ON o.id = om.organization_id
     WHERE om.user_id = $1 AND om.status = $2
     LIMIT 1`,
    [providerId, 'active']
  );

  const serviceAreasResult = await query(
    `SELECT sa.*, l.name as location_name, l.city, l.country
     FROM service_areas sa
     LEFT JOIN locations l ON l.id = sa.location_id
     WHERE sa.provider_id = $1 AND sa.active = TRUE`,
    [providerId]
  );

  return {
    ...userResult.rows[0],
    organization: organizationResult.rows[0] || null,
    service_areas: serviceAreasResult.rows,
  };
};

const updateProviderProfile = async (providerId, updates) => {
  const userFields = ['display_name', 'first_name', 'last_name', 'phone', 'bio', 'country', 'timezone'];
  const userUpdates = {};
  const profileUpdates = {};

  for (const [key, value] of Object.entries(updates)) {
    if (userFields.includes(key)) {
      profileUpdates[key] = value;
    }
  }

  if (Object.keys(profileUpdates).length > 0) {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(profileUpdates)) {
      setClause.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }

    setClause.push(`updated_at = NOW()`);
    values.push(providerId);

    await query(
      `UPDATE profiles SET ${setClause.join(', ')} WHERE user_id = $${paramIndex++} RETURNING id`,
      values
    );
  }

  return getProviderProfile(providerId);
};

const getProviderStats = async (providerId) => {
  const bookingsResult = await query(
    `SELECT COUNT(*) as total, 
            COUNT(CASE WHEN transaction_status = 'confirmed' THEN 1 END) as confirmed,
            COUNT(CASE WHEN transaction_status = 'completed' THEN 1 END) as completed,
            SUM(total_amount) as revenue
     FROM transactions 
     WHERE provider_id = $1 AND transaction_type = 'appointment' AND created_at >= NOW() - INTERVAL '30 days'`,
    [providerId]
  );

  const listingsResult = await query(
    'SELECT COUNT(*) as total FROM listings WHERE provider_id = $1 AND status = $2',
    [providerId, 'active']
  );

  const reviewsResult = await query(
    `SELECT COUNT(*) as total, AVG(rating) as avg_rating 
     FROM reviews 
     WHERE provider_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
    [providerId]
  );

  return {
    bookings: bookingsResult.rows[0],
    listings: listingsResult.rows[0],
    reviews: reviewsResult.rows[0],
  };
};

module.exports = {
  getProviderProfile,
  updateProviderProfile,
  getProviderStats,
};
