'use strict';
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');

async function listStations(req, res, next) {
  try {
    const [stations] = await pool.query(
      'SELECT id, name, type, hourly_rate, status FROM stations ORDER BY name ASC'
    );

    // For occupied stations, add active session info
    const occupied = stations.filter((s) => s.status === 'occupied');
    if (occupied.length > 0) {
      const ids = occupied.map((s) => s.id);
      const placeholders = ids.map(() => '?').join(',');
      const [sessions] = await pool.query(
        `SELECT s.id, s.station_id, s.start_time, c.name as customer_name
         FROM sessions s
         JOIN customers c ON c.id = s.customer_id
         WHERE s.station_id IN (${placeholders}) AND s.status = 'active'`,
        ids
      );
      const sessionMap = {};
      sessions.forEach((sess) => { sessionMap[sess.station_id] = sess; });
      stations.forEach((station) => {
        if (station.status === 'occupied' && sessionMap[station.id]) {
          const s = sessionMap[station.id];
          station.active_session = {
            id: s.id,
            customer_name: s.customer_name,
            start_time: s.start_time,
          };
        }
      });
    }

    return ok(res, stations);
  } catch (err) {
    next(err);
  }
}

async function createStation(req, res, next) {
  try {
    const { name, type, hourly_rate } = req.body;
    const [existing] = await pool.query('SELECT id FROM stations WHERE name = ?', [name]);
    if (existing.length > 0) return fail(res, 'Station name already exists', 409);

    const [result] = await pool.query(
      "INSERT INTO stations (name, type, hourly_rate, status) VALUES (?, ?, ?, 'available')",
      [name, type, hourly_rate]
    );
    const [station] = await pool.query('SELECT * FROM stations WHERE id = ?', [result.insertId]);
    return ok(res, station[0], 201);
  } catch (err) {
    next(err);
  }
}

async function updateStation(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM stations WHERE id = ?', [id]);
    if (rows.length === 0) return fail(res, 'Station not found', 404);

    const { name, type, hourly_rate } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      const [dup] = await pool.query('SELECT id FROM stations WHERE name = ? AND id != ?', [name, id]);
      if (dup.length > 0) return fail(res, 'Station name already exists', 409);
      updates.push('name = ?'); params.push(name);
    }
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (hourly_rate !== undefined) { updates.push('hourly_rate = ?'); params.push(hourly_rate); }

    if (updates.length === 0) return fail(res, 'No fields to update', 400);
    params.push(id);
    await pool.query(`UPDATE stations SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query('SELECT * FROM stations WHERE id = ?', [id]);
    return ok(res, updated[0]);
  } catch (err) {
    next(err);
  }
}

async function patchStationStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['available', 'maintenance'].includes(status)) {
      return fail(res, 'Status must be available or maintenance', 400);
    }

    const [rows] = await pool.query('SELECT id, status FROM stations WHERE id = ?', [id]);
    if (rows.length === 0) return fail(res, 'Station not found', 404);

    if (rows[0].status === 'occupied') {
      return fail(res, 'Cannot change status of an occupied station', 400);
    }

    await pool.query('UPDATE stations SET status = ? WHERE id = ?', [status, id]);
    const [updated] = await pool.query('SELECT * FROM stations WHERE id = ?', [id]);
    return ok(res, updated[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteStation(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id, status FROM stations WHERE id = ?', [id]);
    if (rows.length === 0) return fail(res, 'Station not found', 404);

    if (rows[0].status === 'occupied') {
      return fail(res, 'Cannot delete an occupied station', 400);
    }

    const [history] = await pool.query('SELECT id FROM sessions WHERE station_id = ? LIMIT 1', [id]);
    if (history.length > 0) {
      return fail(res, 'Cannot delete a station with session history', 400);
    }

    await pool.query('DELETE FROM stations WHERE id = ?', [id]);
    return ok(res, { message: 'Station deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listStations, createStation, updateStation, patchStationStatus, deleteStation };
