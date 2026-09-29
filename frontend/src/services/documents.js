const API_PREFIX = '/api';
const USER_ID_STORAGE_KEY = 'dms-user-id';

function getUserId() {
  let userId = window.localStorage.getItem(USER_ID_STORAGE_KEY);

  if (!userId) {
    userId = crypto.randomUUID();
    window.localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  }

  return userId;
}

async function fetchApi(path, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers: {
      'X-User-Id': getUserId(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = 'Não foi possível concluir a solicitação.';
    try {
      const body = await response.json();
      message = body.error?.message || message;
    } catch {
      // Mantém a mensagem padrão quando a resposta não contém JSON.
    }
    throw new Error(message);
  }

  return response;
}

export async function listDocuments() {
  const response = await fetchApi('/documents');
  const body = await response.json();
  return body.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetchApi('/upload', {
    method: 'POST',
    body: formData,
  });
  const body = await response.json();
  return body.document;
}

export async function downloadDocument(documentId) {
  const response = await fetchApi(`/documents/${encodeURIComponent(documentId)}/download`);
  return response.blob();
}