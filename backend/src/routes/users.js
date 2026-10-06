'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, requireRole } = require('../middleware/auth');
const { listUsers, createUser, updateUser, deleteUser } = require('../controllers/usersController');

router.use(verifyToken, requireRole('admin'));

router.get('/', listUsers);

router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('username').notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'staff']).withMessage('Role must be admin or staff'),
  ],
  validate,
  createUser
);

router.put(
  '/:id',
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('role').optional().isIn(['admin', 'staff']).withMessage('Role must be admin or staff'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  updateUser
);

router.delete('/:id', deleteUser);

module.exports = router;
