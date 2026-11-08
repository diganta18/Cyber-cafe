'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, optionalToken, requireRole } = require('../middleware/auth');
const {
  listStations, createStation, updateStation, patchStationStatus, deleteStation
} = require('../controllers/stationsController');

// Public / Guest accessible station listing
router.get('/', optionalToken, listStations);

// All mutations below require authenticated staff / admin token
router.use(verifyToken);

router.post(
  '/',
  requireRole('admin'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('type').isIn(['PC', 'Gaming', 'Cabin']).withMessage('Type must be PC, Gaming, or Cabin'),
    body('hourly_rate').isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  ],
  validate,
  createStation
);

router.put(
  '/:id',
  requireRole('admin'),
  [
    body('type').optional().isIn(['PC', 'Gaming', 'Cabin']).withMessage('Type must be PC, Gaming, or Cabin'),
    body('hourly_rate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  ],
  validate,
  updateStation
);

router.patch(
  '/:id/status',
  requireRole('admin', 'staff'),
  [
    body('status').isIn(['available', 'maintenance']).withMessage('Status must be available or maintenance'),
  ],
  validate,
  patchStationStatus
);

router.delete('/:id', requireRole('admin'), deleteStation);

module.exports = router;
