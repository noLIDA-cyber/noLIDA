const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../services/cartService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const cart = await getCart(req.user.id);
    sendSuccess(res, cart);
  } catch (error) {
    next(error);
  }
});

router.post('/items', authenticate, async (req, res, next) => {
  try {
    const item = await addToCart(req.user.id, req.body);
    sendSuccess(res, item, 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/items/:id', authenticate, async (req, res, next) => {
  try {
    const item = await updateCartItem(req.params.id, req.user.id, req.body);
    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
});

router.delete('/items/:id', authenticate, async (req, res, next) => {
  try {
    const result = await removeFromCart(req.params.id, req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.delete('/', authenticate, async (req, res, next) => {
  try {
    const result = await clearCart(req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;