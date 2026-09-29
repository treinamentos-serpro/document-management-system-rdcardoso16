# Especificação — Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web para que usuários enviem documentos, consultem os próprios arquivos e façam download deles, com arquivos armazenados localmente e metadados mantidos em memória nesta fase.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição.
- Listagem dos documentos pertencentes ao usuário atual.
- Download de um documento pelo identificador.
- Identificação simples do usuário para separar documentos entre usuários.
- Armazenamento dos arquivos no filesystem local, em `backend/storage` por padrão.
- Interface web para upload, listagem e download.
- Tratamento de estados de carregamento, lista vazia e erros.

### Fora do escopo

- Autenticação e autorização de produção.
- Persistência durável de metadados ou banco de dados.
- Armazenamento externo, em nuvem ou serviço de terceiros.
- Versionamento, edição, exclusão ou compartilhamento de documentos.
- Busca avançada, pastas e permissões por documento.
- Varredura antivírus e conversão de arquivos.

## 3. Premissas e identidade do usuário

Nesta versão, a API recebe o identificador do usuário no cabeçalho `X-User-Id`. O frontend gera um identificador local persistido no navegador e o envia nas chamadas à API.

Esse mecanismo serve apenas para separar dados na versão inicial. Como o valor pode ser falsificado pelo cliente, ele não equivale a autenticação e não deve ser considerado uma barreira de segurança para produção. Uma futura integração com autenticação deverá obter o proprietário da identidade validada pelo servidor, sem confiar em um identificador arbitrário enviado pelo cliente.

## 4. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um único arquivo usando `multipart/form-data`, no campo `file`. |
| RF-02 | O sistema atribui um identificador único ao documento e registra seus metadados após o arquivo ser gravado com sucesso. |
| RF-03 | O usuário pode listar os documentos associados ao seu `X-User-Id`. |
| RF-04 | A listagem apresenta os documentos do mais recente para o mais antigo. |
| RF-05 | O usuário pode baixar um documento pelo identificador, desde que ele pertença ao usuário atual. |
| RF-06 | Documento inexistente ou pertencente a outro usuário resulta em `404`, sem revelar se o identificador existe. |
| RF-07 | Requisições sem arquivo, sem identificador de usuário válido ou com arquivo acima do limite são rejeitadas com erro apropriado. |
| RF-08 | A interface permite selecionar e enviar um arquivo, visualizar a lista e iniciar o download de um item. |
| RF-09 | A interface informa os estados de carregamento, lista vazia e falha de operação em linguagem clara. |

## 5. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os uploads usam `multer` com `diskStorage` e gravam somente no filesystem local. |
| RNF-02 | O diretório padrão de armazenamento é `backend/storage`; ele pode ser configurado por variável de ambiente. |
| RNF-03 | Os metadados são mantidos em memória e não sobrevivem ao reinício do processo nesta fase. |
| RNF-04 | Configurações operacionais são obtidas de variáveis de ambiente, conforme o princípio 12-Factor. |
| RNF-05 | O nome original não é usado como caminho físico. O nome físico é gerado pelo servidor. |
| RNF-06 | O download é enviado como anexo, sem renderizar conteúdo enviado pelo usuário na página da aplicação. |
| RNF-07 | O fluxo do backend segue `routes -> controllers -> services -> repositories`. |
| RNF-08 | O backend usa JavaScript CommonJS e `node:test`; o frontend segue React, Vite e ESM. |
| RNF-09 | Falhas de leitura, escrita e upload são tratadas nos limites do sistema sem expor detalhes internos. |

### Limite de upload

O limite padrão por arquivo é `10 MiB` (`10485760` bytes), configurável por `MAX_FILE_SIZE_BYTES`. Não há lista de tipos permitidos nesta fase; o MIME informado pelo cliente não deve ser tratado como confiável.

## 6. Modelo de dados

### Metadados do documento

| Campo | Tipo | Visibilidade | Descrição |
| --- | --- | --- | --- |
| `id` | string | Público | Identificador único gerado pelo servidor, UUID v4. |
| `originalName` | string | Público | Nome original informado pelo cliente, usado para exibição e download. |
| `size` | number | Público | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Público | Data e hora do upload em ISO 8601, UTC. |
| `owner` | string | Público | Identificador recebido em `X-User-Id`. |
| `storageName` | string | Interno | Nome gerado pelo servidor para localizar o arquivo no diretório local. |
| `mimeType` | string | Interno | Tipo de mídia informado pelo upload, usado no download com fallback seguro. |

Os campos internos `storageName` e `mimeType` não são retornados nas respostas de listagem ou upload. Caminhos absolutos do filesystem nunca são expostos pela API. Os metadados ficam em uma estrutura em memória no repositório; as consultas de listagem filtram por `owner`.

Após reiniciar o backend, os metadados são perdidos, embora os arquivos possam permanecer no diretório local. Esses arquivos tornam-se inacessíveis pela API e não são removidos automaticamente nesta fase. A aplicação deve operar em uma única instância enquanto os metadados permanecerem em memória.

## 7. Contratos de API

