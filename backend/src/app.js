'use strict';
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const stationsRouter = require('./routes/stations');
const servicesRouter = require('./routes/services');
const sessionsRouter = require('./routes/sessions');
const billsRouter = require('./routes/bills');
const reportsRouter = require('./routes/reports');

const app = express();

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
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

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
