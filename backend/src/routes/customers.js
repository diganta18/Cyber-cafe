'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken } = require('../middleware/auth');
const {
  listCustomers, createCustomer, getCustomer, updateCustomer, deleteCustomer
} = require('../controllers/customersController');

router.use(verifyToken);

router.get('/', listCustomers);
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be exactly 10 digits'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email format'),
  ],
  validate,
  createCustomer
);
router.get('/:id', getCustomer);
router.put(
  '/:id',
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be exactly 10 digits'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email format'),
  ],
  validate,
  updateCustomer
);
router.delete('/:id', deleteCustomer);

module.exports = router;
