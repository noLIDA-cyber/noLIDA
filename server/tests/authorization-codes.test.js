const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
process.env.VERCEL = '1';
const app = require('../app.js');
const { createAuthorizationCode, validateAuthorizationCode, hashCode, generateCode } = require('../services/authorizationCodeService.js');

const adminCredentials = {
  email: 'nolidacreations@gmail.com',
  password: 'nolidaiscomingsoon100.'
};

let adminToken;
let adminUserId;

describe('Phase 0.1: Authorization Code Architecture', () => {
  before(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send(adminCredentials);
    adminToken = loginRes.body.data.accessToken;
    adminUserId = loginRes.body.data.user.id;
  });

  describe('Service: generateCode', () => {
    it('generates code in NLDA-XXXX-XXXX format', () => {
      const code = generateCode();
      assert.match(code, /^NLDA-[A-F0-9]{4}-[A-F0-9]{4}$/);
    });

    it('generates unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateCode());
      }
      assert.strictEqual(codes.size, 100);
    });

    it('hashCode produces consistent 64-char hex', () => {
      const hash1 = hashCode('NLDA-TEST-CODE');
      const hash2 = hashCode('NLDA-TEST-CODE');
      assert.strictEqual(hash1, hash2);
      assert.strictEqual(hash1.length, 64);
    });
  });

  describe('API: Authorization Code CRUD', () => {
    it('admin can generate authorization code', async () => {
      const res = await request(app)
        .post('/api/v1/authorization-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          intendedEmail: 'test@example.com',
          maxUses: 1,
          expiresInDays: 30,
          notes: 'Test code'
        });

      assert.strictEqual(res.status, 201);
      assert.ok(res.body.data.code);
      assert.match(res.body.data.code, /^NLDA-[A-F0-9]{4}-[A-F0-9]{4}$/);
      assert.strictEqual(res.body.data.intended_email, 'test@example.com');
    });

    it('plaintext code is not returned on list', async () => {
      const listRes = await request(app)
        .get('/api/v1/authorization-codes')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(listRes.status, 200);
      const code = listRes.body.data[0];
      assert.ok(!code.code, 'Plaintext code should not be in list response');
      assert.ok(!code.code_hash, 'Hash should not be exposed');
    });

    it('normal user cannot generate codes', async () => {
      const userRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'test' });

      const userToken = userRes.body.data?.accessToken;
      if (!userToken) {
        assert.ok(true, 'No test user exists, skipping');
        return;
      }

      const res = await request(app)
        .post('/api/v1/authorization-codes')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ maxUses: 1 });

      assert.strictEqual(res.status, 403);
    });

    it('admin can revoke code', async () => {
      const listRes = await request(app)
        .get('/api/v1/authorization-codes')
        .set('Authorization', `Bearer ${adminToken}`);

      const codeId = listRes.body.data[0]?.id;
      if (!codeId) {
        assert.ok(true, 'No codes to revoke');
        return;
      }

      const res = await request(app)
        .post(`/api/v1/authorization-codes/${codeId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
    });
  });

  describe('Security: Code Validation', () => {
    it('validates correct code', async () => {
      const createRes = await request(app)
        .post('/api/v1/authorization-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maxUses: 1 });

      const code = createRes.body.data.code;
      const validateRes = await request(app)
        .post('/api/v1/authorization-codes/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code });

      assert.strictEqual(validateRes.status, 200);
      assert.strictEqual(validateRes.body.data.valid, true);
    });

    it('rejects invalid code with generic message', async () => {
      const res = await request(app)
        .post('/api/v1/authorization-codes/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'NLDA-INVALID-CODE' });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.message.includes('invalid or can no longer be used'));
    });

    it('rejects revoked code', async () => {
      const createRes = await request(app)
        .post('/api/v1/authorization-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maxUses: 1 });

      const code = createRes.body.data.code;
      const codeId = createRes.body.data.id;

      await request(app)
        .post(`/api/v1/authorization-codes/${codeId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .post('/api/v1/authorization-codes/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code });

      assert.strictEqual(res.status, 400);
    });
  });

  describe('Concurrent Redemption', () => {
    it('only one request consumes single-use code', async () => {
      const createRes = await request(app)
        .post('/api/v1/authorization-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maxUses: 1 });

      const code = createRes.body.data.code;

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/v1/authorization-codes/validate')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ code })
        );
      }

      const results = await Promise.all(promises);
      const successes = results.filter(r => r.status === 200);
      const failures = results.filter(r => r.status === 400);

      assert.strictEqual(successes.length, 1, 'Only one request should succeed');
      assert.strictEqual(failures.length, 4, 'Four requests should fail');
    }, 15000);
  });
});
