-- Cyber Café Database Schema
-- Generated from controller analysis

USE cybercafe;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  username      VARCHAR(50)   NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  phone          VARCHAR(20),
  email          VARCHAR(100),
  id_proof_type  VARCHAR(50),
  id_proof_no    VARCHAR(100),
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stations (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL,
  type        ENUM('PC','Gaming') NOT NULL DEFAULT 'PC',
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status      ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available'
);

CREATE TABLE IF NOT EXISTS services (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  name                 VARCHAR(100)  NOT NULL,
  price                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock_qty            INT           DEFAULT NULL,
  low_stock_threshold  INT           NOT NULL DEFAULT 5,
  is_active            TINYINT(1)    NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sessions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT  NOT NULL,
  station_id  INT  NOT NULL,
  staff_id    INT  NOT NULL,
  start_time  DATETIME NOT NULL,
  end_time    DATETIME DEFAULT NULL,
  status      ENUM('active','completed') NOT NULL DEFAULT 'active',
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (station_id)  REFERENCES stations(id),
  FOREIGN KEY (staff_id)    REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS session_services (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT           NOT NULL,
  service_id INT           NOT NULL,
  quantity   INT           NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS bills (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  bill_no        VARCHAR(30)   NOT NULL UNIQUE,
  session_id     INT           NOT NULL,
  time_charge    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  service_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status         ENUM('unpaid','paid','void') NOT NULL DEFAULT 'unpaid',
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT           NOT NULL,
  mode    VARCHAR(50)   NOT NULL DEFAULT 'cash',
  amount  DECIMAL(10,2) NOT NULL,
  paid_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id)
);

CREATE TABLE IF NOT EXISTS settings (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  key_name  VARCHAR(100) NOT NULL UNIQUE,
  value     VARCHAR(255) NOT NULL
);
