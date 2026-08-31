const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const listListings = async (filters = {}) => {
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;
  const categoryId = filters.categoryId ? parseInt(filters.categoryId) : null;
  const providerId = filters.providerId ? parseInt(filters.providerId) : null;
  const organizationId = filters.organizationId ? parseInt(filters.organizationId) : null;
  const status = filters.status || 'active';
  const search = filters.q?.trim();
  const includeUnapproved = filters.includeUnapproved === true;

  let sql = `
    SELECT l.id, l.title, l.description, l.status, l.verified, l.featured, l.created_at, l.approval_status,
           c.name as category_name,
           p.display_name as provider_name,
           org.name as business_name,
           lp.pricing_type, lp.base_price, lp.currency, lp.min_price, lp.max_price
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    LEFT JOIN profiles p ON p.user_id = l.provider_id
    LEFT JOIN organizations org ON org.id = l.organization_id
    LEFT JOIN listing_pricing lp ON lp.listing_id = l.id
    WHERE 1=1
  `;
  const params = [];
  let index = 1;

  if (status) {
    sql += ` AND l.status = $${index}`;
    params.push(status);
    index++;
  }

  if (!includeUnapproved && !providerId) {
    sql += ` AND l.approval_status = $${index}`;
    params.push('approved');
    index++;
  }

  if (categoryId) {
    sql += ` AND l.category_id = $${index}`;
    params.push(categoryId);
    index++;
  }

  if (providerId) {
    sql += ` AND l.provider_id = $${index}`;
    params.push(providerId);
    index++;
  }

  if (organizationId) {
    sql += ` AND l.organization_id = $${index}`;
    params.push(organizationId);
    index++;
  }

  if (search) {
    sql += ` AND (l.title ILIKE $${index} OR l.description ILIKE $${index})`;
    params.push(`%${search}%`);
    index++;
  }

  sql += ` ORDER BY l.created_at DESC LIMIT $${index} OFFSET ${index + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  let countSql = 'SELECT COUNT(*) FROM listings WHERE 1=1';
  const countParams = [];
  let countIndex = 1;

  if (status) {
    countSql += ` AND status = $${countIndex}`;
    countParams.push(status);
    countIndex++;
  }

  if (!includeUnapproved && !providerId) {
    countSql += ` AND approval_status = $${countIndex}`;
    countParams.push('approved');
    countIndex++;
  }

  if (categoryId) {
    countSql += ` AND category_id = $${countIndex}`;
    countParams.push(categoryId);
    countIndex++;
  }
  if (providerId) {
    countSql += ` AND provider_id = $${countIndex}`;
    countParams.push(providerId);
    countIndex++;
  }
  if (organizationId) {
    countSql += ` AND organization_id = $${countIndex}`;
    countParams.push(organizationId);
    countIndex++;
  }
  if (search) {
    countSql += ` AND (title ILIKE $${countIndex} OR description ILIKE $${countIndex})`;
    countParams.push(`%${search}%`);
  }

  const countResult = await query(countSql, countParams);
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const getListing = async (listingId, includeUnavailable = false, includeUnapproved = false) => {
  let statusFilter = "l.status = 'active'";
  if (includeUnavailable) {
    statusFilter = '1=1';
  }

  let approvalFilter = "l.approval_status = 'approved'";
  if (includeUnapproved) {
    approvalFilter = '1=1';
  }

  const result = await query(`
    SELECT l.*, c.name as category_name,
           p.display_name as provider_name,
           org.name as business_name,
           lp.pricing_type, lp.base_price, lp.currency, lp.min_price, lp.max_price, lp.deposit_required, lp.deposit_amount, lp.deposit_percentage
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    LEFT JOIN profiles p ON p.user_id = l.provider_id
    LEFT JOIN organizations org ON org.id = l.organization_id
    LEFT JOIN listing_pricing lp ON lp.listing_id = l.id
    WHERE l.id = $1 AND ${statusFilter} AND ${approvalFilter}
  `, [listingId]);

  if (result.rows.length === 0) {
    throw new AppError('Listing not found', 404);
  }

  const availability = await query('SELECT * FROM listing_availability WHERE listing_id = $1', [listingId]);

  return { ...result.rows[0], availability: availability.rows };
};

const createListing = async (listingData) => {
  const { providerId, organizationId, categoryId, capabilityId, title, description, status = 'active', metadata = {} } = listingData;

  if (!providerId || !categoryId || !title) {
    throw new AppError('providerId, categoryId, and title are required', 400);
  }

  const result = await query(
    `INSERT INTO listings (provider_id, organization_id, category_id, capability_id, title, description, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [providerId, organizationId || null, categoryId, capabilityId || null, title, description || null, status, metadata]
  );

  return result.rows[0];
};

const updateListing = async (listingId, updates, userId) => {
  const allowed = ['title', 'description', 'status', 'featured', 'metadata', 'category_id', 'capability_id', 'organization_id'];
  const setClause = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      setClause.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (setClause.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  setClause.push(`updated_at = NOW()`);
  values.push(listingId, userId);

  const result = await query(
    `UPDATE listings SET ${setClause.join(', ')} WHERE id = $${paramIndex++} AND provider_id = $${paramIndex++} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Listing not found or you do not have permission', 404);
  }

  return result.rows[0];
};

const deleteListing = async (listingId, userId) => {
  const result = await query(
    'DELETE FROM listings WHERE id = $1 AND provider_id = $2 RETURNING id',
    [listingId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Listing not found or you do not have permission', 404);
  }

  return { message: 'Listing deleted successfully' };
};

module.exports = {
  listListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
};
