const crypto = require('node:crypto');
const fs = require('node:fs');
const multer = require('multer');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const documentController = require('../controllers/documents.controller');
const { storageDirectory, maxFileSizeBytes } = require('../config/storage');

const router = express.Router();

const storage = multer.diskStorage({
  destination(request, file, callback) {
    fs.mkdir(storageDirectory, { recursive: true }, (error) => {
      callback(error, storageDirectory);
    });
  },
  filename(request, file, callback) {
    callback(null, crypto.randomUUID());
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes,
    files: 1,
    fields: 0,
    fieldNameSize: 100,
  },
});
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Muitas tentativas de envio. Tente novamente mais tarde.',
    },
  },
});

router.post(
  '/upload',
  uploadRateLimit,
  documentController.requireUser,
  upload.single('file'),
  documentController.upload,
);
router.get('/documents', documentController.requireUser, documentController.list);
router.get('/documents/:id/download', documentController.requireUser, documentController.download);
router.use(documentController.handleError);

module.exports = router;