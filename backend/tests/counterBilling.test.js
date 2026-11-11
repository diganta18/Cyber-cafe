'use strict';
require('dotenv').config({ quiet: true });
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

let adminToken;
let serviceId;

beforeAll(async () => {
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  adminToken = adminRes.body.data.token;

  const [services] = await pool.query('SELECT id FROM services WHERE is_active = 1 LIMIT 1');
  serviceId = services[0].id;
});

describe('POST /api/bills/counter (Counter POS Billing)', () => {
  test('fails if items array is empty', async () => {
    const res = await request(app)
      .post('/api/bills/counter')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [] });

    expect(res.status).toBe(400);
  });

  test('creates an unpaid counter bill for walk-in guest', async () => {
    const res = await request(app)
      .post('/api/bills/counter')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ service_id: serviceId, quantity: 2 }],
        discount: 5
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order_type).toBe('counter');
    expect(res.body.data.status).toBe('unpaid');
    expect(res.body.data.session).toBeNull();
    expect(res.body.data.services.length).toBe(1);
    expect(res.body.data.services[0].quantity).toBe(2);
  });

  test('creates and immediately pays a counter bill', async () => {
    const res = await request(app)
      .post('/api/bills/counter')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ service_id: serviceId, quantity: 1 }],
        payment_mode: 'cash'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('paid');
    expect(res.body.data.payments.length).toBe(1);
    expect(res.body.data.payments[0].mode).toBe('cash');
  });
});

