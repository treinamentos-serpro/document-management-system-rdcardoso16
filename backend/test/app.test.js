const { test } = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-storage-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '32';

const app = require('../src/app');
const controller = require('../src/controllers/documents.controller');
const documentRepository = require('../src/repositories/documents.repository');

after(async () => {
  await fsPromises.rm(storageDirectory, { recursive: true, force: true });
});

async function withServer(callback) {
  const server = app.listen(0);
  const listening = new Promise((resolve) => server.once('listening', resolve));
  await listening;

  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function createUploadForm(contents, filename = 'document.txt') {
  const form = new FormData();
  form.append('file', new Blob([contents], { type: 'text/plain' }), filename);
  return form;
}

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download funcionam e isolam documentos por usuário', async () => {
  await withServer(async (baseUrl) => {
    const ownerHeaders = { 'X-User-Id': 'test-owner' };
    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: ownerHeaders,
      body: createUploadForm('conteudo de teste'),
    });

    assert.equal(uploadResponse.status, 201);
    const { document } = await uploadResponse.json();
    assert.equal(document.originalName, 'document.txt');
    assert.equal('storageName' in document, false);

    const listResponse = await fetch(`${baseUrl}/documents`, { headers: ownerHeaders });
    assert.equal(listResponse.status, 200);
    assert.deepEqual((await listResponse.json()).documents.map(({ id }) => id), [document.id]);

    const otherUserResponse = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'another-user' },
    });
    assert.deepEqual((await otherUserResponse.json()).documents, []);

    const downloadResponse = await fetch(
      `${baseUrl}/documents/${document.id}/download`,
      { headers: ownerHeaders },
    );
    assert.equal(downloadResponse.status, 200);
    assert.equal(downloadResponse.headers.get('content-type'), 'application/octet-stream');
    assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
    assert.equal(await downloadResponse.text(), 'conteudo de teste');

      const otherUserDownload = await fetch(
        `${baseUrl}/documents/${document.id}/download`,
        { headers: { 'X-User-Id': 'another-user' } },
      );
      assert.equal(otherUserDownload.status, 404);
      assert.equal((await otherUserDownload.json()).error.code, 'DOCUMENT_NOT_FOUND');
  });
});

test('rejeita usuário ausente e identificador de documento inválido', async () => {
  await withServer(async (baseUrl) => {
    const missingUserResponse = await fetch(`${baseUrl}/documents`);
    assert.equal(missingUserResponse.status, 400);
    assert.equal((await missingUserResponse.json()).error.code, 'INVALID_USER_ID');

    const invalidIdResponse = await fetch(`${baseUrl}/documents/not-a-uuid/download`, {
      headers: { 'X-User-Id': 'test-owner' },
    });
    assert.equal(invalidIdResponse.status, 400);
    assert.equal((await invalidIdResponse.json()).error.code, 'INVALID_DOCUMENT_ID');
  });
});

test('rejeita upload ausente e arquivo acima do limite configurado', async () => {
  await withServer(async (baseUrl) => {
    const headers = { 'X-User-Id': 'upload-validation-user' };
    const missingFileResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers,
    });
    assert.equal(missingFileResponse.status, 400);
    assert.equal((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

    const oversizedResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers,
      body: createUploadForm('x'.repeat(33)),
    });
    assert.equal(oversizedResponse.status, 413);
    assert.equal((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');
  });
});

test('rejeita nomes internos fora do formato UUID e não expõe erros internos', () => {
  for (const storageName of ['.', '..', '../../etc/passwd', 'document.txt']) {
    assert.throws(() => documentRepository.getStoredFilePath(storageName));
  }

  let responseBody;
  const response = {
    headersSent: false,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  controller.handleError(
    Object.assign(new Error('/private/storage path'), { code: 'EACCES' }),
    {},
    response,
    () => assert.fail('não deve delegar erros antes do envio dos headers'),
  );

  assert.equal(response.statusCode, 500);
  assert.equal(responseBody.error.code, 'INTERNAL_ERROR');
  assert.equal(responseBody.error.message.includes('private'), false);
});

test('limita uploads repetidos e retorna erro 429 no contrato JSON', async () => {
  await withServer(async (baseUrl) => {
    let rateLimitBody;

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const response = await fetch(`${baseUrl}/upload`, { method: 'POST' });
      const body = await response.json();

      if (response.status === 429) {
        rateLimitBody = body;
        break;
      }
    }

    assert.deepEqual(rateLimitBody, {
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas tentativas de envio. Tente novamente mais tarde.',
      },
    });
  });
});
