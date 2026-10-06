'use strict';
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');
const { calculateBill, round2 } = require('../services/billing');

// Helper: get billing block_minutes from settings
async function getBlockMinutes(conn) {
  const [rows] = await conn.query(
    "SELECT value FROM settings WHERE key_name = 'billing_block_minutes'"
  );
  return rows.length > 0 ? parseInt(rows[0].value) : 15;
}

// Helper: generate bill number in a transaction
async function generateBillNo(conn) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const [rows] = await conn.query(
    "SELECT COUNT(*) as cnt FROM bills WHERE DATE(created_at) = CURDATE()"
  );
  const seq = (rows[0].cnt + 1).toString().padStart(4, '0');
  return `CC-${today}-${seq}`;
}

// Helper: get full bill detail
async function getBillDetail(conn, billId) {
  const [bills] = await conn.query(
    `SELECT b.id, b.bill_no, b.status, b.created_at,
            b.time_charge, b.service_charge, b.discount, b.total,
            c.name as customer_name, c.phone as customer_phone,
            st.name as station_name, st.hourly_rate,
            u.name as staff_name,
            s.start_time, s.end_time, s.id as session_id
     FROM bills b
     JOIN sessions s ON s.id = b.session_id
     JOIN customers c ON c.id = s.customer_id
     JOIN stations st ON st.id = s.station_id
     JOIN users u ON u.id = s.staff_id
     WHERE b.id = ?`,
    [billId]
  );
  if (bills.length === 0) return null;
  const bill = bills[0];

  const [services] = await conn.query(
    `SELECT ss.id, sv.name, ss.quantity, ss.unit_price,
            ROUND(ss.quantity * ss.unit_price, 2) as line_total
     FROM session_services ss
     JOIN services sv ON sv.id = ss.service_id
     WHERE ss.session_id = ?`,
    [bill.session_id]
  );

  const [payments] = await conn.query(
    'SELECT id, mode, amount, paid_at FROM payments WHERE bill_id = ? ORDER BY paid_at ASC',
    [billId]
  );

  // Compute billed_minutes from times
  const elapsed = bill.end_time
    ? (new Date(bill.end_time) - new Date(bill.start_time)) / 60000
    : null;

  return {
    id: bill.id,
    bill_no: bill.bill_no,
    status: bill.status,
    created_at: bill.created_at,
    customer: { name: bill.customer_name, phone: bill.customer_phone },
    station: { name: bill.station_name, hourly_rate: parseFloat(bill.hourly_rate) },
    staff: { name: bill.staff_name },
    session: {
      id: bill.session_id,
      start_time: bill.start_time,
      end_time: bill.end_time,
      billed_minutes: elapsed !== null ? Math.max(15, Math.ceil(elapsed / 15) * 15) : null,
    },
    services: services.map(s => ({
      ...s,
      unit_price: parseFloat(s.unit_price),
      line_total: parseFloat(s.line_total)
    })),
    time_charge: parseFloat(bill.time_charge),
    service_charge: parseFloat(bill.service_charge),
    discount: parseFloat(bill.discount),
    total: parseFloat(bill.total),
    payments: payments.map(p => ({ ...p, amount: parseFloat(p.amount) })),
  };
}

