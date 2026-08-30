const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { createPayment } = require('../services/paymentService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.post('/initiate', authenticate, async (req, res, next) => {
  try {
    const { amount, currency, provider, transactionId, paymentMethod, metadata } = req.body;

    if (!amount || !currency) {
      throw new AppError('amount and currency are required', 400);
    }

    const txId = transactionId || null;

    const payment = await createPayment(
      txId,
      parseFloat(amount),
      currency,
      paymentMethod || 'card',
      metadata || {}
    );

    sendSuccess(res, {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      providerReference: payment.provider_reference,
      paymentLink: payment.metadata?.link || null,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/verify/:providerReference', authenticate, async (req, res, next) => {
  try {
    const { verifyPaymentStatus } = require('../services/paymentService');
    const payment = await verifyPaymentStatus(req.params.providerReference);
    sendSuccess(res, payment);
  } catch (error) {
    next(error);
  }
});

module.exports = router;