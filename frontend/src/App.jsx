import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documents.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  async function refreshDocuments() {
    setIsLoading(true);
    setError('');

    try {
      setDocuments(await listDocuments());
    } catch (loadError) {
      setError(loadError.message || 'Não foi possível carregar os documentos.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshDocuments();
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">DMS / Biblioteca pessoal</p>
        <h1>Meus documentos</h1>
        <p className="page-description">Envie e acesse seus arquivos em um só lugar.</p>
      </header>

      <section className="workspace-section upload-section" aria-labelledby="upload-heading">
        <div className="section-heading">
          <p className="section-index">01</p>
          <div>
            <h2 id="upload-heading">Adicionar documento</h2>
            <p>Selecione um arquivo para armazená-lo na sua biblioteca.</p>
          </div>
        </div>
        <UploadComponent onUploaded={refreshDocuments} />
      </section>

      <section className="workspace-section documents-section" aria-labelledby="documents-heading">
        <div className="section-heading">
          <p className="section-index">02</p>
          <div>
            <h2 id="documents-heading">Arquivos enviados</h2>
            <p>
              {isLoading
                ? 'Atualizando biblioteca...'
                : `${documents.length} ${documents.length === 1 ? 'documento' : 'documentos'}`}
            </p>
          </div>
          <button
            className="refresh-button"
            type="button"
            onClick={refreshDocuments}
            disabled={isLoading}
          >
            Atualizar
          </button>
        </div>
        <DocumentList
          documents={documents}
          isLoading={isLoading}
          error={error}
          onRetry={refreshDocuments}
        />
      </section>
    </main>
  );
}
