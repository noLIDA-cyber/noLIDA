const { describe, it } = require('node:test');
const assert = require('node:assert');

const { healthCheck } = require('../controllers/healthController');

describe('Health Controller', () => {
  it('should return healthy status', async () => {
    const mockReq = {};
    const mockRes = {
      status: (code) => {
        assert.strictEqual(code, 200);
        return {
          json: (data) => {
            assert.strictEqual(data.success, true);
            assert.strictEqual(data.data.status, 'healthy');
            assert.ok(data.data.timestamp);
          },
        };
      },
    };

    await healthCheck(mockReq, mockRes);
  });
});