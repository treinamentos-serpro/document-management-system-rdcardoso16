const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const documentRepository = require('../repositories/documents.repository');

function createServiceError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

async function createDocument(file, owner) {
  const document = {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
    mimeType: file.mimetype || 'application/octet-stream',
  };

  try {
    await documentRepository.save(document);
  } catch (error) {
    await documentRepository.removeStoredFile(document.storageName).catch(() => {});
    throw error;
  }

  return toPublicDocument(document);
}

async function listDocuments(owner) {
  const documents = await documentRepository.findByOwner(owner);
  return documents.map(toPublicDocument);
}

async function getDocumentForDownload(id, owner) {
  const document = await documentRepository.findById(id);

  if (!document || document.owner !== owner) {
    throw createServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  const filePath = documentRepository.getStoredFilePath(document.storageName);

  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw createServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }
    throw error;
  }

  return { document: toPublicDocument(document), filePath };
}

module.exports = {
  createDocument,
  listDocuments,
  getDocumentForDownload,
};