'use strict';
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');

function toUtcIso(dt) {
  if (!dt) return dt;
  if (dt instanceof Date) return dt.toISOString();
  const s = String(dt).trim();
  if (/Z$|[+-]\d{2}:\d{2}$/.test(s)) return s;
  return s.replace(' ', 'T') + 'Z';
}

async function createPrintOrder(req, res, next) {
  try {
    if (!req.file) {
      return fail(res, 'File is required for print orders', 400);
    }

    const {
      customer_id,
      customer_name,
      customer_phone,
      color_mode = 'bw',
      duplex_mode = 'single',
      copies = 1,
      page_count = 1,
      notes,
    } = req.body;

    const parsedCopies = Math.max(1, parseInt(copies) || 1);
    const parsedPages = Math.max(1, parseInt(page_count) || 1);
    const color = color_mode === 'color' ? 'color' : 'bw';
    const duplex = duplex_mode === 'double' ? 'double' : 'single';

    // Resolve customer ID
    let finalCustomerId = customer_id;
    if (!finalCustomerId) {
      if (!customer_name || !customer_phone) {
        // Clean up uploaded file
        fs.unlink(req.file.path, () => {});
        return fail(res, 'customer_id OR customer_name and customer_phone are required', 400);
      }

      const [existingCust] = await pool.query('SELECT id FROM customers WHERE phone = ?', [customer_phone]);
      if (existingCust.length > 0) {
        finalCustomerId = existingCust[0].id;
      } else {
        const [newCust] = await pool.query(
          "INSERT INTO customers (name, phone, email, id_proof_type, id_proof_no) VALUES (?, ?, '', 'Online', 'PRINT-ORDER')",
          [customer_name, customer_phone]
        );
        finalCustomerId = newCust.insertId;
      }
    }

    // Determine unit price based on active service or default rates
    let unitRate = color === 'color' ? 10.0 : 3.0;
    const serviceKeyword = color === 'color' ? '%Print Color%' : '%Print B/W%';
    const [serviceMatch] = await pool.query(
      'SELECT price FROM services WHERE name LIKE ? AND is_active = 1 LIMIT 1',
      [serviceKeyword]
    );
    if (serviceMatch.length > 0) {
      unitRate = parseFloat(serviceMatch[0].price);
    }

    const estimatedCost = Math.round(parsedPages * parsedCopies * unitRate * 100) / 100;

    // Generate unique collision-free order number: PR-####
    let orderNo;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `PR-${Math.floor(1000 + Math.random() * 9000)}`;
      const [existing] = await pool.query('SELECT id FROM print_orders WHERE order_no = ?', [candidate]);
      if (existing.length === 0) {
        orderNo = candidate;
        break;
      }
    }
    if (!orderNo) {
      orderNo = `PR-${Date.now().toString().slice(-4)}`;
    }

    const [result] = await pool.query(
      `INSERT INTO print_orders (
        order_no, customer_id, file_name, file_path, file_size,
        color_mode, duplex_mode, copies, page_count, notes,
        estimated_cost, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderNo,
        finalCustomerId,
        req.file.originalname,
        req.file.path,
        req.file.size,
        color,
        duplex,
        parsedCopies,
        parsedPages,
        notes || null,
        estimatedCost,
      ]
    );

    const [created] = await pool.query(
      `SELECT po.*, c.name as customer_name, c.phone as customer_phone
       FROM print_orders po
       JOIN customers c ON c.id = po.customer_id
       WHERE po.id = ?`,
      [result.insertId]
    );

    const row = created[0];
    return ok(
      res,
      {
        ...row,
        estimated_cost: parseFloat(row.estimated_cost),
        created_at: toUtcIso(row.created_at),
      },
      201
    );
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
}

async function listPrintOrders(req, res, next) {
  try {
    const { status, date } = req.query;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('po.status = ?');
      params.push(status);
    }
    if (date) {
      conditions.push('DATE(po.created_at) = ?');
      params.push(date);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT po.id, po.order_no, po.customer_id, po.file_name, po.file_size,
              po.color_mode, po.duplex_mode, po.copies, po.page_count, po.notes,
              po.estimated_cost, po.status, po.bill_id, po.created_at,
              c.name as customer_name, c.phone as customer_phone
       FROM print_orders po
       JOIN customers c ON c.id = po.customer_id
       ${where}
       ORDER BY po.created_at DESC`,
      params
    );

    const result = rows.map((r) => ({
      ...r,
      estimated_cost: parseFloat(r.estimated_cost),
      created_at: toUtcIso(r.created_at),
    }));

    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

async function downloadPrintOrderFile(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT file_name, file_path FROM print_orders WHERE id = ? OR order_no = ?', [
      id,
      id,
    ]);

    if (rows.length === 0) return fail(res, 'Print order not found', 404);
    const { file_name, file_path } = rows[0];

    if (!fs.existsSync(file_path)) {
      return fail(res, 'File no longer exists on server disk', 404);
    }

    return res.download(file_path, file_name);
  } catch (err) {
    next(err);
  }
}

