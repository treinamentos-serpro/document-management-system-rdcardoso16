import DownloadButton from './DownloadButton.jsx';

function formatFileSize(size) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'unit',
    unit: 'byte',
    unitDisplay: 'narrow',
    maximumFractionDigits: 1,
  }).format(size);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export default function DocumentList({ documents, isLoading, error, onRetry }) {
  if (isLoading) {
    return <p className="list-state" role="status">Carregando documentos...</p>;
  }

  if (error) {
    return (
      <div className="list-state list-error" role="alert">
        <p>{error}</p>
        <button className="button button-secondary" type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return <p className="list-state">Nenhum documento enviado ainda.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="document-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Tamanho</th>
            <th scope="col">Enviado em</th>
            <th scope="col"><span className="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <th scope="row" className="document-name">{document.originalName}</th>
              <td>{formatFileSize(document.size)}</td>
              <td>{formatDate(document.uploadedAt)}</td>
              <td><DownloadButton document={document} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}