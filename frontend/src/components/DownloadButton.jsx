import { useState } from 'react';
import { downloadDocument } from '../services/documents.js';

export default function DownloadButton({ document }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (isDownloading) return;

    setIsDownloading(true);
    setError('');

    try {
      const blob = await downloadDocument(document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError.message || 'Não foi possível baixar o documento.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <span className="download-action">
      <button
        className="button button-secondary"
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={`Baixar ${document.originalName}`}
      >
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span className="inline-error" role="alert">{error}</span>}
    </span>
  );
}