const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const listLocations = async (filters = {}) => {
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;
  const organizationId = filters.organizationId ? parseInt(filters.organizationId) : null;

  let sql = `
    SELECT l.*, org.name as organization_name
    FROM locations l
    LEFT JOIN organizations org ON org.id = l.organization_id
    WHERE 1=1
  `;
  const params = [];
  let index = 1;

  if (organizationId) {
    sql += ` AND l.organization_id = $${index}`;
    params.push(organizationId);
    index++;
  }

  sql += ` ORDER BY l.created_at DESC LIMIT $${index} OFFSET ${index + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  const countResult = await query(
    'SELECT COUNT(*) FROM locations WHERE 1=1' + (organizationId ? ' AND organization_id = $1' : ''),
    organizationId ? [organizationId] : []
  );
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const getLocation = async (locationId) => {
  const result = await query('SELECT l.*, org.name as organization_name FROM locations l LEFT JOIN organizations org ON org.id = l.organization_id WHERE l.id = $1', [locationId]);

  if (result.rows.length === 0) {
    throw new AppError('Location not found', 404);
  }

  return result.rows[0];
};

const createLocation = async (locationData) => {
  const { organizationId, name, addressLine1, addressLine2, city, stateProvince, postalCode, country, latitude, longitude, phone, email, timezone, active } = locationData;

  if (!name) {
    throw new AppError('name is required', 400);
  }

  const result = await query(
    `INSERT INTO locations 
     (organization_id, name, address_line1, address_line2, city, state_province, postal_code, country, latitude, longitude, phone, email, timezone, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
    [organizationId || null, name, addressLine1 || null, addressLine2 || null, city || null, stateProvince || null, postalCode || null, country || 'Nigeria', latitude || null, longitude || null, phone || null, email || null, timezone || 'Africa/Lagos', active !== undefined ? active : true]
  );

  return result.rows[0];
};

const updateLocation = async (locationId, updates) => {
  const allowed = ['organization_id', 'name', 'address_line1', 'address_line2', 'city', 'state_province', 'postal_code', 'country', 'latitude', 'longitude', 'phone', 'email', 'timezone', 'active'];
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
  values.push(locationId);

  const result = await query(
    `UPDATE locations SET ${setClause.join(', ')} WHERE id = $${paramIndex++} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Location not found', 404);
  }

  return result.rows[0];
};

const deleteLocation = async (locationId) => {
  const result = await query('DELETE FROM locations WHERE id = $1 RETURNING id', [locationId]);

  if (result.rows.length === 0) {
    throw new AppError('Location not found', 404);
  }

  return { message: 'Location deleted successfully' };
};

const listServiceAreas = async (providerId) => {
  const result = await query(
    `SELECT sa.*, l.name as location_name, l.city, l.state_province, l.country
     FROM service_areas sa
     JOIN locations l ON l.id = sa.location_id
     WHERE sa.provider_id = $1 AND sa.active = TRUE
     ORDER BY sa.created_at DESC`,
    [providerId]
  );

  return result.rows;
};

const createServiceArea = async (providerId, serviceAreaData) => {
  const { locationId, country, state, city, radius, radiusUnit, active } = serviceAreaData;

  if (!locationId && !country) {
    throw new AppError('locationId or country is required', 400);
  }

  const result = await query(
    `INSERT INTO service_areas (provider_id, location_id, country, state, city, radius, radius_unit, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [providerId, locationId || null, country || null, state || null, city || null, radius || null, radiusUnit || 'km', active !== undefined ? active : true]
  );

  return result.rows[0];
};

const deleteServiceArea = async (providerId, serviceAreaId) => {
  const result = await query(
    'DELETE FROM service_areas WHERE id = $1 AND provider_id = $2 RETURNING id',
    [serviceAreaId, providerId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Service area not found', 404);
  }

  return { message: 'Service area removed' };
};

module.exports = {
  listLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  listServiceAreas,
  createServiceArea,
  deleteServiceArea,
};
