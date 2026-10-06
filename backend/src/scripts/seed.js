'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log('[seed] Starting seed...');

    // --- Users ---
    await conn.query('DELETE FROM payments');
    await conn.query('DELETE FROM bills');
    await conn.query('DELETE FROM session_services');
    await conn.query('DELETE FROM sessions');
    await conn.query('DELETE FROM customers');
    await conn.query('DELETE FROM settings');
    await conn.query('DELETE FROM services');
    await conn.query('DELETE FROM stations');
    await conn.query('DELETE FROM users');

    // Reset auto-increments
    await conn.query('ALTER TABLE users AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE customers AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE stations AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE services AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE sessions AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE session_services AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE bills AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE payments AUTO_INCREMENT = 1');

    const adminHash = await bcrypt.hash('admin123', 10);
    const staffHash = await bcrypt.hash('staff123', 10);

    await conn.query(
      "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'admin'), (?, ?, ?, 'staff')",
      ['Admin', 'admin', adminHash, 'Counter Staff', 'staff1', staffHash]
    );
    console.log('[seed] Users created');

    // --- Stations ---
    await conn.query(`
      INSERT INTO stations (name, type, hourly_rate, status) VALUES
      ('PC-01',   'PC',     30.00, 'available'),
      ('PC-02',   'PC',     30.00, 'available'),
      ('PC-03',   'PC',     30.00, 'available'),
      ('PC-04',   'PC',     30.00, 'available'),
      ('GAME-01', 'Gaming', 60.00, 'available'),
      ('GAME-02', 'Gaming', 60.00, 'available')
    `);
    console.log('[seed] Stations created');

    // --- Services ---
    await conn.query(`
      INSERT INTO services (name, price, stock_qty, low_stock_threshold, is_active) VALUES
      ('Print B/W (per page)',    2.00,  NULL, 5, 1),
      ('Print Color (per page)', 10.00, NULL, 5, 1),
      ('Scan (per page)',         5.00,  NULL, 5, 1),
      ('Tea',                    10.00,   50,  5, 1),
      ('Water Bottle',           20.00,   30, 10, 1)
    `);
    console.log('[seed] Services created');

    // --- Customers ---
    await conn.query(`
      INSERT INTO customers (name, phone, email) VALUES
      ('Rahul Sharma',  '9876543210', 'rahul@example.com'),
      ('Priya Patel',   '9123456789', 'priya@example.com'),
      ('Amit Kumar',    '9988776655', 'amit@example.com')
    `);
    console.log('[seed] Customers created');

    // --- Settings ---
    await conn.query(`
      INSERT INTO settings (key_name, value) VALUES
      ('billing_block_minutes', '15'),
      ('currency', 'INR')
    `);
    console.log('[seed] Settings created');

    console.log('[seed] Seed completed successfully!');
    console.log('[seed] Login credentials:');
    console.log('  admin   / admin123  (role: admin)');
    console.log('  staff1  / staff123  (role: staff)');
  } catch (err) {
    console.error('[seed] Error:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

seed();
