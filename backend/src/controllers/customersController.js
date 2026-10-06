'use strict';
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');

async function listCustomers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;

    const whereClause = search
      ? 'WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ?)'
      : 'WHERE is_active = 1';
    const params = search ? [search, search] : [];

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM customers ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT id, name, phone, email, id_proof_type, id_proof_no, is_active, created_at
       FROM customers ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return ok(res, { items: rows, total, page, limit });
  } catch (err) {
    next(err);
  }
}

async function createCustomer(req, res, next) {
  try {
    const { name, phone, email, id_proof_type, id_proof_no } = req.body;
    const [existing] = await pool.query('SELECT id FROM customers WHERE phone = ?', [phone]);
    if (existing.length > 0) return fail(res, 'Phone number already registered', 409);

    const [result] = await pool.query(
      'INSERT INTO customers (name, phone, email, id_proof_type, id_proof_no) VALUES (?, ?, ?, ?, ?)',
      [name, phone, email || null, id_proof_type || null, id_proof_no || null]
    );
    const [customer] = await pool.query(
      'SELECT id, name, phone, email, id_proof_type, id_proof_no, is_active, created_at FROM customers WHERE id = ?',
      [result.insertId]
    );
    return ok(res, customer[0], 201);
  } catch (err) {
    next(err);
  }
}

async function getCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT id, name, phone, email, id_proof_type, id_proof_no, is_active, created_at FROM customers WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return fail(res, 'Customer not found', 404);

    // Get last 20 sessions with bill info
    const [sessions] = await pool.query(
      `SELECT s.id, s.start_time, s.end_time, s.status,
              st.name as station_name,
              b.total as bill_total, b.status as bill_status, b.bill_no
       FROM sessions s
       JOIN stations st ON st.id = s.station_id
       LEFT JOIN bills b ON b.session_id = s.id
       WHERE s.customer_id = ?
       ORDER BY s.start_time DESC
       LIMIT 20`,
      [id]
    );

    return ok(res, { ...rows[0], sessions });
  } catch (err) {
    next(err);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM customers WHERE id = ?', [id]);
    if (rows.length === 0) return fail(res, 'Customer not found', 404);

    const { name, phone, email, id_proof_type, id_proof_no } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (phone !== undefined) {
      const [existing] = await pool.query('SELECT id FROM customers WHERE phone = ? AND id != ?', [phone, id]);
      if (existing.length > 0) return fail(res, 'Phone number already in use', 409);
      updates.push('phone = ?'); params.push(phone);
    }
    if (email !== undefined) { updates.push('email = ?'); params.push(email || null); }
    if (id_proof_type !== undefined) { updates.push('id_proof_type = ?'); params.push(id_proof_type || null); }
    if (id_proof_no !== undefined) { updates.push('id_proof_no = ?'); params.push(id_proof_no || null); }

    if (updates.length === 0) return fail(res, 'No fields to update', 400);
    params.push(id);
    await pool.query(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query(
      'SELECT id, name, phone, email, id_proof_type, id_proof_no, is_active, created_at FROM customers WHERE id = ?',
      [id]
    );
    return ok(res, updated[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM customers WHERE id = ?', [id]);
    if (rows.length === 0) return fail(res, 'Customer not found', 404);

    // Check for active session
    const [activeSessions] = await pool.query(
      "SELECT id FROM sessions WHERE customer_id = ? AND status = 'active'",
      [id]
    );
    if (activeSessions.length > 0) {
      return fail(res, 'Customer has an active session', 400);
    }

    await pool.query('UPDATE customers SET is_active = 0 WHERE id = ?', [id]);
    return ok(res, { message: 'Customer deactivated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCustomers, createCustomer, getCustomer, updateCustomer, deleteCustomer };
