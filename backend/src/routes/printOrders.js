'use strict';
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { verifyToken, optionalToken } = require('../middleware/auth');
const {
  createPrintOrder,
  listPrintOrders,
  downloadPrintOrderFile,
  updatePrintOrderStatus,
  trackPrintOrder,
} = require('../controllers/printOrdersController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/printouts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|png|jpg|jpeg|txt|xlsx|xls|ppt|pptx/i;
    const ext = path.extname(file.originalname).slice(1);
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload a PDF, Word document, Excel, PowerPoint, or image.'));
    }
  },
});

// Public endpoints
router.post('/', upload.single('file'), optionalToken, createPrintOrder);
router.get('/track', trackPrintOrder);

// Staff endpoints
router.get('/', verifyToken, listPrintOrders);
router.get('/:id/download', verifyToken, downloadPrintOrderFile);
router.patch('/:id/status', verifyToken, updatePrintOrderStatus);

module.exports = router;

