DROP DATABASE IF EXISTS cybercafe;
CREATE DATABASE cybercafe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cybercafe;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(120) NULL,
  id_proof_type VARCHAR(30) NULL,
  id_proof_no VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE stations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  type ENUM('PC','Gaming','Cabin') NOT NULL DEFAULT 'PC',
  hourly_rate DECIMAL(8,2) NOT NULL,
  status ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available'
) ENGINE=InnoDB;

CREATE TABLE sessions (
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
) ENGINE=InnoDB;

CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  price DECIMAL(8,2) NOT NULL,
  stock_qty INT NULL,                       -- NULL means stock is not tracked
  low_stock_threshold INT NOT NULL DEFAULT 5,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE session_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  service_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(8,2) NOT NULL,         -- price copied at time of adding
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
) ENGINE=InnoDB;

CREATE TABLE bills (
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
) ENGINE=InnoDB;

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  mode ENUM('cash','upi','card') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id)
) ENGINE=InnoDB;

CREATE TABLE settings (
  key_name VARCHAR(50) PRIMARY KEY,
  value VARCHAR(100) NOT NULL
) ENGINE=InnoDB;