As rotas do backend são descritas sem prefixo. O frontend as chama com `/api`, encaminhado pelo proxy do Vite. Todas as rotas de documentos exigem um `X-User-Id` não vazio, com até 128 caracteres.

### Formato de erro

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Selecione um arquivo para enviar."
  }
}
```

O código é estável para tratamento no cliente. A mensagem é destinada à interface e não deve conter caminhos locais, stack traces ou detalhes internos.

### `POST /upload`

Envia um documento com `Content-Type: multipart/form-data`, cabeçalho `X-User-Id` e campo `file` contendo um arquivo.

**Sucesso — `201 Created`**

```json
{
  "document": {
    "id": "uuid",
    "originalName": "relatorio.pdf",
    "size": 12345,
    "uploadedAt": "2026-09-29T12:00:00.000Z",
    "owner": "usuario-123"
  }
}
```

**Erros:** `400 FILE_REQUIRED`, `400 INVALID_UPLOAD`, `400 INVALID_USER_ID`, `413 FILE_TOO_LARGE` ou `500 INTERNAL_ERROR`. Os metadados só são registrados após a gravação do arquivo; se o registro falhar, o arquivo deve ser removido.

### `GET /documents`

Lista os documentos do usuário indicado em `X-User-Id`.

**Sucesso — `200 OK`**

```json
{
  "documents": [
    {
      "id": "uuid",
      "originalName": "relatorio.pdf",
      "size": 12345,
      "uploadedAt": "2026-09-29T12:00:00.000Z",
      "owner": "usuario-123"
    }
  ]
}
```

Sem documentos, retornar `200 OK` com `documents: []`. Erros: `400 INVALID_USER_ID` ou `500 INTERNAL_ERROR`.

### `GET /documents/:id/download`

Baixa o documento indicado, se pertencer ao usuário de `X-User-Id`. No sucesso (`200 OK`), o corpo é binário e a resposta usa `Content-Disposition: attachment`, `Content-Type` correspondente ao tipo armazenado (ou `application/octet-stream`) e `Content-Length` quando disponível.

Erros: `400 INVALID_DOCUMENT_ID`, `400 INVALID_USER_ID`, `404 DOCUMENT_NOT_FOUND` para documento ausente, alheio ou arquivo indisponível, ou `500 INTERNAL_ERROR` para falha inesperada de leitura.

## 8. Configuração

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local usado para gravar os arquivos. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Tamanho máximo permitido por upload, em bytes. |

Caminhos relativos de `STORAGE_DIR` são resolvidos em relação ao diretório de execução. O backend cria o diretório quando necessário.

## 9. Decisões arquiteturais

- `routes` definem endpoints, configuram o middleware de upload e delegam aos controllers.
- Controllers fazem validação HTTP, traduzem entradas e formatam respostas.
- Services concentram regras de negócio, incluindo propriedade e fluxo de upload/download.
- Repositories encapsulam os metadados em memória e a localização dos arquivos locais.
- `multer` com `diskStorage` grava uploads no filesystem local; o nome físico é gerado pelo servidor.
- A API não depende de provedores externos. O frontend usa `fetch` e o prefixo `/api`.
- Respostas públicas expõem apenas os metadados necessários à interface.

## 10. Plano de execução

Etapas de implementação e critérios de aceite. O mapeamento de arquivos específicos deve ser feito quando cada etapa for iniciada.

1. **Validar decisões e configuração**
   - Confirmar `X-User-Id` temporário, limite padrão e comportamento para arquivos sem tipo permitido.
   - Aceite: decisões registradas e variáveis de ambiente definidas para upload local.
2. **Implementar o fluxo de upload**
   - Preparar gravação local, validação do arquivo e registro de metadados em memória.
   - Aceite: upload válido retorna `201`; arquivo ausente, excessivo ou falha de escrita retorna o erro correspondente; falha não deixa metadados de sucesso.
3. **Implementar listagem e download**
   - Filtrar documentos pelo usuário e servir o arquivo como anexo.
   - Aceite: listagem contém apenas documentos do usuário; download funciona para o proprietário; ID alheio ou inexistente retorna `404`.
4. **Integrar a interface**
   - Conectar formulário de upload, lista, identificação simples do usuário e ação de download à API via `/api`.
   - Aceite: estados de carregamento, lista vazia, sucesso e erro são apresentados; é possível completar o fluxo de upload até download.
5. **Verificar o fluxo integrado e documentar limitações**
   - Cobrir regras principais com testes e revisar o comportamento após reinício do processo.
   - Aceite: testes cobrem validação, isolamento por usuário, listagem, download e erros; a limitação dos metadados em memória está documentada.

## 11. Riscos e limitações

- `X-User-Id` não autentica o usuário e pode ser falsificado; não é adequado para produção sem autenticação real.
- Reiniciar o processo apaga os metadados em memória, podendo deixar arquivos órfãos no diretório local.
- Múltiplas instâncias não compartilham os metadados e podem apresentar resultados diferentes.
- Não há validação do conteúdo nem varredura antivírus; o MIME fornecido pelo cliente pode ser falso.
- O armazenamento local depende do espaço disponível e das permissões do ambiente do backend.