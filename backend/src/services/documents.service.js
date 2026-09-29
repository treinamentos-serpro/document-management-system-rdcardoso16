const crypto = require('node:crypto');
const documentRepository = require('../repositories/documents.repository');

function createServiceError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function createDocumentNotFoundError() {
  return createServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
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
    throw createDocumentNotFoundError();
  }

  const filePath = documentRepository.getStoredFilePath(document.storageName);
  if (!(await documentRepository.storedFileExists(document.storageName))) {
    throw createDocumentNotFoundError();
  }

  return { document: toPublicDocument(document), filePath };
}

module.exports = {
  createDocument,
  listDocuments,
  getDocumentForDownload,
};