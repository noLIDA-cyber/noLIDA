const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createFee, getFees, getFee, updateFee, deleteFee } = require('../services/feeService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.use(authenticate);
router.use(authorize('super_admin', 'admin'));

router.get('/', async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.categoryId) filters.categoryId = parseInt(req.query.categoryId);
    if (req.query.providerId) filters.providerId = parseInt(req.query.providerId);
    if (req.query.country) filters.country = req.query.country;
    if (req.query.active !== undefined) filters.active = req.query.active === 'true';

    const fees = await getFees(filters);
    sendSuccess(res, fees);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const fee = await getFee(req.params.id);
    sendSuccess(res, fee);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const fee = await createFee(req.body);
    sendSuccess(res, fee, 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const fee = await updateFee(req.params.id, req.body);
    sendSuccess(res, fee);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteFee(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
