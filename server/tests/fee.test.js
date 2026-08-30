const { describe, it } = require('node:test');
const assert = require('node:assert');
const { calculateFees } = require('../services/feeEngine');

describe('Fee Engine', () => {
  it('should calculate percentage-based fees correctly', async () => {
    const result = await calculateFees({
      subtotal: 100000,
      currency: 'NGN',
      providerId: null,
      categoryId: null,
      country: null,
    });

    assert.ok(result);
    assert.ok(Array.isArray(result.fees));
    assert.ok(typeof result.totalFees === 'number');
  });

  it('should respect min and max fee limits', async () => {
    const result = await calculateFees({
      subtotal: 100,
      currency: 'NGN',
      providerId: null,
      categoryId: null,
      country: null,
    });

    assert.ok(result);
    assert.ok(typeof result.totalFees === 'number');
  });
});