const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const express = require('express');
const documentController = require('../controllers/documents.controller');

const router = express.Router();
const storageDirectory = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(__dirname, '../../storage');
const configuredMaxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES);
const maxFileSize = Number.isSafeInteger(configuredMaxFileSize)
  && configuredMaxFileSize > 0
  ? configuredMaxFileSize
  : 10 * 1024 * 1024;

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
  limits: { fileSize: maxFileSize, files: 1 },
});

router.post('/upload', documentController.requireUser, upload.single('file'), documentController.upload);
router.get('/documents', documentController.requireUser, documentController.list);
router.get('/documents/:id/download', documentController.requireUser, documentController.download);
router.use(documentController.handleError);

module.exports = router;