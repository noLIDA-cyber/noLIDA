const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { listPaymentMethods, getPaymentMethod, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, setDefaultPaymentMethod } = require('../services/paymentMethodService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const methods = await listPaymentMethods(req.user.id);
    sendSuccess(res, methods);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const method = await getPaymentMethod(req.user.id, req.params.id);
    sendSuccess(res, method);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const method = await createPaymentMethod(req.user.id, req.body);
    sendSuccess(res, method, 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const method = await updatePaymentMethod(req.user.id, req.params.id, req.body);
    sendSuccess(res, method);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/default', authenticate, async (req, res, next) => {
  try {
    const method = await setDefaultPaymentMethod(req.user.id, req.params.id);
    sendSuccess(res, method);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await deletePaymentMethod(req.user.id, req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