// POST /api/sessions - start session
async function startSession(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { customer_id, station_id } = req.body;

    // Check customer active
    const [customers] = await conn.query(
      'SELECT id FROM customers WHERE id = ? AND is_active = 1',
      [customer_id]
    );
    if (customers.length === 0) return fail(res, 'Customer not found or inactive', 404);

    // Check customer has no active session
    const [activeCustomer] = await conn.query(
      "SELECT id FROM sessions WHERE customer_id = ? AND status = 'active'",
      [customer_id]
    );
    if (activeCustomer.length > 0) return fail(res, 'Customer already has an active session', 400);

    // Lock station
    const [stations] = await conn.query(
      "SELECT id, status FROM stations WHERE id = ? FOR UPDATE",
      [station_id]
    );
    if (stations.length === 0) return fail(res, 'Station not found', 404);
    if (stations[0].status !== 'available') {
      return fail(res, 'Station is not available', 400);
    }

    // Insert session
    const [result] = await conn.query(
      "INSERT INTO sessions (customer_id, station_id, staff_id, start_time, status) VALUES (?, ?, ?, UTC_TIMESTAMP(), 'active')",
      [customer_id, station_id, req.user.id]
    );
    const sessionId = result.insertId;

    // Mark station occupied
    await conn.query("UPDATE stations SET status = 'occupied' WHERE id = ?", [station_id]);

    await conn.commit();

    const [session] = await pool.query(
      `SELECT s.id, s.customer_id, s.station_id, s.staff_id, s.start_time, s.status,
              c.name as customer_name, st.name as station_name, st.hourly_rate
       FROM sessions s
       JOIN customers c ON c.id = s.customer_id
       JOIN stations st ON st.id = s.station_id
       WHERE s.id = ?`,
      [sessionId]
    );
    return ok(res, session[0], 201);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// GET /api/sessions/active
async function getActiveSessions(req, res, next) {
  try {
    const [sessions] = await pool.query(
      `SELECT s.id, s.customer_id, s.station_id, s.start_time,
              c.name as customer_name,
              st.name as station_name, st.hourly_rate
       FROM sessions s
       JOIN customers c ON c.id = s.customer_id
       JOIN stations st ON st.id = s.station_id
       WHERE s.status = 'active'
       ORDER BY s.start_time ASC`
    );

    const now = new Date();

    // Get services for each session
    const sessionIds = sessions.map((s) => s.id);
    let servicesMap = {};
    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      const [serviceRows] = await pool.query(
        `SELECT ss.session_id, sv.name, ss.quantity, ss.unit_price
         FROM session_services ss
         JOIN services sv ON sv.id = ss.service_id
         WHERE ss.session_id IN (${placeholders})`,
        sessionIds
      );
      serviceRows.forEach((r) => {
        if (!servicesMap[r.session_id]) servicesMap[r.session_id] = [];
        servicesMap[r.session_id].push({ name: r.name, quantity: r.quantity, unit_price: r.unit_price });
      });
    }

    // Get block minutes from settings
    const [blockSetting] = await pool.query(
      "SELECT value FROM settings WHERE key_name = 'billing_block_minutes'"
    );
    const blockMinutes = blockSetting.length > 0 ? parseInt(blockSetting[0].value) : 15;

    const items = sessions.map((s) => {
      const services = servicesMap[s.id] || [];
      const elapsedMs = now - new Date(s.start_time);
      const elapsedMinutes = elapsedMs / 60000;
      const billedMinutes = Math.max(blockMinutes, Math.ceil(elapsedMinutes / blockMinutes) * blockMinutes);
      const running_time_charge = round2((billedMinutes * s.hourly_rate) / 60);
      const running_service_charge = round2(services.reduce((sum, sv) => sum + sv.quantity * sv.unit_price, 0));

      return {
        id: s.id,
        customer_id: s.customer_id,
        customer_name: s.customer_name,
        station_id: s.station_id,
        station_name: s.station_name,
        hourly_rate: s.hourly_rate,
        start_time: s.start_time,
        services,
        running_time_charge,
        running_service_charge,
      };
    });

    return ok(res, { server_time: now.toISOString(), items });
  } catch (err) {
    next(err);
  }
}

