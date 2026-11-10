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

// Resilient upload wrapper: catches busboy/multer errors and returns 400 cleanly
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 25 MB.' });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
    }
    next();
  });
}

// Public endpoints
router.post('/', handleUpload, optionalToken, createPrintOrder);
router.get('/track', optionalToken, trackPrintOrder);

// Staff endpoints
router.get('/', verifyToken, listPrintOrders);
router.get('/:id/download', verifyToken, downloadPrintOrderFile);
router.patch('/:id/status', verifyToken, updatePrintOrderStatus);

module.exports = router;

