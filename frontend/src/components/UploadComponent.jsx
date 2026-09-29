import { useState } from 'react';
import { uploadDocument } from '../services/documents.js';

export default function UploadComponent({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) return;
    const form = event.currentTarget;

    setIsUploading(true);
    setMessage('');
    setError('');

    try {
      await uploadDocument(file);
      setFile(null);
      form.reset();
      setMessage('Documento enviado.');
      await onUploaded?.();
    } catch (uploadError) {
      setError(uploadError.message || 'Não foi possível enviar o documento.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="file-picker" htmlFor="document-file">
        <span className="file-picker-label">Arquivo</span>
        <input
          id="document-file"
          name="file"
          type="file"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setMessage('');
            setError('');
          }}
          disabled={isUploading}
        />
      </label>
      <button className="button button-primary" type="submit" disabled={!file || isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
      {message && <p className="form-message" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}