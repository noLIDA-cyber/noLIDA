const crypto = require('crypto');
const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const verifyFlutterwaveSignature = (payload, signature, secret) => {
  const expectedHash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return expectedHash === signature;
};

const handleFlutterwaveWebhook = async (payload, headers) => {
  const webhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new AppError('Webhook secret not configured', 500);
  }

  const signature = headers['verif-hash'] || headers['x-flutterwave-signature'];

  if (!signature) {
    throw new AppError('Missing webhook signature', 401);
  }

  if (!verifyFlutterwaveSignature(payload, signature, webhookSecret)) {
    throw new AppError('Invalid webhook signature', 401);
  }

  const { event, data } = payload;

  if (event === 'charge.completed' || event === 'payment.completed') {
    const payment = await query(
      'SELECT * FROM payments WHERE provider_reference = $1',
      [data.tx_ref || data.reference]
    );

    if (payment.rows.length > 0) {
      const paymentId = payment.rows[0].id;
      const transactionId = payment.rows[0].transaction_id;

      await query(
        `UPDATE payments SET status = $1, metadata = $2 WHERE id = $3`,
        ['succeeded', JSON.stringify(data), paymentId]
      );

      await query(
        `UPDATE transactions SET transaction_status = $1, updated_at = NOW() WHERE id = $2`,
        ['confirmed', transactionId]
      );

      await query(
        'INSERT INTO audit_logs (actor_id, action, target_type, target_id, changes) VALUES ($1, $2, $3, $4, $5)',
        [null, 'payment_confirmed_webhook', 'payment', paymentId, JSON.stringify({ event, reference: data.tx_ref || data.reference })]
      );
    }
  } else if (event === 'charge.failed' || event === 'payment.failed') {
    const payment = await query(
      'SELECT * FROM payments WHERE provider_reference = $1',
      [data.tx_ref || data.reference]
    );

    if (payment.rows.length > 0) {
      await query(
        `UPDATE payments SET status = $1, metadata = $2 WHERE id = $3`,
        ['failed', JSON.stringify(data), payment.rows[0].id]
      );
    }
  } else if (event === 'transfer.completed' || event === 'payout.completed') {
    const reference = data.reference || data.tx_ref;
    const payout = await query(
      'SELECT * FROM payouts WHERE provider_reference = $1',
      [reference]
    );

    if (payout.rows.length > 0) {
      await query(
        `UPDATE payouts SET status = $1, updated_at = NOW() WHERE id = $2`,
        ['succeeded', payout.rows[0].id]
      );
    }
  } else if (event === 'transfer.failed' || event === 'payout.failed') {
    const reference = data.reference || data.tx_ref;
    const payout = await query(
      'SELECT * FROM payouts WHERE provider_reference = $1',
      [reference]
    );

    if (payout.rows.length > 0) {
      await query(
        `UPDATE payouts SET status = $1, updated_at = NOW() WHERE id = $2`,
        ['failed', payout.rows[0].id]
      );
    }
  }

  return { received: true };
};

module.exports = {
  verifyFlutterwaveSignature,
  handleFlutterwaveWebhook,
};
