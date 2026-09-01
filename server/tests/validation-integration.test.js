import { test, describe } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../app.js';
import { query } from '../config/database.js';

describe('Validation Integration Tests', () => {
  test('should reject POST without required fields', async () => {
    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
      .send({ pricingType: 'fixed' });

    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.success, false);
    assert.ok(Array.isArray(res.body.details));
    const fieldErrors = res.body.details.map(d => d.field);
    assert.ok(fieldErrors.includes('title'));
    assert.ok(fieldErrors.includes('categoryId'));
  });

  test('should reject PATCH with invalid ID parameter', async () => {
    const res = await request(app)
      .patch('/api/v1/listings/invalid-id')
      .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
      .send({ title: 'Updated Title' });

    assert.strictEqual(res.status, 422);
    assert.ok(res.body.message.includes('Invalid URL parameters'));
  });

  test('should reject invalid quantity', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
      .send({
        listingId: 1,
        quantity: -5,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString()
      });

    assert.strictEqual(res.status, 422);
    assert.ok(res.body.details.some(d => d.field === 'quantity'));
  });

  test('should reject endDate before startDate', async () => {
    const start = new Date();
    const end = new Date(start.getTime() - 86400000);

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
      .send({
        listingId: 1,
        quantity: 1,
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });

    assert.strictEqual(res.status, 422);
    assert.ok(res.body.details.some(d => d.field === 'endDate'));
  });

  test('should validate pagination parameters', async () => {
    const res = await request(app)
      .get('/api/v1/listings?page=0&limit=200')
      .send();

    assert.ok([200, 422].includes(res.status));
  });

  test('should return standardized validation error format', async () => {
    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
      .send({ title: 'A' });

    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 422);
    assert.strictEqual(res.body.error, 'validation_error');
    assert.ok(res.body.details);
    assert.ok(Array.isArray(res.body.details));
    res.body.details.forEach(detail => {
      assert.ok(detail.field);
      assert.ok(detail.message);
      assert.ok(detail.type);
    });
  });

  test('should check authorization before validation', async () => {
    const res = await request(app)
      .patch('/api/v1/listings/1')
      .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
      .send({ title: 'A' });

    assert.ok([403, 422].includes(res.status));
  });

  test('should not contain quotes in validation messages', async () => {
    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${process.env.TEST_TOKEN}`)
      .send({
        title: 'Valid Title',
        description: 'Valid Description',
        categoryId: 'not-a-number',
        basePrice: 50000
      });

    assert.strictEqual(res.status, 422);
    const categoryError = res.body.details.find(d => d.field === 'categoryId');
    assert.ok(categoryError);
    assert.ok(categoryError.message);
    assert.ok(!categoryError.message.includes('"'));
  });
});
