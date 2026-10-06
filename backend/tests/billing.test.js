'use strict';
const {
  round2,
  getBilledMinutes,
  getTimeCharge,
  getServiceCharge,
  computeTotal,
  calculateBill,
} = require('../src/services/billing');

describe('getBilledMinutes (rate ₹30/hr, block 15)', () => {
  const block = 15;

  test('1 min → 15 billed minutes', () => {
    expect(getBilledMinutes(1, block)).toBe(15);
  });

  test('15 min → 15 billed minutes', () => {
    expect(getBilledMinutes(15, block)).toBe(15);
  });

  test('16 min → 30 billed minutes', () => {
    expect(getBilledMinutes(16, block)).toBe(30);
  });

  test('60 min → 60 billed minutes', () => {
    expect(getBilledMinutes(60, block)).toBe(60);
  });

  test('61 min → 75 billed minutes', () => {
    expect(getBilledMinutes(61, block)).toBe(75);
  });

  test('90 min → 90 billed minutes', () => {
    expect(getBilledMinutes(90, block)).toBe(90);
  });
});

describe('getTimeCharge (rate ₹30/hr)', () => {
  const rate = 30;

  test('15 min → ₹7.50', () => {
    expect(getTimeCharge(15, rate)).toBe(7.5);
  });

  test('30 min → ₹15.00', () => {
    expect(getTimeCharge(30, rate)).toBe(15.0);
  });

  test('60 min → ₹30.00', () => {
    expect(getTimeCharge(60, rate)).toBe(30.0);
  });

  test('75 min → ₹37.50', () => {
    expect(getTimeCharge(75, rate)).toBe(37.5);
  });

  test('90 min → ₹45.00', () => {
    expect(getTimeCharge(90, rate)).toBe(45.0);
  });
});

describe('Full billing worked examples (₹30/hr, block 15)', () => {
  const rate = 30;
  const block = 15;

  function makeSession(elapsedMinutes) {
    const start = new Date('2026-01-01T10:00:00Z');
    const end = new Date(start.getTime() + elapsedMinutes * 60000);
    return { start, end };
  }

  test('1 min elapsed → 7.50 time charge', () => {
    const { start, end } = makeSession(1);
    const result = calculateBill(start, end, rate, [], 0, block);
    expect(result.billedMinutes).toBe(15);
    expect(result.timeCharge).toBe(7.5);
  });

  test('15 min elapsed → 7.50 time charge', () => {
    const { start, end } = makeSession(15);
    const result = calculateBill(start, end, rate, [], 0, block);
    expect(result.billedMinutes).toBe(15);
    expect(result.timeCharge).toBe(7.5);
  });

  test('16 min elapsed → 15.00 time charge', () => {
    const { start, end } = makeSession(16);
    const result = calculateBill(start, end, rate, [], 0, block);
    expect(result.billedMinutes).toBe(30);
    expect(result.timeCharge).toBe(15.0);
  });

  test('60 min elapsed → 30.00 time charge', () => {
    const { start, end } = makeSession(60);
    const result = calculateBill(start, end, rate, [], 0, block);
    expect(result.billedMinutes).toBe(60);
    expect(result.timeCharge).toBe(30.0);
  });

  test('61 min elapsed → 37.50 time charge', () => {
    const { start, end } = makeSession(61);
    const result = calculateBill(start, end, rate, [], 0, block);
    expect(result.billedMinutes).toBe(75);
    expect(result.timeCharge).toBe(37.5);
  });

  test('90 min elapsed → 45.00 time charge', () => {
    const { start, end } = makeSession(90);
    const result = calculateBill(start, end, rate, [], 0, block);
    expect(result.billedMinutes).toBe(90);
    expect(result.timeCharge).toBe(45.0);
  });
});

describe('getServiceCharge', () => {
  test('empty services → 0', () => {
    expect(getServiceCharge([])).toBe(0);
  });

  test('single service', () => {
    expect(getServiceCharge([{ quantity: 3, unit_price: 10 }])).toBe(30);
  });

  test('multiple services with decimal prices', () => {
    const services = [
      { quantity: 5, unit_price: 2 },      // 10
      { quantity: 2, unit_price: 10 },     // 20
      { quantity: 1, unit_price: 10.5 },   // 10.5
    ];
    expect(getServiceCharge(services)).toBe(40.5);
  });
});

describe('computeTotal discount clamping', () => {
  test('discount of 0 → no change', () => {
    const { discount, total } = computeTotal(30, 20, 0);
    expect(discount).toBe(0);
    expect(total).toBe(50);
  });

  test('discount within range', () => {
    const { discount, total } = computeTotal(30, 20, 10);
    expect(discount).toBe(10);
    expect(total).toBe(40);
  });

  test('discount exactly equals total → 0 total', () => {
    const { discount, total } = computeTotal(30, 20, 50);
    expect(discount).toBe(50);
    expect(total).toBe(0);
  });

  test('discount exceeds total → clamped to total', () => {
    const { discount, total } = computeTotal(30, 20, 100);
    expect(discount).toBe(50); // clamped
    expect(total).toBe(0);
  });

  test('negative discount → clamped to 0', () => {
    const { discount, total } = computeTotal(30, 20, -5);
    expect(discount).toBe(0);
    expect(total).toBe(50);
  });
});

describe('round2', () => {
  test('rounds to 2 decimal places', () => {
    expect(round2(7.5050000001)).toBe(7.51);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.0)).toBe(2);
    expect(round2(1.234567)).toBe(1.23);
  });
});
