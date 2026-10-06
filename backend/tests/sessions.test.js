'use strict';
require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');

let adminToken, staffToken;
let customerId, stationId, sessionId;

// Helper: clean test-specific data without touching seed data's users/stations
async function cleanTestData() {
  await pool.query('DELETE FROM payments');
  await pool.query('DELETE FROM bills');
  await pool.query('DELETE FROM session_services');
  await pool.query('DELETE FROM sessions');
  // Reset station statuses
  await pool.query("UPDATE stations SET status = 'available'");
}

// Helper: get a seeded station id
async function getAvailableStationId() {
  const [rows] = await pool.query("SELECT id FROM stations WHERE status = 'available' LIMIT 1");
  return rows[0]?.id;
}

// Helper: get a seeded customer id
async function getCustomerId() {
  const [rows] = await pool.query('SELECT id FROM customers WHERE is_active = 1 LIMIT 1');
  return rows[0]?.id;
}

beforeAll(async () => {
  // Login as admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  adminToken = adminRes.body.data.token;

  // Login as staff
  const staffRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'staff1', password: 'staff123' });
  staffToken = staffRes.body.data.token;

  await cleanTestData();
  customerId = await getCustomerId();
  stationId = await getAvailableStationId();
});

afterAll(async () => {
  await cleanTestData();
  await pool.end();
});

describe('Auth Tests', () => {
  test('login with correct credentials returns token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
  });

  test('login with wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('staff token blocked from GET /api/users (admin route)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  test('no token returns 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

describe('Session Tests', () => {
  test('start session succeeds', async () => {
    stationId = await getAvailableStationId();
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customerId, station_id: stationId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('active');
    sessionId = res.body.data.id;
  });

  test('starting second session for same customer fails', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customerId, station_id: await getAvailableStationId() });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('starting session on occupied station fails', async () => {
    // Get another customer
    const [customers] = await pool.query('SELECT id FROM customers WHERE is_active = 1 AND id != ? LIMIT 1', [customerId]);
    const otherCustomer = customers[0]?.id;

    if (!otherCustomer) {
      // Skip if no other customer
      return;
    }

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: otherCustomer, station_id: stationId });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('add service to session decrements stock', async () => {
    // Get the Tea service (has stock)
    const [services] = await pool.query("SELECT id, stock_qty FROM services WHERE name = 'Tea' AND is_active = 1");
    const teaService = services[0];
    const originalStock = teaService.stock_qty;

    const res = await request(app)
      .post(`/api/sessions/${sessionId}/services`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ service_id: teaService.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const [updated] = await pool.query('SELECT stock_qty FROM services WHERE id = ?', [teaService.id]);
    expect(updated[0].stock_qty).toBe(originalStock - 2);
  });

  test('add service with insufficient stock fails', async () => {
    // Get the Tea service
    const [services] = await pool.query("SELECT id, stock_qty FROM services WHERE name = 'Tea' AND is_active = 1");
    const teaService = services[0];

    const res = await request(app)
      .post(`/api/sessions/${sessionId}/services`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ service_id: teaService.id, quantity: 9999 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/stock/i);
  });

  test('add untracked stock service succeeds without stock check', async () => {
    const [services] = await pool.query("SELECT id FROM services WHERE name = 'Print B/W (per page)' AND is_active = 1");
    const printService = services[0];

    const res = await request(app)
      .post(`/api/sessions/${sessionId}/services`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ service_id: printService.id, quantity: 100 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('end session creates bill and frees station', async () => {
    const res = await request(app)
      .post(`/api/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ discount: 0 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const bill = res.body.data;
    expect(bill.bill_no).toMatch(/^CC-\d{8}-\d{4}$/);
    expect(bill.status).toBe('unpaid');
    expect(bill.total).toBeGreaterThan(0);

    // Station should be available again
    const [stations] = await pool.query('SELECT status FROM stations WHERE id = ?', [stationId]);
    expect(stations[0].status).toBe('available');
  });

  test('ending an already-completed session fails', async () => {
    const res = await request(app)
      .post(`/api/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
