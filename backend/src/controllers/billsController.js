'use strict';
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');
const { getBillDetail } = require('../utils/billHelper');

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
      `SELECT COUNT(*) as total FROM bills b JOIN sessions s ON s.id = b.session_id JOIN customers c ON c.id = s.customer_id ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT b.id, b.bill_no, b.status, b.created_at, b.total, b.discount,
              c.name as customer_name, c.phone as customer_phone,
              st.name as station_name
       FROM bills b
       JOIN sessions s ON s.id = b.session_id
       JOIN customers c ON c.id = s.customer_id
       JOIN stations st ON st.id = s.station_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const result = rows.map(r => ({
      ...r,
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

module.exports = { listBills, getBill, payBill, voidBill };
