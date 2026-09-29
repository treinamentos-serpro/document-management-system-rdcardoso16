const path = require('node:path');

const storageDirectory = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(__dirname, '../../storage');
const configuredMaxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES);
const maxFileSizeBytes = Number.isSafeInteger(configuredMaxFileSize)
  && configuredMaxFileSize > 0
  ? configuredMaxFileSize
  : 10 * 1024 * 1024;

module.exports = {
  storageDirectory,
  maxFileSizeBytes,
};