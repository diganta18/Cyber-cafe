'use strict';
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ok, fail } = require('../utils/response');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query(
      'SELECT id, name, username, password_hash, role, is_active FROM users WHERE username = ?',
      [username]
    );
    if (rows.length === 0) {
      return fail(res, 'Invalid credentials', 401);
    }
    const user = rows[0];
    if (!user.is_active) {
      return fail(res, 'Account is disabled', 401);
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return fail(res, 'Invalid credentials', 401);
    }
    const payload = { id: user.id, username: user.username, role: user.role, name: user.name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });
    return ok(res, { token, user: payload });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, username, role FROM users WHERE id = ? AND is_active = 1',
      [req.user.id]
    );
    if (rows.length === 0) return fail(res, 'User not found', 404);
    return ok(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
