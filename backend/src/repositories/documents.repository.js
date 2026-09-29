const fs = require('node:fs/promises');
const path = require('node:path');
const { storageDirectory } = require('../config/storage');

const documents = new Map();
const storageNamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (typeof storageName !== 'string' || !storageNamePattern.test(storageName)) {
    throw new Error('Nome interno de arquivo inválido.');
  }

  const resolvedPath = path.resolve(storageDirectory, storageName);
  if (path.dirname(resolvedPath) !== storageDirectory) {
    throw new Error('Nome interno de arquivo inválido.');
  }

  return resolvedPath;
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