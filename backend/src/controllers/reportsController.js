'use strict';
const pool = require('../config/db');
const { ok, fail } = require('../utils/response');

async function getDashboard(req, res, next) {
  try {
    const [[activeSessions]] = await pool.query(
      "SELECT COUNT(*) as cnt FROM sessions WHERE status = 'active'"
    );
    const [[stationStats]] = await pool.query(
      "SELECT COUNT(*) as total, SUM(status = 'available') as available FROM stations"
    );
    const [[revenue]] = await pool.query(
      "SELECT COALESCE(SUM(total), 0) as today_revenue FROM bills WHERE status = 'paid' AND DATE(created_at) = CURDATE()"
    );
    const [[todaySessions]] = await pool.query(
      "SELECT COUNT(*) as cnt FROM sessions WHERE DATE(start_time) = CURDATE()"
    );

    return ok(res, {
      active_sessions: activeSessions.cnt,
      available_stations: stationStats.available || 0,
      total_stations: stationStats.total,
      today_revenue: parseFloat(revenue.today_revenue),
      today_sessions: todaySessions.cnt,
    });
  } catch (err) {
    next(err);
  }
}

async function getRevenue(req, res, next) {
  try {
    const { from, to } = req.query;
    if (!from || !to) return fail(res, 'from and to date parameters are required', 400);

    const [days] = await pool.query(
      `SELECT DATE(created_at) as date,
              COUNT(*) as bills,
              COALESCE(SUM(total), 0) as revenue
       FROM bills
       WHERE status = 'paid' AND DATE(created_at) >= ? AND DATE(created_at) <= ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [from, to]
    );

    // Fill in zero-revenue days
    const dayMap = {};
    days.forEach((d) => { dayMap[d.date.toISOString().slice(0, 10)] = d; });

    const result = [];
    const start = new Date(from);
    const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      result.push({
        date: key,
        bills: dayMap[key] ? parseInt(dayMap[key].bills) : 0,
        revenue: dayMap[key] ? parseFloat(dayMap[key].revenue) : 0,
      });
    }

    const total_revenue = result.reduce((s, d) => s + d.revenue, 0);
    const total_bills = result.reduce((s, d) => s + d.bills, 0);

    return ok(res, { total_revenue, total_bills, days: result });
  } catch (err) {
    next(err);
  }
}

async function getUtilization(req, res, next) {
  try {
    const { from, to } = req.query;
    const conditions = ["s.status = 'completed'"];
    const params = [];
    if (from) { conditions.push('s.start_time >= ?'); params.push(from); }
    if (to) { conditions.push('s.start_time <= ?'); params.push(to + ' 23:59:59'); }
    const where = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT st.id as station_id, st.name as station_name,
              COUNT(s.id) as sessions,
              COALESCE(SUM(TIMESTAMPDIFF(MINUTE, s.start_time, s.end_time)), 0) as total_minutes
       FROM stations st
       LEFT JOIN sessions s ON s.station_id = st.id ${where}
       GROUP BY st.id, st.name
       ORDER BY sessions DESC`,
      params
    );

    return ok(res, rows);
  } catch (err) {
    next(err);
  }
}

async function getTopCustomers(req, res, next) {
  try {
    const { from, to } = req.query;
    const limit = Math.min(50, parseInt(req.query.limit) || 5);
    const conditions = ["b.status = 'paid'"];
    const params = [];
    if (from) { conditions.push('b.created_at >= ?'); params.push(from); }
    if (to) { conditions.push('b.created_at <= ?'); params.push(to + ' 23:59:59'); }
    const where = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT c.id as customer_id, c.name,
              COUNT(b.id) as sessions,
              COALESCE(SUM(b.total), 0) as total_spent
       FROM bills b
       JOIN sessions s ON s.id = b.session_id
       JOIN customers c ON c.id = s.customer_id
       ${where}
       GROUP BY c.id, c.name
       ORDER BY total_spent DESC
       LIMIT ?`,
      [...params, limit]
    );

    return ok(res, rows.map((r) => ({ ...r, total_spent: parseFloat(r.total_spent) })));
  } catch (err) {
    next(err);
  }
}

async function exportCSV(req, res, next) {
  try {
    const { type, from, to } = req.query;
    if (!type || !from || !to) return fail(res, 'type, from and to are required', 400);

    let csv = '';
    const filename = `${type}-${from}-${to}.csv`;

    if (type === 'revenue') {
      const [rows] = await pool.query(
        `SELECT DATE(created_at) as date, COUNT(*) as bills, COALESCE(SUM(total), 0) as revenue
         FROM bills WHERE status = 'paid' AND DATE(created_at) >= ? AND DATE(created_at) <= ?
         GROUP BY DATE(created_at) ORDER BY date ASC`,
        [from, to]
      );
      csv = 'Date,Bills,Revenue\n';
      csv += rows.map((r) => `${r.date.toISOString().slice(0, 10)},${r.bills},${r.revenue}`).join('\n');
    } else if (type === 'utilization') {
      const [rows] = await pool.query(
        `SELECT st.name as station_name, COUNT(s.id) as sessions,
                COALESCE(SUM(TIMESTAMPDIFF(MINUTE, s.start_time, s.end_time)), 0) as total_minutes
         FROM stations st
         LEFT JOIN sessions s ON s.station_id = st.id AND s.status = 'completed'
           AND s.start_time >= ? AND s.start_time <= ?
         GROUP BY st.id, st.name ORDER BY sessions DESC`,
        [from, to + ' 23:59:59']
      );
      csv = 'Station,Sessions,Total Minutes\n';
      csv += rows.map((r) => `${r.station_name},${r.sessions},${r.total_minutes}`).join('\n');
    } else {
      return fail(res, 'Invalid export type. Use revenue or utilization', 400);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, getRevenue, getUtilization, getTopCustomers, exportCSV };
