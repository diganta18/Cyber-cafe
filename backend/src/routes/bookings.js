'use strict';
const express = require('express');
const router = express.Router();
const { verifyToken, optionalToken } = require('../middleware/auth');
const {
  listBookings,
  getAvailableSlots,
  createBooking,
  checkinBooking,
  cancelBooking,
  updateBookingStatus,
  trackBooking,
} = require('../controllers/bookingsController');

// Public endpoints for customers / portal
router.get('/available-slots', getAvailableSlots);
router.get('/track', trackBooking);
router.post('/', optionalToken, createBooking);
router.post('/:id/cancel', optionalToken, cancelBooking);

// Staff / Authenticated endpoints
router.get('/', verifyToken, listBookings);
router.post('/:id/checkin', verifyToken, checkinBooking);
router.patch('/:id/status', verifyToken, updateBookingStatus);

module.exports = router;