async function updatePrintOrderStatus(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'printing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      await conn.rollback();
      return fail(res, `Invalid status. Valid values: ${validStatuses.join(', ')}`, 400);
    }

    const [rows] = await conn.query('SELECT * FROM print_orders WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return fail(res, 'Print order not found', 404);
    }

    const order = rows[0];
    let billId = order.bill_id;

    // If marking as completed and not yet billed, create counter bill automatically
    if (status === 'completed' && !billId) {
      // Find service ID for print
      const serviceName = order.color_mode === 'color' ? 'Print Color' : 'Print B/W';
      const [services] = await conn.query('SELECT id, price FROM services WHERE name LIKE ? LIMIT 1', [`%${serviceName}%`]);
      const serviceId = services.length > 0 ? services[0].id : 1;
      const unitPrice = services.length > 0 ? parseFloat(services[0].price) : (order.color_mode === 'color' ? 10.0 : 3.0);
      const totalQty = order.copies * order.page_count;
      const totalCost = parseFloat(order.estimated_cost);

      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      let billNo;
      for (let attempt = 0; attempt < 5; attempt++) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        const candidate = `BILL-${dateStr}-${rand}`;
        const [existing] = await conn.query('SELECT id FROM bills WHERE bill_no = ?', [candidate]);
        if (existing.length === 0) {
          billNo = candidate;
          break;
        }
      }
      if (!billNo) {
        billNo = `BILL-${dateStr}-${Date.now().toString().slice(-4)}`;
      }

      const [billRes] = await conn.query(
        `INSERT INTO bills (bill_no, order_type, session_id, customer_id, time_charge, service_charge, discount, total, status)
         VALUES (?, 'remote_print', NULL, ?, 0.00, ?, 0.00, ?, 'unpaid')`,
        [billNo, order.customer_id, totalCost, totalCost]
      );
      billId = billRes.insertId;

      await conn.query(
        'INSERT INTO bill_items (bill_id, service_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [billId, serviceId, totalQty, unitPrice]
      );
    }

    await conn.query('UPDATE print_orders SET status = ?, bill_id = ? WHERE id = ?', [status, billId, id]);
    await conn.commit();

    return ok(res, { message: `Order status updated to ${status}`, bill_id: billId });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
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

async function trackPrintOrder(req, res, next) {
  try {
    const { tracking_query } = req.query;
    if (!tracking_query) return fail(res, 'tracking_query (order_no or phone) is required', 400);

    const q = tracking_query.trim().replace(/^#/, '');
    let normalizedPr = q.toUpperCase();
    if (normalizedPr.startsWith('PR') && !normalizedPr.startsWith('PR-')) {
      normalizedPr = 'PR-' + normalizedPr.slice(2).trim();
    }
    const prVariant = normalizedPr.startsWith('PR-') ? normalizedPr : `PR-${normalizedPr}`;
    const digitsOnly = q.replace(/\D/g, '');

    const [rows] = await pool.query(
      `SELECT po.id, po.order_no, po.file_name, po.color_mode, po.duplex_mode,
              po.copies, po.page_count, po.estimated_cost, po.status, po.created_at,
              c.name as customer_name, c.phone as customer_phone
       FROM print_orders po
       JOIN customers c ON c.id = po.customer_id
       WHERE po.order_no = ? 
          OR po.order_no = ? 
          OR c.phone = ? 
          OR (LENGTH(?) >= 10 AND c.phone LIKE ?)
       ORDER BY po.created_at DESC`,
      [normalizedPr, prVariant, q, digitsOnly, `%${digitsOnly.slice(-10)}`]
    );

    const result = rows.map((r) => ({
      ...r,
      customer_name: req.user ? r.customer_name : maskName(r.customer_name),
      customer_phone: req.user ? r.customer_phone : maskPhone(r.customer_phone),
      estimated_cost: parseFloat(r.estimated_cost),
      created_at: toUtcIso(r.created_at),
    }));

    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPrintOrder,
  listPrintOrders,
  downloadPrintOrderFile,
  updatePrintOrderStatus,
  trackPrintOrder,
};

