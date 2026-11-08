'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, requireRole } = require('../middleware/auth');
const { listBills, getBill, createCounterBill, payBill, voidBill } = require('../controllers/billsController');

router.use(verifyToken);

router.get('/', listBills);

router.post(
  '/counter',
  [
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    body('items.*.service_id').isInt({ min: 1 }).withMessage('service_id is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1'),
    body('payment_mode').optional({ checkFalsy: true }).isIn(['cash', 'upi', 'card']).withMessage('Payment mode must be cash, upi, or card'),
  ],
  validate,
  createCounterBill
);

router.get('/:id', getBill);

router.post(
  '/:id/pay',
  [
    body('mode').isIn(['cash', 'upi', 'card']).withMessage('Mode must be cash, upi, or card'),
  ],
  validate,
  payBill
);

router.post('/:id/void', requireRole('admin'), voidBill);

module.exports = router;
