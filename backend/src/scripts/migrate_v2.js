'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'defaultdb',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

async function migrate() {
  console.log('[migrate_v2] Connecting to Database...');
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log('[migrate_v2] Checking columns in bills table...');
    const [cols] = await conn.query('SHOW COLUMNS FROM bills');
    const colNames = cols.map(c => c.Field);

    // 1. Modify session_id to be NULLABLE
    console.log('[migrate_v2] Ensuring session_id in bills is NULLABLE...');
    await conn.query('ALTER TABLE bills MODIFY session_id INT NULL');

    // 2. Add customer_id if not present
    if (!colNames.includes('customer_id')) {
      console.log('[migrate_v2] Adding customer_id to bills table...');
      await conn.query('ALTER TABLE bills ADD COLUMN customer_id INT NULL AFTER session_id');
      await conn.query('ALTER TABLE bills ADD CONSTRAINT fk_bills_customer FOREIGN KEY (customer_id) REFERENCES customers(id)');
    }

    // 3. Add order_type if not present
    if (!colNames.includes('order_type')) {
      console.log('[migrate_v2] Adding order_type to bills table...');
      await conn.query("ALTER TABLE bills ADD COLUMN order_type ENUM('session', 'counter', 'remote_print') NOT NULL DEFAULT 'session' AFTER bill_no");
    }

    // 4. Create bill_items table
    console.log('[migrate_v2] Creating bill_items table if not exists...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        service_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id)
      ) ENGINE=InnoDB;
    `);

    // 5. Create bookings table
    console.log('[migrate_v2] Creating bookings table if not exists...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_code VARCHAR(15) NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        station_id INT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        duration_mins INT NOT NULL DEFAULT 60,
        status ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'pending',
        notes VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (station_id) REFERENCES stations(id),
        INDEX idx_bookings_time (start_time, end_time),
        INDEX idx_bookings_status (status)
      ) ENGINE=InnoDB;
    `);

    // 6. Create print_orders table
    console.log('[migrate_v2] Creating print_orders table if not exists...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS print_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_no VARCHAR(25) NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT NOT NULL,
        color_mode ENUM('bw', 'color') NOT NULL DEFAULT 'bw',
        duplex_mode ENUM('single', 'double') NOT NULL DEFAULT 'single',
        copies INT NOT NULL DEFAULT 1,
        page_count INT NOT NULL DEFAULT 1,
        notes TEXT NULL,
        estimated_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        status ENUM('pending', 'printing', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
        bill_id INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (bill_id) REFERENCES bills(id),
        INDEX idx_print_status (status)
      ) ENGINE=InnoDB;
    `);

    // 7. Check if a walk-in guest customer exists, if not create one
    const [walkIn] = await conn.query("SELECT id FROM customers WHERE phone = '9999999999' OR name = 'Walk-in Guest'");
    if (walkIn.length === 0) {
      console.log('[migrate_v2] Creating default Walk-in Guest customer...');
      await conn.query(
        "INSERT INTO customers (name, phone, email, id_proof_type, id_proof_no) VALUES ('Walk-in Guest', '9999999999', 'guest@cybercafe.local', 'Walk-in', 'GUEST-001')"
      );
    }

    console.log('[migrate_v2] Migration completed successfully!');
  } catch (err) {
    console.error('[migrate_v2] Error during migration:', err);
    throw err;
  } finally {
    await conn.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

