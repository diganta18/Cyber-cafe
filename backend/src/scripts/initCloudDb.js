'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'defaultdb',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

const tables = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(120) NULL,
    id_proof_type VARCHAR(30) NULL,
    id_proof_no VARCHAR(50) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    type ENUM('PC','Gaming','Cabin') NOT NULL DEFAULT 'PC',
    hourly_rate DECIMAL(8,2) NOT NULL,
    status ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available'
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    station_id INT NOT NULL,
    staff_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    status ENUM('active','completed') NOT NULL DEFAULT 'active',
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (station_id) REFERENCES stations(id),
    FOREIGN KEY (staff_id) REFERENCES users(id),
    INDEX idx_sessions_status (status),
    INDEX idx_sessions_start (start_time)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    price DECIMAL(8,2) NOT NULL,
    stock_qty INT NULL,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    is_active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS session_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(8,2) NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_no VARCHAR(25) NOT NULL UNIQUE,
    session_id INT NOT NULL UNIQUE,
    time_charge DECIMAL(10,2) NOT NULL,
    service_charge DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('unpaid','paid','void') NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    INDEX idx_bills_created (created_at)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    mode ENUM('cash','upi','card') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS settings (
    key_name VARCHAR(50) PRIMARY KEY,
    value VARCHAR(100) NOT NULL
  ) ENGINE=InnoDB;`
];

async function init() {
  console.log('[init] Connecting to Aiven MySQL...');
  const conn = await mysql.createConnection(dbConfig);
  try {
    console.log('[init] Creating tables...');
    for (const ddl of tables) {
      await conn.query(ddl);
    }
    console.log('[init] Tables successfully created!');

    // Check if admin user exists
    const [existingUsers] = await conn.query('SELECT id FROM users WHERE username = ?', ['admin']);
    if (existingUsers.length === 0) {
      console.log('[init] Seeding default admin and staff users...');
      const adminHash = await bcrypt.hash('admin123', 10);
      const staffHash = await bcrypt.hash('staff123', 10);
      await conn.query(
        "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'admin'), (?, ?, ?, 'staff')",
        ['Admin', 'admin', adminHash, 'Counter Staff', 'staff1', staffHash]
      );

      console.log('[init] Seeding default stations...');
      await conn.query(`
        INSERT INTO stations (name, type, hourly_rate, status) VALUES
        ('PC-01',   'PC',     30.00, 'available'),
        ('PC-02',   'PC',     30.00, 'available'),
        ('PC-03',   'PC',     30.00, 'available'),
        ('PC-04',   'PC',     30.00, 'available'),
        ('GAME-01', 'Gaming', 60.00, 'available'),
        ('GAME-02', 'Gaming', 60.00, 'available')
      `);

      console.log('[init] Seeding default services...');
      await conn.query(`
        INSERT INTO services (name, price, stock_qty, low_stock_threshold, is_active) VALUES
        ('Print B/W (per page)',    2.00,  NULL, 5, 1),
        ('Print Color (per page)', 10.00, NULL, 5, 1),
        ('Scan (per page)',         5.00,  NULL, 5, 1),
        ('Tea',                    10.00,   50,  5, 1),
        ('Water Bottle',           20.00,   30, 10, 1)
      `);

      console.log('[init] Seeding settings...');
      await conn.query(`
        INSERT IGNORE INTO settings (key_name, value) VALUES
        ('billing_block_minutes', '15'),
        ('currency', 'INR')
      `);
      console.log('[init] Initial data seeded successfully!');
    } else {
      console.log('[init] Users already exist, skipping seed to preserve data.');
    }

    const [allTables] = await conn.query('SHOW TABLES;');
    console.log('[init] Verified tables:', allTables.map(r => Object.values(r)[0]));
  } finally {
    await conn.end();
  }
}

init().catch(err => {
  console.error('[init] Error:', err);
  process.exit(1);
});
