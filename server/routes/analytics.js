const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getOverview, getRevenueTrend, getUserGrowth, getBookingAnalytics, getProviderAnalytics, getCategoryAnalytics, getGeographicAnalytics } = require('../services/analyticsService');
const { sendSuccess } = require('../utils/response');

router.use(authenticate, authorize('super_admin', 'admin', 'analytics_admin'));

router.get('/overview', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await getOverview(days);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

router.get('/revenue', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await getRevenueTrend(days);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await getUserGrowth(days);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

router.get('/bookings', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await getBookingAnalytics(days);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

router.get('/providers', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await getProviderAnalytics(days);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const data = await getCategoryAnalytics();
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

router.get('/geographic', async (req, res, next) => {
  try {
    const data = await getGeographicAnalytics();
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
