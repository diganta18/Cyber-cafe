'use strict';
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');
const { getBillDetail } = require('../utils/billHelper');

function toUtcIso(dt) {
  if (!dt) return dt;
  if (dt instanceof Date) return dt.toISOString();
  const s = String(dt).trim();
  if (/Z$|[+-]\d{2}:\d{2}$/.test(s)) return s;
  return s.replace(' ', 'T') + 'Z';
}

async function listBills(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (req.query.status) {
      conditions.push('b.status = ?');
      params.push(req.query.status);
    }
    if (req.query.from) {
      conditions.push('b.created_at >= ?');
      params.push(req.query.from);
    }
    if (req.query.to) {
      conditions.push('b.created_at <= ?');
      params.push(req.query.to + ' 23:59:59');
    }
    if (req.query.search) {
      conditions.push('(b.bill_no LIKE ? OR c.name LIKE ?)');
      params.push(`%${req.query.search}%`, `%${req.query.search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM bills b
       LEFT JOIN sessions s ON s.id = b.session_id
       LEFT JOIN customers c ON c.id = COALESCE(s.customer_id, b.customer_id)
       ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT b.id, b.bill_no, b.order_type, b.status, b.created_at, b.total, b.discount,
              COALESCE(c.name, 'Walk-in Guest') as customer_name, c.phone as customer_phone,
              COALESCE(st.name, 'Counter') as station_name
       FROM bills b
       LEFT JOIN sessions s ON s.id = b.session_id
       LEFT JOIN customers c ON c.id = COALESCE(s.customer_id, b.customer_id)
       LEFT JOIN stations st ON st.id = s.station_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const result = rows.map(r => ({
      ...r,
      created_at: toUtcIso(r.created_at),
      total: parseFloat(r.total),
      discount: parseFloat(r.discount)
    }));

    return ok(res, { items: result, total, page, limit });
  } catch (err) {
    next(err);
  }
}

async function getBill(req, res, next) {
  try {
    const detail = await getBillDetail(pool, req.params.id);
    if (!detail) return fail(res, 'Bill not found', 404);
    return ok(res, detail);
  } catch (err) {
    next(err);
  }
}

async function createCounterBill(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { customer_id, items, discount = 0, payment_mode } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await conn.rollback();
      return fail(res, 'At least one item is required', 400);
    }

    // Determine customer ID (or default to walk-in guest)
    let finalCustomerId = customer_id || null;
    if (!finalCustomerId) {
      const [walkin] = await conn.query("SELECT id FROM customers WHERE phone = '9999999999' OR name = 'Walk-in Guest' LIMIT 1");
      if (walkin.length > 0) {
        finalCustomerId = walkin[0].id;
      }
    }

    // Validate services, calculate line totals, verify and lock stock
    let serviceCharge = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity) || 1;
      if (qty <= 0) {
        await conn.rollback();
        return fail(res, 'Item quantity must be greater than 0', 400);
      }

      const [services] = await conn.query(
        'SELECT id, name, price, stock_qty FROM services WHERE id = ? FOR UPDATE',
        [item.service_id]
      );
      if (services.length === 0) {
        await conn.rollback();
        return fail(res, `Service item #${item.service_id} not found`, 404);
      }

      const s = services[0];
      if (s.stock_qty !== null && s.stock_qty < qty) {
        await conn.rollback();
        return fail(res, `Insufficient stock for ${s.name} (Available: ${s.stock_qty})`, 400);
      }

      const unitPrice = parseFloat(s.price);
      serviceCharge += qty * unitPrice;
      validatedItems.push({
        service_id: s.id,
        quantity: qty,
        unit_price: unitPrice,
        stock_qty: s.stock_qty
      });
    }

    const disc = Math.max(0, parseFloat(discount) || 0);
    const total = Math.max(0, serviceCharge - disc);

    // Generate unique collision-free bill number: BILL-YYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    let billNo;
    for (let attempt = 0; attempt < 5; attempt++) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      const candidate = `BILL-${dateStr}-${rand}`;
      const [existing] = await conn.query('SELECT id FROM bills WHERE bill_no = ?', [candidate]);
      if (existing.length === 0) {
        billNo = candidate;
        break;
      }
    }
    if (!billNo) {
      billNo = `BILL-${dateStr}-${Date.now().toString().slice(-4)}`;
    }

    const [billResult] = await conn.query(
      `INSERT INTO bills (bill_no, order_type, session_id, customer_id, time_charge, service_charge, discount, total, status)
       VALUES (?, 'counter', NULL, ?, 0.00, ?, ?, ?, ?)`,
      [billNo, finalCustomerId, serviceCharge, disc, total, payment_mode ? 'paid' : 'unpaid']
    );
    const billId = billResult.insertId;

    // Insert bill_items and decrement stock
    for (const vItem of validatedItems) {
      await conn.query(
        'INSERT INTO bill_items (bill_id, service_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [billId, vItem.service_id, vItem.quantity, vItem.unit_price]
      );

      if (vItem.stock_qty !== null) {
        await conn.query(
          'UPDATE services SET stock_qty = stock_qty - ? WHERE id = ?',
          [vItem.quantity, vItem.service_id]
        );
      }
    }

    // If payment mode was provided, record payment immediately
    if (payment_mode && ['cash', 'upi', 'card'].includes(payment_mode)) {
      await conn.query(
        'INSERT INTO payments (bill_id, mode, amount) VALUES (?, ?, ?)',
        [billId, payment_mode, total]
      );
    }

    await conn.commit();

    const detail = await getBillDetail(pool, billId);
    return ok(res, detail, 201);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function payBill(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { mode } = req.body;

    const [bills] = await conn.query(
      'SELECT id, status, total FROM bills WHERE id = ? FOR UPDATE',
      [id]
    );
    if (bills.length === 0) {
      await conn.rollback();
      return fail(res, 'Bill not found', 404);
    }
    if (bills[0].status !== 'unpaid') {
      await conn.rollback();
      return fail(res, 'Bill is not unpaid', 400);
    }

    await conn.query(
      'INSERT INTO payments (bill_id, mode, amount) VALUES (?, ?, ?)',
      [id, mode, bills[0].total]
    );
    await conn.query("UPDATE bills SET status = 'paid' WHERE id = ?", [id]);
    await conn.commit();

    const detail = await getBillDetail(pool, id);
    return ok(res, detail);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function voidBill(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    const [bills] = await conn.query(
      'SELECT id, status FROM bills WHERE id = ? FOR UPDATE',
      [id]
    );
    if (bills.length === 0) {
      await conn.rollback();
      return fail(res, 'Bill not found', 404);
    }
    if (bills[0].status === 'void') {
      await conn.rollback();
      return fail(res, 'Bill is already void', 400);
    }

    await conn.query("UPDATE bills SET status = 'void' WHERE id = ?", [id]);
    await conn.commit();

    const detail = await getBillDetail(pool, id);
    return ok(res, detail);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = { listBills, getBill, createCounterBill, payBill, voidBill };
