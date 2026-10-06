'use strict';
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { ok, fail } = require('../utils/response');

async function listUsers(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, username, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, username, password, role } = req.body;
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return fail(res, 'Username already exists', 409);
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, username, password_hash, role || 'staff']
    );
    const [user] = await pool.query(
      'SELECT id, name, username, role, is_active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    return ok(res, user[0], 201);
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, role, is_active, password } = req.body;

    // Admin cannot disable or demote themselves
    if (parseInt(id) === req.user.id) {
      if (is_active === 0 || is_active === false) {
        return fail(res, 'You cannot disable your own account', 400);
      }
      if (role && role !== req.user.role) {
        return fail(res, 'You cannot change your own role', 400);
      }
    }

    const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return fail(res, 'User not found', 404);

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    if (updates.length === 0) return fail(res, 'No fields to update', 400);
    params.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query(
      'SELECT id, name, username, role, is_active, created_at FROM users WHERE id = ?',
      [id]
    );
    return ok(res, updated[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return fail(res, 'You cannot delete your own account', 400);
    }
    const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return fail(res, 'User not found', 404);
    await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
    return ok(res, { message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser };
