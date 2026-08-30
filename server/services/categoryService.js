const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const listCategories = async (filters = {}) => {
  const includeInactive = filters.includeInactive === 'true';

  let sql = `
    SELECT c.*, 
           COUNT(CASE WHEN l.status = 'active' THEN 1 END) as active_listings_count,
           COUNT(l.id) as total_listings_count
    FROM categories c
    LEFT JOIN listings l ON l.category_id = c.id
  `;

  if (!includeInactive) {
    sql += " WHERE c.active = TRUE";
  }

  sql += ' GROUP BY c.id, c.name, c.slug, c.description, c.icon, c.active, c.created_at, c.updated_at';
  sql += ' ORDER BY c.name ASC';

  const result = await query(sql);
  return result.rows;
};

const getCategory = async (categoryId) => {
  const result = await query('SELECT * FROM categories WHERE id = $1', [categoryId]);

  if (result.rows.length === 0) {
    throw new AppError('Category not found', 404);
  }

  const capabilities = await query('SELECT * FROM capabilities WHERE category_id = $1 ORDER BY name ASC', [categoryId]);

  return { ...result.rows[0], capabilities: capabilities.rows };
};

const createCategory = async (categoryData) => {
  const { name, slug, description, icon } = categoryData;

  if (!name || !slug) {
    throw new AppError('name and slug are required', 400);
  }

  const result = await query(
    `INSERT INTO categories (name, slug, description, icon, active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, slug, description || null, icon || null, true]
  );

  return result.rows[0];
};

const updateCategory = async (categoryId, updates) => {
  const allowed = ['name', 'slug', 'description', 'icon', 'active'];
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
  values.push(categoryId);

  const result = await query(
    `UPDATE categories SET ${setClause.join(', ')} WHERE id = $${paramIndex++} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Category not found', 404);
  }

  return result.rows[0];
};

const deleteCategory = async (categoryId) => {
  const listingsCheck = await query('SELECT COUNT(*) as count FROM listings WHERE category_id = $1', [categoryId]);
  const listingsCount = parseInt(listingsCheck.rows[0].count);

  if (listingsCount > 0) {
    throw new AppError(`Cannot delete category with ${listingsCount} active listings. Reassign or remove listings first.`, 400);
  }

  const result = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [categoryId]);

  if (result.rows.length === 0) {
    throw new AppError('Category not found', 404);
  }

  return { message: 'Category deleted successfully' };
};

const listCapabilities = async (categoryId) => {
  const result = await query('SELECT * FROM capabilities WHERE category_id = $1 ORDER BY name ASC', [categoryId]);
  return result.rows;
};

const getCapability = async (capabilityId) => {
  const result = await query('SELECT * FROM capabilities WHERE id = $1', [capabilityId]);

  if (result.rows.length === 0) {
    throw new AppError('Capability not found', 404);
  }

  return result.rows[0];
};

const createCapability = async (capabilityData) => {
  const { categoryId, name, description } = capabilityData;

  if (!categoryId || !name) {
    throw new AppError('categoryId and name are required', 400);
  }

  const result = await query(
    `INSERT INTO capabilities (category_id, name, description)
     VALUES ($1, $2, $3) RETURNING *`,
    [categoryId, name, description || null]
  );

  return result.rows[0];
};

const updateCapability = async (capabilityId, updates) => {
  const allowed = ['name', 'description'];
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
  values.push(capabilityId);

  const result = await query(
    `UPDATE capabilities SET ${setClause.join(', ')} WHERE id = $${paramIndex++} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Capability not found', 404);
  }

  return result.rows[0];
};

const deleteCapability = async (capabilityId) => {
  const result = await query('DELETE FROM capabilities WHERE id = $1 RETURNING id', [capabilityId]);

  if (result.rows.length === 0) {
    throw new AppError('Capability not found', 404);
  }

  return { message: 'Capability deleted successfully' };
};

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listCapabilities,
  getCapability,
  createCapability,
  updateCapability,
  deleteCapability,
};
