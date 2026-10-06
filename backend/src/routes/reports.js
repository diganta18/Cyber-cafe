'use strict';
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getDashboard, getRevenue, getUtilization, getTopCustomers, exportCSV
} = require('../controllers/reportsController');

router.use(verifyToken);

// Dashboard is accessible by admin and staff
router.get('/dashboard', getDashboard);

// All other report routes are admin only
router.get('/revenue', requireRole('admin'), getRevenue);
router.get('/utilization', requireRole('admin'), getUtilization);
router.get('/top-customers', requireRole('admin'), getTopCustomers);
router.get('/export', requireRole('admin'), exportCSV);

module.exports = router;
