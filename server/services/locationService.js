const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const createLocation = async (userId, locationData) => {
  const { name, address_line1, address_line2, city, state_province, postal_code, country, latitude, longitude, phone, email, timezone, organization_id } = locationData;

  if (!name) {
    throw new AppError('Location name is required', 400);
  }

  const result = await query(
    `INSERT INTO locations (user_id, organization_id, name, address_line1, address_line2, city, state_province, postal_code, country, latitude, longitude, phone, email, timezone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
    [userId, organization_id || null, name, address_line1, address_line2, city, state_province, postal_code, country || 'Nigeria', latitude, longitude, phone, email, timezone || 'Africa/Lagos']
  );

  return result.rows[0];
};

const getUserLocations = async (userId) => {
  const result = await query(
    `SELECT * FROM locations WHERE user_id = $1 AND active = TRUE ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

const getLocation = async (locationId, userId) => {
  const result = await query(
    'SELECT * FROM locations WHERE id = $1 AND user_id = $2',
    [locationId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Location not found', 404);
  }

  return result.rows[0];
};

const updateLocation = async (locationId, userId, updates) => {
  const allowed = ['name', 'address_line1', 'address_line2', 'city', 'state_province', 'postal_code', 'country', 'latitude', 'longitude', 'phone', 'email', 'timezone', 'active'];
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
  values.push(locationId, userId);

  const result = await query(
    `UPDATE locations SET ${setClause.join(', ')} WHERE id = $${index} AND user_id = $${index + 1} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Location not found', 404);
  }

  return result.rows[0];
};

const deleteLocation = async (locationId, userId) => {
  const result = await query(
    'UPDATE locations SET active = FALSE, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id',
    [locationId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Location not found', 404);
  }

  return { message: 'Location deleted successfully' };
};

module.exports = {
  createLocation,
  getUserLocations,
  getLocation,
  updateLocation,
  deleteLocation,
};
