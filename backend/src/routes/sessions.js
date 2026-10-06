'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken } = require('../middleware/auth');
const {
  startSession, getActiveSessions, addService, removeService, endSession, listSessions
} = require('../controllers/sessionsController');

router.use(verifyToken);

router.get('/active', getActiveSessions);

router.post(
  '/',
  [
    body('customer_id').isInt({ min: 1 }).withMessage('customer_id must be a positive integer'),
    body('station_id').isInt({ min: 1 }).withMessage('station_id must be a positive integer'),
  ],
  validate,
  startSession
);

router.get('/', listSessions);

router.post(
  '/:id/services',
  [
    body('service_id').isInt({ min: 1 }).withMessage('service_id must be a positive integer'),
    body('quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1'),
  ],
  validate,
  addService
);

router.delete('/:id/services/:rowId', removeService);

router.post(
  '/:id/end',
  [
    body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be a non-negative number'),
  ],
  validate,
  endSession
);

module.exports = router;
