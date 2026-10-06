'use strict';
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');

async function listServices(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, price, stock_qty, low_stock_threshold, is_active FROM services WHERE is_active = 1 ORDER BY name ASC'
    );
    const result = rows.map((s) => ({
      ...s,
      low_stock: s.stock_qty !== null && s.stock_qty <= s.low_stock_threshold,
    }));
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

async function createService(req, res, next) {
  try {
    const { name, price, stock_qty, low_stock_threshold } = req.body;
    const [existing] = await pool.query('SELECT id FROM services WHERE name = ?', [name]);
    if (existing.length > 0) return fail(res, 'Service name already exists', 409);

    const [result] = await pool.query(
      'INSERT INTO services (name, price, stock_qty, low_stock_threshold) VALUES (?, ?, ?, ?)',
      [name, price, stock_qty !== undefined ? stock_qty : null, low_stock_threshold || 5]
    );
    const [service] = await pool.query('SELECT * FROM services WHERE id = ?', [result.insertId]);
    return ok(res, service[0], 201);
  } catch (err) {
    next(err);
  }
}

async function updateService(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM services WHERE id = ?', [id]);
    if (rows.length === 0) return fail(res, 'Service not found', 404);

    const { name, price, stock_qty, low_stock_threshold, is_active } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      const [dup] = await pool.query('SELECT id FROM services WHERE name = ? AND id != ?', [name, id]);
      if (dup.length > 0) return fail(res, 'Service name already exists', 409);
      updates.push('name = ?'); params.push(name);
    }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (stock_qty !== undefined) { updates.push('stock_qty = ?'); params.push(stock_qty); }
    if (low_stock_threshold !== undefined) { updates.push('low_stock_threshold = ?'); params.push(low_stock_threshold); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (updates.length === 0) return fail(res, 'No fields to update', 400);
    params.push(id);
    await pool.query(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query('SELECT * FROM services WHERE id = ?', [id]);
    return ok(res, updated[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteService(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM services WHERE id = ?', [id]);
    if (rows.length === 0) return fail(res, 'Service not found', 404);

    await pool.query('UPDATE services SET is_active = 0 WHERE id = ?', [id]);
    return ok(res, { message: 'Service deactivated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listServices, createService, updateService, deleteService };
