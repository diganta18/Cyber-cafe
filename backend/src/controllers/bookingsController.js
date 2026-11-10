'use strict';
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');

function toUtcIso(dt) {
  if (!dt) return dt;
  if (dt instanceof Date) return dt.toISOString();
  const s = String(dt).trim();
  if (/Z$|[+-]\d{2}:\d{2}$/.test(s)) return s;
  return s.replace(' ', 'T') + 'Z';
}

function formatSqlDateTime(dt) {
  const d = new Date(dt);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// Auto-expire no-shows (bookings past 15 min from start_time)
async function expireNoShows(conn = pool) {
  try {
    await conn.query(
      "UPDATE bookings SET status = 'no_show' WHERE status = 'confirmed' AND start_time < NOW() - INTERVAL 15 MINUTE"
    );
    await conn.query(
      "UPDATE bookings SET status = 'cancelled' WHERE status = 'pending' AND start_time < NOW() - INTERVAL 15 MINUTE"
    );
  } catch (err) {
    console.error('[expireNoShows] error:', err.message);
  }
}

async function listBookings(req, res, next) {
  try {
    await expireNoShows();

    const { date, station_id, status } = req.query;
    const conditions = [];
    const params = [];

    if (date) {
      conditions.push('DATE(b.start_time) = ?');
      params.push(date);
    }
    if (station_id) {
      conditions.push('b.station_id = ?');
      params.push(station_id);
    }
    if (status) {
      conditions.push('b.status = ?');
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT b.id, b.booking_code, b.customer_id, b.station_id,
              b.start_time, b.end_time, b.duration_mins, b.status, b.notes, b.created_at,
              c.name as customer_name, c.phone as customer_phone,
              st.name as station_name, st.type as station_type, st.hourly_rate
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       JOIN stations st ON st.id = b.station_id
       ${where}
       ORDER BY b.start_time ASC`,
      params
    );

    const result = rows.map((r) => ({
      ...r,
      start_time: toUtcIso(r.start_time),
      end_time: toUtcIso(r.end_time),
      created_at: toUtcIso(r.created_at),
      hourly_rate: parseFloat(r.hourly_rate),
    }));

    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

async function getAvailableSlots(req, res, next) {
  try {
    await expireNoShows();

    const todayStr = new Date().toISOString().slice(0, 10);
    const dateInput = req.query.date ? String(req.query.date).trim().slice(0, 10) : todayStr;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateInput) ? dateInput : todayStr;
    const stationId = req.query.station_id;

    let stationFilter = '';
    const stationParams = [];
    if (stationId) {
      stationFilter = 'WHERE s.id = ?';
      stationParams.push(stationId);
    }

    const [stations] = await pool.query(
      `SELECT s.id, s.name, s.type, s.hourly_rate, s.status FROM stations s ${stationFilter} ORDER BY s.name ASC`,
      stationParams
    );

    const [existingBookings] = await pool.query(
      `SELECT station_id, start_time, end_time, status
       FROM bookings
       WHERE DATE(start_time) = ? AND status IN ('pending', 'confirmed', 'active')`,
      [date]
    );

    // Standard business operating hours: 09:00 to 22:00
    const timeSlots = [];
    for (let hour = 9; hour < 22; hour++) {
      const hStr = hour.toString().padStart(2, '0');
      const nextHStr = (hour + 1).toString().padStart(2, '0');
      const startSlot = `${date} ${hStr}:00:00`;
      const endSlot = `${date} ${nextHStr}:00:00`;

      timeSlots.push({
        slot_label: `${hStr}:00 - ${nextHStr}:00`,
        start_time: startSlot,
        end_time: endSlot,
      });
    }

    const result = stations.map((st) => {
      const stBookings = existingBookings.filter((b) => b.station_id === st.id);
      const slots = timeSlots.map((ts) => {
        const slotStartMs = new Date(ts.start_time.replace(' ', 'T')).getTime();
        const slotEndMs = new Date(ts.end_time.replace(' ', 'T')).getTime();

        const isBooked = stBookings.some((b) => {
          const bStart = new Date(typeof b.start_time === 'string' ? b.start_time.replace(' ', 'T') : b.start_time).getTime();
          const bEnd = new Date(typeof b.end_time === 'string' ? b.end_time.replace(' ', 'T') : b.end_time).getTime();
          return !(slotEndMs <= bStart || slotStartMs >= bEnd);
        });

        // Check if slot is in the past: if booking a past day, it's past; if today, check time; if future day, never past
        const isPast = date < todayStr || (date === todayStr && slotEndMs <= Date.now());

        return {
          ...ts,
          is_available: !isBooked && !isPast,
        };
      });

      return {
        station_id: st.id,
        station_name: st.name,
        station_type: st.type,
        hourly_rate: parseFloat(st.hourly_rate),
        slots,
      };
    });

    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

async function createBooking(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await expireNoShows(conn);

    const {
      station_id,
      start_time,
      duration_mins = 60,
      customer_id,
      customer_name,
      customer_phone,
      notes,
    } = req.body;

    if (!station_id || !start_time) {
      await conn.rollback();
      return fail(res, 'station_id and start_time are required', 400);
    }

    const duration = Math.max(15, Math.min(360, parseInt(duration_mins) || 60));
    const startDt = new Date(start_time);
    if (isNaN(startDt.getTime())) {
      await conn.rollback();
      return fail(res, 'Invalid start_time format', 400);
    }

    // Must not be in the past (with 5-min tolerance)
    if (startDt.getTime() < Date.now() - 5 * 60 * 1000) {
      await conn.rollback();
      return fail(res, 'Cannot book a slot in the past', 400);
    }

    const endDt = new Date(startDt.getTime() + duration * 60 * 1000);
    const sqlStart = formatSqlDateTime(startDt);
    const sqlEnd = formatSqlDateTime(endDt);

    // Verify station exists
    const [stations] = await conn.query('SELECT id, name, status FROM stations WHERE id = ? FOR UPDATE', [station_id]);
    if (stations.length === 0) {
      await conn.rollback();
      return fail(res, 'Station not found', 404);
    }

    // Resolve customer ID
    let finalCustomerId = customer_id;
    if (!finalCustomerId) {
      if (!customer_name || !customer_phone) {
        await conn.rollback();
        return fail(res, 'customer_id or customer_name and customer_phone are required', 400);
      }
      const [existingCust] = await conn.query('SELECT id FROM customers WHERE phone = ?', [customer_phone]);
      if (existingCust.length > 0) {
        finalCustomerId = existingCust[0].id;
      } else {
        const [newCust] = await conn.query(
          "INSERT INTO customers (name, phone, email, id_proof_type, id_proof_no) VALUES (?, ?, '', 'Online', 'PORTAL-USER')",
          [customer_name, customer_phone]
        );
        finalCustomerId = newCust.insertId;
      }
    }

    // Concurrency collision check
    const [conflicts] = await conn.query(
      `SELECT id FROM bookings
       WHERE station_id = ? AND status IN ('pending', 'confirmed', 'active')
         AND NOT (end_time <= ? OR start_time >= ?)
       FOR UPDATE`,
      [station_id, sqlStart, sqlEnd]
    );

    if (conflicts.length > 0) {
      await conn.rollback();
      return fail(res, 'Station is already booked for this time window. Please choose another station or slot.', 409);
    }

    // Generate unique 4-digit code e.g. BK-4821 with collision protection
    let bookingCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = Math.floor(1000 + Math.random() * 9000);
      const candidate = `BK-${code}`;
      const [existing] = await conn.query('SELECT id FROM bookings WHERE booking_code = ?', [candidate]);
      if (existing.length === 0) {
        bookingCode = candidate;
        break;
      }
    }
    if (!bookingCode) {
      bookingCode = `BK-${Date.now().toString().slice(-4)}`;
    }

    // Booking status logic:
    // Only if authenticated staff explicitly specifies status: 'confirmed' does it become 'confirmed'.
    // Otherwise (portal booking, customer self-service, or when not explicitly confirmed by staff), it is ALWAYS 'pending'.
    let initialStatus = 'pending';
    if (req.user && req.body.status === 'confirmed') {
      initialStatus = 'confirmed';
    }

    const [result] = await conn.query(
      `INSERT INTO bookings (booking_code, customer_id, station_id, start_time, end_time, duration_mins, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bookingCode, finalCustomerId, station_id, sqlStart, sqlEnd, duration, initialStatus, notes || null]
    );

    await conn.commit();

    const [created] = await pool.query(
      `SELECT b.id, b.booking_code, b.customer_id, b.station_id,
              b.start_time, b.end_time, b.duration_mins, b.status, b.notes, b.created_at,
              c.name as customer_name, c.phone as customer_phone,
              st.name as station_name, st.type as station_type, st.hourly_rate
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       JOIN stations st ON st.id = b.station_id
       WHERE b.id = ?`,
      [result.insertId]
    );

    const b = created[0];
    return ok(res, {
      ...b,
      start_time: toUtcIso(b.start_time),
      end_time: toUtcIso(b.end_time),
      created_at: toUtcIso(b.created_at),
      hourly_rate: parseFloat(b.hourly_rate),
    }, 201);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function checkinBooking(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    const [bookings] = await conn.query(
      `SELECT b.*, c.name as customer_name
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       WHERE (b.id = ? OR b.booking_code = ?) FOR UPDATE`,
      [id, id]
    );

    if (bookings.length === 0) {
      await conn.rollback();
      return fail(res, 'Booking not found', 404);
    }

    const b = bookings[0];
    if (b.status !== 'confirmed' && b.status !== 'pending') {
      await conn.rollback();
      return fail(res, `Booking cannot be checked in (Status: ${b.status})`, 400);
    }

    // Verify station is available or reserved
    const [stations] = await conn.query('SELECT id, status FROM stations WHERE id = ? FOR UPDATE', [b.station_id]);
    if (stations.length === 0) {
      await conn.rollback();
      return fail(res, 'Station not found', 404);
    }
    if (stations[0].status === 'occupied') {
      await conn.rollback();
      return fail(res, 'Station is currently occupied by another session', 400);
    }

    // Check if customer already has active session
    const [activeSess] = await conn.query(
      "SELECT id FROM sessions WHERE customer_id = ? AND status = 'active'",
      [b.customer_id]
    );
    if (activeSess.length > 0) {
      await conn.rollback();
      return fail(res, 'Customer already has an active session elsewhere', 400);
    }

    const staffId = req.user ? req.user.id : 1; // Counter staff or admin

    // Start session
    const [sessRes] = await conn.query(
      "INSERT INTO sessions (customer_id, station_id, staff_id, start_time, status) VALUES (?, ?, ?, NOW(), 'active')",
      [b.customer_id, b.station_id, staffId]
    );

    // Update booking and station
    await conn.query("UPDATE bookings SET status = 'active' WHERE id = ?", [b.id]);
    await conn.query("UPDATE stations SET status = 'occupied' WHERE id = ?", [b.station_id]);

    await conn.commit();

    return ok(res, {
      message: 'Booking checked in successfully',
      session_id: sessRes.insertId,
      station_id: b.station_id,
      customer_id: b.customer_id,
      customer_name: b.customer_name,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;
    const [bookings] = await pool.query(
      'SELECT id, status FROM bookings WHERE id = ? OR booking_code = ?',
      [id, id]
    );

    if (bookings.length === 0) return fail(res, 'Booking not found', 404);
    const b = bookings[0];

    if (!['pending', 'confirmed'].includes(b.status)) {
      return fail(res, `Cannot cancel booking with status '${b.status}'`, 400);
    }

    await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [b.id]);
    return ok(res, { message: 'Booking cancelled successfully' });
  } catch (err) {
    next(err);
  }
}

async function updateBookingStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (!status || !validStatuses.includes(status)) {
      return fail(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const [bookings] = await pool.query(
      'SELECT id, status FROM bookings WHERE id = ? OR booking_code = ?',
      [id, id]
    );

    if (bookings.length === 0) return fail(res, 'Booking not found', 404);
    const b = bookings[0];

    if (b.status === 'active' || b.status === 'completed') {
      return fail(res, `Cannot change status of a booking that is '${b.status}'`, 400);
    }

    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, b.id]);

    const [updated] = await pool.query(
      `SELECT b.id, b.booking_code, b.customer_id, b.station_id,
              b.start_time, b.end_time, b.duration_mins, b.status, b.notes, b.created_at,
              c.name as customer_name, c.phone as customer_phone,
              st.name as station_name, st.type as station_type, st.hourly_rate
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       JOIN stations st ON st.id = b.station_id
       WHERE b.id = ?`,
      [b.id]
    );

    return ok(res, {
      ...updated[0],
      start_time: toUtcIso(updated[0].start_time),
      end_time: toUtcIso(updated[0].end_time),
      created_at: toUtcIso(updated[0].created_at),
      hourly_rate: parseFloat(updated[0].hourly_rate),
    });
  } catch (err) {
    next(err);
  }
}

function maskPhone(phone) {
  if (!phone) return '';
  const s = String(phone).trim();
  if (s.length <= 4) return s;
  return s.slice(0, 2) + '*'.repeat(Math.max(0, s.length - 4)) + s.slice(-2);
}

function maskName(name) {
  if (!name) return 'Customer';
  const parts = String(name).trim().split(' ');
  if (parts.length === 1) return parts[0][0] + '***';
  return `${parts[0]} ${parts[1][0]}.`;
}

async function trackBooking(req, res, next) {
  try {
    await expireNoShows();
    const { query } = req.query;
    if (!query) return fail(res, 'query is required', 400);

    const cleanQuery = query.trim().replace(/^#/, '');
    let normalizedCode = cleanQuery.toUpperCase();
    if (normalizedCode.startsWith('BK') && !normalizedCode.startsWith('BK-')) {
      normalizedCode = 'BK-' + normalizedCode.slice(2).trim();
    }
    const codeVariant = normalizedCode.startsWith('BK-')
      ? normalizedCode
      : `BK-${normalizedCode}`;
    const digitsOnly = cleanQuery.replace(/\D/g, '');

    const [rows] = await pool.query(
      `SELECT b.id, b.booking_code, b.customer_id, b.station_id,
              b.start_time, b.end_time, b.duration_mins, b.status, b.notes, b.created_at,
              c.name as customer_name, c.phone as customer_phone,
              st.name as station_name, st.type as station_type, st.hourly_rate
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       JOIN stations st ON st.id = b.station_id
       WHERE b.booking_code = ? 
          OR b.booking_code = ? 
          OR c.phone = ? 
          OR (LENGTH(?) >= 10 AND c.phone LIKE ?)
       ORDER BY b.start_time DESC`,
      [normalizedCode, codeVariant, cleanQuery, digitsOnly, `%${digitsOnly.slice(-10)}`]
    );

    const result = rows.map((r) => ({
      ...r,
      customer_name: req.user ? r.customer_name : maskName(r.customer_name),
      customer_phone: req.user ? r.customer_phone : maskPhone(r.customer_phone),
      start_time: toUtcIso(r.start_time),
      end_time: toUtcIso(r.end_time),
      created_at: toUtcIso(r.created_at),
      hourly_rate: parseFloat(r.hourly_rate),
    }));

    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  expireNoShows,
  listBookings,
  getAvailableSlots,
  createBooking,
  checkinBooking,
  cancelBooking,
  updateBookingStatus,
  trackBooking,
};

