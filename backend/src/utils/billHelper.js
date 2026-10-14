'use strict';

/**
 * Shared helper: fetch a full bill detail object (suitable for invoice/API response).
 * Works with both a pool and a connection since both expose .query().
 *
 * @param {import('mysql2/promise').Pool | import('mysql2/promise').Connection} db
 * @param {number|string} billId
 * @returns {Promise<object|null>}
 */
async function getBillDetail(db, billId) {
  const [bills] = await db.query(
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

  const [services] = await db.query(
    `SELECT ss.id, sv.name, ss.quantity, ss.unit_price,
            ROUND(ss.quantity * ss.unit_price, 2) as line_total
     FROM session_services ss
     JOIN services sv ON sv.id = ss.service_id
     WHERE ss.session_id = ?`,
    [bill.session_id]
  );

  const [payments] = await db.query(
    'SELECT id, mode, amount, paid_at FROM payments WHERE bill_id = ? ORDER BY paid_at ASC',
    [billId]
  );

  // Fetch the configured block size (default 15 min if not set)
  const [blockRows] = await db.query(
    "SELECT value FROM settings WHERE key_name = 'billing_block_minutes'"
  );
  const blockMinutes = blockRows.length > 0 ? parseInt(blockRows[0].value) : 15;

  // Compute billed_minutes using the actual block size
  const elapsed = bill.end_time
    ? (new Date(bill.end_time) - new Date(bill.start_time)) / 60000
    : null;
  const billedMinutes =
    elapsed !== null
      ? Math.max(blockMinutes, Math.ceil(elapsed / blockMinutes) * blockMinutes)
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
      billed_minutes: billedMinutes,
    },
    services: services.map((s) => ({
      ...s,
      unit_price: parseFloat(s.unit_price),
      line_total: parseFloat(s.line_total),
    })),
    time_charge: parseFloat(bill.time_charge),
    service_charge: parseFloat(bill.service_charge),
    discount: parseFloat(bill.discount),
    total: parseFloat(bill.total),
    payments: payments.map((p) => ({ ...p, amount: parseFloat(p.amount) })),
  };
}

module.exports = { getBillDetail };
