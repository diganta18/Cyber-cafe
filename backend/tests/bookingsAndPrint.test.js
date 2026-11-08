'use strict';
require('dotenv').config({ quiet: true });
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

let adminToken;
let stationId;
let customerId;

beforeAll(async () => {
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  adminToken = adminRes.body.data.token;

  const [stations] = await pool.query("SELECT id FROM stations WHERE status = 'available' LIMIT 1");
  stationId = stations[0].id;

  const [customers] = await pool.query('SELECT id FROM customers WHERE is_active = 1 LIMIT 1');
  customerId = customers[0].id;
});

describe('Slot Bookings & Collision Engine', () => {
  let createdBookingId;
  let bookingCode;
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const startTime = `${tomorrow} 14:00:00`;

  test('GET /api/bookings/available-slots returns time slots', async () => {
    const res = await request(app)
      .get(`/api/bookings/available-slots?date=${tomorrow}&station_id=${stationId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].slots.length).toBeGreaterThan(0);
  });

  test('POST /api/bookings creates a new pending booking from portal', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        station_id: stationId,
        customer_id: customerId,
        start_time: startTime,
        duration_mins: 60,
        notes: 'Testing slot reservation',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.booking_code).toMatch(/^BK-\d{4}$/);

    createdBookingId = res.body.data.id;
    bookingCode = res.body.data.booking_code;
  });

  test('PATCH /api/bookings/:id/status approves/confirms the booking by staff', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${createdBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('confirmed');
  });

  test('POST /api/bookings prevents overlapping slot collision (409 Conflict)', async () => {
    // Attempt to book the same station at the same time
    const res = await request(app)
      .post('/api/bookings')
      .send({
        station_id: stationId,
        customer_name: 'Conflict User',
        customer_phone: '8888888888',
        start_time: `${tomorrow} 14:30:00`, // Overlaps 14:00 - 15:00
        duration_mins: 60,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/bookings/:id/cancel cancels the booking', async () => {
    const res = await request(app)
      .post(`/api/bookings/${createdBookingId}/cancel`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Remote Print Orders', () => {
  test('POST /api/print-orders requires a file', async () => {
    const res = await request(app)
      .post('/api/print-orders')
      .field('customer_name', 'Rahul Sharma')
      .field('customer_phone', '9876543210');

    expect(res.status).toBe(400);
  });

  test('POST /api/print-orders uploads file and creates order', async () => {
    const res = await request(app)
      .post('/api/print-orders')
      .field('customer_name', 'Test Student')
      .field('customer_phone', '9876500000')
      .field('color_mode', 'bw')
      .field('copies', '3')
      .field('page_count', '5')
      .attach('file', Buffer.from('Dummy printout document content'), 'assignment.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order_no).toMatch(/^PR-\d{4}$/);
    expect(res.body.data.estimated_cost).toBeGreaterThan(0);

    const orderNo = res.body.data.order_no;

    // Track order publicly
    const trackRes = await request(app)
      .get(`/api/print-orders/track?tracking_query=${orderNo}`);

    expect(trackRes.status).toBe(200);
    expect(trackRes.body.data.length).toBe(1);
    expect(trackRes.body.data[0].order_no).toBe(orderNo);
  });
});

