const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { listCategories, getCategory, createCategory, updateCategory, deleteCategory, listCapabilities, getCapability, createCapability, updateCapability, deleteCapability } = require('../services/categoryService');
const { sendSuccess } = require('../utils/response');

router.get('/', async (req, res, next) => {
  try {
    const categories = await listCategories(req.query);
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const category = await getCategory(req.params.id);
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/capabilities', async (req, res, next) => {
  try {
    const capabilities = await listCapabilities(req.params.id);
    sendSuccess(res, capabilities);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const category = await createCategory(req.body);
    sendSuccess(res, category, 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const category = await updateCategory(req.params.id, req.body);
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const result = await deleteCategory(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.post('/capabilities', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const capability = await createCapability(req.body);
    sendSuccess(res, capability, 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/capabilities/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const capability = await updateCapability(req.params.id, req.body);
    sendSuccess(res, capability);
  } catch (error) {
    next(error);
  }
});

router.delete('/capabilities/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const result = await deleteCapability(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;