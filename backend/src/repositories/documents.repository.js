const fs = require('node:fs/promises');
const path = require('node:path');

const documents = new Map();
const storageDirectory = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(__dirname, '../../storage');

async function save(document) {
  documents.set(document.id, { ...document });
}

async function findByOwner(owner) {
  return Array.from(documents.values())
    .filter((document) => document.owner === owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map((document) => ({ ...document }));
}

async function findById(id) {
  const document = documents.get(id);
  return document ? { ...document } : null;
}

function getStoredFilePath(storageName) {
  if (!storageName || path.basename(storageName) !== storageName) {
    throw new Error('Nome interno de arquivo inválido.');
  }

  return path.join(storageDirectory, storageName);
}

async function removeStoredFile(storageName) {
  await fs.unlink(getStoredFilePath(storageName));
}

module.exports = {
  save,
  findByOwner,
  findById,
  getStoredFilePath,
  removeStoredFile,
};