// POST /api/sessions/:id/services - add service
async function addService(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { service_id, quantity } = req.body;

    if (!quantity || quantity < 1) {
      await conn.rollback();
      return fail(res, 'Quantity must be at least 1', 400);
    }

    const [sessions] = await conn.query(
      "SELECT id, status FROM sessions WHERE id = ?",
      [id]
    );
    if (sessions.length === 0) {
      await conn.rollback();
      return fail(res, 'Session not found', 404);
    }
    if (sessions[0].status !== 'active') {
      await conn.rollback();
      return fail(res, 'Session is not active', 400);
    }

    const [services] = await conn.query(
      'SELECT id, price, stock_qty, is_active FROM services WHERE id = ? FOR UPDATE',
      [service_id]
    );
    if (services.length === 0 || !services[0].is_active) {
      await conn.rollback();
      return fail(res, 'Service not found or inactive', 404);
    }

    const service = services[0];
    if (service.stock_qty !== null) {
      if (service.stock_qty < quantity) {
        await conn.rollback();
        return fail(res, 'Insufficient stock', 400);
      }
      await conn.query('UPDATE services SET stock_qty = stock_qty - ? WHERE id = ?', [quantity, service_id]);
    }

    const [result] = await conn.query(
      'INSERT INTO session_services (session_id, service_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [id, service_id, quantity, service.price]
    );

    await conn.commit();

    const [row] = await pool.query(
      `SELECT ss.id, ss.session_id, ss.service_id, sv.name, ss.quantity, ss.unit_price
       FROM session_services ss
       JOIN services sv ON sv.id = ss.service_id
       WHERE ss.id = ?`,
      [result.insertId]
    );
    return ok(res, row[0], 201);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// DELETE /api/sessions/:id/services/:rowId - remove service row
async function removeService(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id, rowId } = req.params;

    const [sessions] = await conn.query(
      "SELECT id, status FROM sessions WHERE id = ?",
      [id]
    );
    if (sessions.length === 0) {
      await conn.rollback();
      return fail(res, 'Session not found', 404);
    }
    if (sessions[0].status !== 'active') {
      await conn.rollback();
      return fail(res, 'Session is not active', 400);
    }

    const [rows] = await conn.query(
      'SELECT id, service_id, quantity FROM session_services WHERE id = ? AND session_id = ?',
      [rowId, id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return fail(res, 'Service row not found', 404);
    }

    const { service_id, quantity } = rows[0];

    // Restore stock if tracked
    await conn.query(
      'UPDATE services SET stock_qty = stock_qty + ? WHERE id = ? AND stock_qty IS NOT NULL',
      [quantity, service_id]
    );

    await conn.query('DELETE FROM session_services WHERE id = ?', [rowId]);
    await conn.commit();
    return ok(res, { message: 'Service removed' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// POST /api/sessions/:id/end - end session and create bill
async function endSession(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const discount = parseFloat(req.body.discount) || 0;

    // Lock session
    const [sessions] = await conn.query(
      "SELECT s.id, s.status, s.start_time, s.station_id, st.hourly_rate FROM sessions s JOIN stations st ON st.id = s.station_id WHERE s.id = ? FOR UPDATE",
      [id]
    );
    if (sessions.length === 0) {
      await conn.rollback();
      return fail(res, 'Session not found', 404);
    }
    if (sessions[0].status !== 'active') {
      await conn.rollback();
      return fail(res, 'Session is not active', 400);
    }

    const session = sessions[0];

    // Set end_time
    await conn.query(
      "UPDATE sessions SET end_time = UTC_TIMESTAMP(), status = 'completed' WHERE id = ?",
      [id]
    );

    // Get actual end_time
    const [updated] = await conn.query('SELECT end_time FROM sessions WHERE id = ?', [id]);
    const endTime = updated[0].end_time;

    // Get services
    const [serviceRows] = await conn.query(
      'SELECT quantity, unit_price FROM session_services WHERE session_id = ?',
      [id]
    );

    // Get block minutes
    const blockMinutes = await getBlockMinutes(conn);

    // Calculate bill
    const billing = calculateBill(session.start_time, endTime, session.hourly_rate, serviceRows, discount, blockMinutes);

    // Generate bill number
    const billNo = await generateBillNo(conn);

    // Insert bill
    const [billResult] = await conn.query(
      "INSERT INTO bills (bill_no, session_id, time_charge, service_charge, discount, total, status) VALUES (?, ?, ?, ?, ?, ?, 'unpaid')",
      [billNo, id, billing.timeCharge, billing.serviceCharge, billing.discount, billing.total]
    );
    const billId = billResult.insertId;

    // Free station
    await conn.query("UPDATE stations SET status = 'available' WHERE id = ?", [session.station_id]);

    await conn.commit();

    const detail = await getBillDetail(pool, billId);
    return ok(res, detail);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// GET /api/sessions - history
async function listSessions(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (req.query.status) {
      conditions.push('s.status = ?');
      params.push(req.query.status);
    }
    if (req.query.from) {
      conditions.push('s.start_time >= ?');
      params.push(req.query.from);
    }
    if (req.query.to) {
      conditions.push('s.start_time <= ?');
      params.push(req.query.to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM sessions s ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT s.id, s.customer_id, s.station_id, s.staff_id, s.start_time, s.end_time, s.status,
              c.name as customer_name, st.name as station_name, u.name as staff_name
       FROM sessions s
       JOIN customers c ON c.id = s.customer_id
       JOIN stations st ON st.id = s.station_id
       JOIN users u ON u.id = s.staff_id
       ${where}
       ORDER BY s.start_time DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return ok(res, { items: rows, total, page, limit });
  } catch (err) {
    next(err);
  }
}

module.exports = { startSession, getActiveSessions, addService, removeService, endSession, listSessions };
