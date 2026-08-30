const { query } = require('../config/database');
const env = require('../config/env');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');
const { initiatePayment, verifyPayment, initiateTransfer, getTransfer, refundPayment } = require('../integrations/flutterwave');

const createPayment = async (transactionId, amount, currency, paymentMethod, metadata = {}) => {
  const flutterwaveResponse = await initiatePayment({
    tx_ref: `TXN-${Date.now()}-${transactionId}`,
    amount: parseFloat(amount),
    currency: currency || 'NGN',
    payment_method: paymentMethod || 'card',
    customer: metadata.customer || {},
    customizations: metadata.customizations || {},
    meta: { transaction_id: transactionId },
  });

  const result = await query(
    `INSERT INTO payments (transaction_id, payment_provider, payment_method, provider_reference, amount, currency, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [transactionId, 'flutterwave', paymentMethod, flutterwaveResponse.data.tx_ref, amount, currency || 'NGN', 'pending', JSON.stringify(flutterwaveResponse.data)]
  );

  return result.rows[0];
};

const verifyPaymentStatus = async (transactionId) => {
  const result = await query('SELECT * FROM payments WHERE transaction_id = $1 ORDER BY created_at DESC LIMIT 1', [transactionId]);
  if (result.rows.length === 0) {
    throw new AppError('Payment not found', 404);
  }

  const payment = result.rows[0];

  if (payment.status === 'succeeded') {
    return payment;
  }

  const verification = await verifyPayment(payment.provider_reference);
  const newStatus = verification.data.status === 'successful' ? 'succeeded' : verification.data.status === 'failed' ? 'failed' : 'processing';

  await query('UPDATE payments SET status = $1, metadata = $2 WHERE id = $3', [
    newStatus,
    JSON.stringify(verification.data),
    payment.id,
  ]);

  return { ...payment, status: newStatus };
};

const initiatePayout = async (providerId, amount, currency, metadata = {}) => {
  const flutterwaveResponse = await initiateTransfer({
    account_bank: metadata.bank_code,
    account_number: metadata.account_number,
    amount: parseFloat(amount),
    currency: currency || 'NGN',
    reference: `PAYOUT-${Date.now()}-${providerId}`,
    narration: 'noLIDA payout',
    meta: { provider_id: providerId },
  });

  const result = await query(
    `INSERT INTO payouts (provider_id, amount, currency, status, payment_provider, provider_reference, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [providerId, amount, currency || 'NGN', 'processing', 'flutterwave', flutterwaveResponse.data.reference, JSON.stringify(flutterwaveResponse.data)]
  );

  return result.rows[0];
};

const processRefund = async (paymentId, amount) => {
  const result = await query('SELECT * FROM payments WHERE id = $1', [paymentId]);
  if (result.rows.length === 0) {
    throw new AppError('Payment not found', 404);
  }

  const payment = result.rows[0];
  const flutterwaveResponse = await refundPayment(payment.provider_reference, amount);

  await query('UPDATE payments SET status = $1 WHERE id = $2', ['refunded', paymentId]);

  return flutterwaveResponse.data;
};

module.exports = {
  createPayment,
  verifyPaymentStatus,
  initiatePayout,
  processRefund,
};