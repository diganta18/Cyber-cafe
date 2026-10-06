'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, requireRole } = require('../middleware/auth');
const { listBills, getBill, payBill, voidBill } = require('../controllers/billsController');

router.use(verifyToken);

router.get('/', listBills);
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
