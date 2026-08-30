const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createPayment, verifyPaymentStatus } = require('../services/paymentService');

describe('Payment Service', () => {
  it('should throw if transaction not found', async () => {
    try {
      await verifyPaymentStatus(99999);
      assert.fail('Should have thrown');
    } catch (error) {
      assert.strictEqual(error.statusCode, 404);
    }
  });
});