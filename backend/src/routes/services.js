'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  listServices, createService, updateService, deleteService
} = require('../controllers/servicesController');

router.use(verifyToken);

router.get('/', listServices);

router.post(
  '/',
  requireRole('admin'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('stock_qty').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Stock qty must be a non-negative integer'),
    body('low_stock_threshold').optional().isInt({ min: 0 }).withMessage('Threshold must be a non-negative integer'),
  ],
  validate,
  createService
);

router.put(
  '/:id',
  requireRole('admin'),
  [
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('stock_qty').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Stock qty must be a non-negative integer'),
    body('low_stock_threshold').optional().isInt({ min: 0 }).withMessage('Threshold must be a non-negative integer'),
  ],
  validate,
  updateService
);

router.delete('/:id', requireRole('admin'), deleteService);

module.exports = router;
