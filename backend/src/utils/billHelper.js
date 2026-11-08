'use strict';

function toUtcIso(dt) {
  if (!dt) return dt;
  if (dt instanceof Date) return dt.toISOString();
  const s = String(dt).trim();
  if (/Z$|[+-]\d{2}:\d{2}$/.test(s)) return s;
  return s.replace(' ', 'T') + 'Z';
}

function toUtcDate(dt) {
  if (!dt) return null;
  if (dt instanceof Date) return dt;
  const s = String(dt).trim();
  if (/Z$|[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
  return new Date(s.replace(' ', 'T') + 'Z');
}

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
    `SELECT b.id, b.bill_no, b.status, b.created_at, b.order_type,
            b.time_charge, b.service_charge, b.discount, b.total,
            COALESCE(c.name, 'Walk-in Guest') as customer_name,
            c.phone as customer_phone,
            COALESCE(st.name, 'Counter / Takeout') as station_name,
            COALESCE(st.hourly_rate, 0) as hourly_rate,
            COALESCE(u.name, 'Counter Staff') as staff_name,
            s.start_time, s.end_time, s.id as session_id
     FROM bills b
     LEFT JOIN sessions s ON s.id = b.session_id
     LEFT JOIN customers c ON c.id = COALESCE(s.customer_id, b.customer_id)
     LEFT JOIN stations st ON st.id = s.station_id
     LEFT JOIN users u ON u.id = s.staff_id
     WHERE b.id = ?`,
    [billId]
  );
  if (bills.length === 0) return null;
  const bill = bills[0];

  let services = [];
  if (bill.session_id) {
    const [sessServices] = await db.query(
      `SELECT ss.id, sv.name, ss.quantity, ss.unit_price,
              ROUND(ss.quantity * ss.unit_price, 2) as line_total
       FROM session_services ss
       JOIN services sv ON sv.id = ss.service_id
       WHERE ss.session_id = ?`,
      [bill.session_id]
    );
    services = sessServices;
  } else {
    const [itemServices] = await db.query(
      `SELECT bi.id, sv.name, bi.quantity, bi.unit_price,
              ROUND(bi.quantity * bi.unit_price, 2) as line_total
       FROM bill_items bi
       JOIN services sv ON sv.id = bi.service_id
       WHERE bi.bill_id = ?`,
      [bill.id]
    );
    services = itemServices;
  }

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
  const start = toUtcDate(bill.start_time);
  const end = toUtcDate(bill.end_time);
  const elapsed = end && start ? Math.max(0, (end - start) / 60000) : null;
  const billedMinutes =
    elapsed !== null
      ? Math.max(blockMinutes, Math.ceil(elapsed / blockMinutes) * blockMinutes)
      : null;

  return {
    id: bill.id,
    bill_no: bill.bill_no,
    order_type: bill.order_type || (bill.session_id ? 'session' : 'counter'),
    status: bill.status,
    created_at: toUtcIso(bill.created_at),
    customer: { name: bill.customer_name, phone: bill.customer_phone },
    station: { name: bill.station_name, hourly_rate: parseFloat(bill.hourly_rate) },
    staff: { name: bill.staff_name },
    session: bill.session_id
      ? {
          id: bill.session_id,
          start_time: toUtcIso(bill.start_time),
          end_time: toUtcIso(bill.end_time),
          billed_minutes: billedMinutes,
        }
      : null,
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
