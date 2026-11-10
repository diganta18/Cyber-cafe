'use strict';
require('dotenv').config({ quiet: true });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const pool = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const stationsRouter = require('./routes/stations');
const servicesRouter = require('./routes/services');
const sessionsRouter = require('./routes/sessions');
const billsRouter = require('./routes/bills');
const reportsRouter = require('./routes/reports');
const bookingsRouter = require('./routes/bookings');
const printOrdersRouter = require('./routes/printOrders');

const app = express();

// Security
app.use(helmet());

// CORS: Safely support credentials without invalid wildcard collision
const configuredOrigin = process.env.CORS_ORIGIN;
const corsOptions = {
  origin: (!configuredOrigin || configuredOrigin === '*')
    ? true // Dynamically reflect request origin so credentials work seamlessly
    : configuredOrigin.includes(',')
      ? configuredOrigin.split(',').map((o) => o.trim())
      : configuredOrigin,
  credentials: true,
};
app.use(cors(corsOptions));

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());

// Health check with active database probe
app.get('/api/health', async (req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - start;
    res.json({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
        latencyMs,
        uptime: Math.round(process.uptime()),
      },
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      data: {
        status: 'degraded',
        database: 'disconnected',
        error: err.message,
      },
    });
  }
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/stations', stationsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/bills', billsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/print-orders', printOrdersRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
