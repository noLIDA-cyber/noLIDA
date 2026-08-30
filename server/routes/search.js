const router = require('express').Router();
const { searchListings, getSearchSuggestions, searchCategories, naturalLanguageSearch } = require('../services/searchService');
const { AppError } = require('../middleware/error');

router.get('/', async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : null;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;

    const results = await searchListings(q, null, { categoryId, minPrice, maxPrice });
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

router.post('/natural', async (req, res, next) => {
  try {
    const { query: queryText } = req.body;

    if (!queryText) {
      throw new AppError('Query is required', 400);
    }

    const result = await naturalLanguageSearch(queryText);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/suggestions', async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const suggestions = await getSearchSuggestions(q);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    next(error);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const categories = await searchCategories(q);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
