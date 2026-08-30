const { describe, it } = require('node:test');
const assert = require('node:assert');
const { hashPassword, comparePassword, registerUser } = require('../services/authService');

describe('Auth Service', () => {
  it('should hash and compare password', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    assert.ok(hash);
    assert.notStrictEqual(hash, password);
    assert.ok(await comparePassword(password, hash));
    assert.ok(!(await comparePassword('wrong', hash)));
  });

  it('should reject duplicate email on registration', async () => {
    try {
      await registerUser({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });
      await registerUser({
        email: 'test@example.com',
        password: 'AnotherPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });
      assert.fail('Should have thrown');
    } catch (error) {
      assert.strictEqual(error.statusCode, 409);
    }
  });
});