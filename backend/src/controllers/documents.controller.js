const documentService = require('../services/documents.service');

function requireUser(request, response, next) {
  const userId = request.get('X-User-Id');

  if (!userId || !userId.trim() || userId.length > 128 || /[\u0000-\u001f\u007f]/.test(userId)) {
    return response.status(400).json({
      error: {
        code: 'INVALID_USER_ID',
        message: 'Informe um identificador de usuário válido.',
      },
    });
  }

  request.userId = userId.trim();
  return next();
}

async function upload(request, response, next) {
  if (!request.file) {
    return response.status(400).json({
      error: {
        code: 'FILE_REQUIRED',
        message: 'Selecione um arquivo para enviar.',
      },
    });
  }

  try {
    const document = await documentService.createDocument(request.file, request.userId);
    return response.status(201).json({ document });
  } catch (error) {
    return next(error);
  }
}

async function list(request, response, next) {
  try {
    const documents = await documentService.listDocuments(request.userId);
    return response.status(200).json({ documents });
  } catch (error) {
    return next(error);
  }
}

async function download(request, response, next) {
  const documentIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!documentIdPattern.test(request.params.id)) {
    return response.status(400).json({
      error: {
        code: 'INVALID_DOCUMENT_ID',
        message: 'Identificador do documento inválido.',
      },
    });
  }

  try {
    const { document, filePath } = await documentService.getDocumentForDownload(
      request.params.id,
      request.userId,
    );

    return response.download(filePath, document.originalName, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      },
    }, (error) => {
      if (error) {
        return next(error);
      }
      return undefined;
    });
  } catch (error) {
    return next(error);
  }
}

function handleError(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error.name === 'MulterError') {
    const isFileTooLarge = error.code === 'LIMIT_FILE_SIZE';
    return response.status(isFileTooLarge ? 413 : 400).json({
      error: {
        code: isFileTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
        message: isFileTooLarge
          ? 'O arquivo excede o tamanho máximo permitido.'
          : 'Não foi possível processar o arquivo enviado.',
      },
    });
  }

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const code = statusCode >= 500 ? 'INTERNAL_ERROR' : error.code || 'REQUEST_FAILED';
  const message = statusCode < 500
    ? error.message
    : 'Não foi possível processar a solicitação.';

  return response.status(statusCode).json({ error: { code, message } });
}

module.exports = {
  requireUser,
  upload,
  list,
  download,
  handleError,
};