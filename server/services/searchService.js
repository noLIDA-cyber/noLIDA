const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const searchListings = async (q, location, filters = {}) => {
  let sql = `
    SELECT l.id, l.title, l.description, l.status, l.verified, l.featured, l.created_at,
           c.name as category_name,
           c.slug as category_slug,
           p.display_name as provider_name,
           org.name as business_name,
           lp.pricing_type, lp.base_price, lp.currency, lp.min_price, lp.max_price,
           ts_rank(to_tsvector('english', l.title || ' ' || COALESCE(l.description, '')), plainto_tsquery('english', $1)) as rank
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    LEFT JOIN profiles p ON p.user_id = l.provider_id
    LEFT JOIN organizations org ON org.id = l.organization_id
    LEFT JOIN listing_pricing lp ON lp.listing_id = l.id
    WHERE l.status = 'active'
  `;
  const params = [q || ''];
  let index = 2;

  if (q) {
    sql += ` AND (l.title ILIKE $${index} OR l.description ILIKE $${index} OR to_tsvector('english', l.title || ' ' || COALESCE(l.description, '')) @@ plainto_tsquery('english', $1))`;
    params.push(`%${q}%`);
    index++;
  }

  if (filters.categoryId) {
    sql += ` AND l.category_id = $${index}`;
    params.push(filters.categoryId);
    index++;
  }

  if (filters.minPrice) {
    sql += ` AND lp.base_price >= $${index}`;
    params.push(filters.minPrice);
    index++;
  }

  if (filters.maxPrice) {
    sql += ` AND lp.base_price <= $${index}`;
    params.push(filters.maxPrice);
    index++;
  }

  if (filters.location) {
    sql += ` AND (l.location ILIKE $${index} OR org.name ILIKE $${index})`;
    params.push(`%${filters.location}%`);
    index++;
  }

  sql += ' ORDER BY rank DESC, l.created_at DESC LIMIT 50';

  const result = await query(sql, params);
  return result.rows;
};

const naturalLanguageSearch = async (queryText) => {
  const lowerQuery = queryText.toLowerCase();
  
  let categoryHint = null;
  let locationHint = null;
  let priceHint = { min: null, max: null };

  const categoryKeywords = {
    'plumb': 'Plumbing',
    'electric': 'Electrical',
    'clean': 'Cleaning',
    'paint': 'Painting',
    'carpet': 'Carpentry',
    'garden': 'Gardening',
    'move': 'Moving',
    'tutor': 'Tutoring',
    'design': 'Design',
    'photo': 'Photography',
    'lawyer': 'Legal',
    'account': 'Accounting',
    'web': 'Web Development',
    'app': 'App Development',
    'hair': 'Hair Salon',
    'nail': 'Nail Salon',
    'spa': 'Spa',
    'massage': 'Massage',
    'gym': 'Fitness',
    'yoga': 'Yoga',
    'restaurant': 'Restaurants',
    'cater': 'Catering',
    'bake': 'Bakery',
    'food': 'Food',
  };

  for (const [keyword, category] of Object.entries(categoryKeywords)) {
    if (lowerQuery.includes(keyword)) {
      categoryHint = category;
      break;
    }
  }

  const locationMatch = lowerQuery.match(/in\s+([a-zA-Z\s]+?)(?:\s+for|\s+under|\s+over|\s+with|\s*$)/);
  if (locationMatch) {
    locationHint = locationMatch[1].trim();
  }

  const priceMatch = lowerQuery.match(/under\s+([0-9,]+)/);
  if (priceMatch) {
    priceHint.max = parseFloat(priceMatch[1].replace(/,/g, ''));
  }

  const priceMatchOver = lowerQuery.match(/over\s+([0-9,]+)/);
  if (priceMatchOver) {
    priceHint.min = parseFloat(priceMatchOver[1].replace(/,/g, ''));
  }

  const categoryResult = categoryHint ? await query("SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1", [`%${categoryHint}%`]) : { rows: [] };

  const results = await searchListings(queryText, locationHint, {
    categoryId: categoryResult.rows[0]?.id || filters.categoryId,
    minPrice: priceHint.min || filters.minPrice,
    maxPrice: priceHint.max || filters.maxPrice,
  });

  return {
    query: queryText,
    parsed: {
      category: categoryHint,
      location: locationHint,
      priceRange: priceHint,
    },
    results,
  };
};

const getSearchSuggestions = async (q) => {
  const result = await query(
    `SELECT id, title FROM listings WHERE status = 'active' AND title ILIKE $1 LIMIT 10`,
    [`%${q}%`]
  );
  return result.rows;
};

const searchCategories = async (q) => {
  const result = await query(
    `SELECT id, name, slug, description, icon FROM categories WHERE active = TRUE AND name ILIKE $1 LIMIT 10`,
    [`%${q}%`]
  );
  return result.rows;
};

module.exports = { searchListings, naturalLanguageSearch, getSearchSuggestions, searchCategories };
