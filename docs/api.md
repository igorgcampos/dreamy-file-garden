# Referência da API

API REST do CloudStorage para operações de gerenciamento de arquivos com integração ao Google Cloud Storage.

## URL Base
- **Desenvolvimento**: `http://localhost:3001`
- **Produção**: Definida via variável de ambiente `PUBLIC_URL`

## Autenticação
Atualmente não é necessária autenticação. Todos os endpoints são publicamente acessíveis.

## Endpoints

### Listar Arquivos
Obter todos os arquivos do bucket de armazenamento.

**Endpoint**: `GET /files`

**Resposta**: `200 OK`
```json
[
  {
    "id": "uuid_filename.jpg",
    "name": "filename.jpg", 
    "size": 2048576,
    "type": "image/jpeg",
    "uploadDate": "2024-01-15T10:30:00.000Z",
    "url": "http://localhost:3001/files/uuid_filename.jpg"
  }
]
```

**Exemplo**:
```bash
curl http://localhost:3001/files
```

### Upload de Arquivo
Fazer upload de um arquivo para o bucket de armazenamento.

**Endpoint**: `POST /upload`

**Content-Type**: `multipart/form-data`

**Campos do Formulário**:
- `file` (obrigatório): O arquivo para upload
- `description` (opcional): Descrição do arquivo

**Resposta**: `200 OK`
```json
{
  "id": "uuid_filename.jpg",
  "name": "filename.jpg",
  "size": 2048576,
  "type": "image/jpeg", 
  "uploadDate": "2024-01-15T10:30:00.000Z",
  "url": "http://localhost:3001/files/uuid_filename.jpg",
  "description": "My vacation photo"
}
```

**Exemplo**:
```bash
curl -X POST \
  -F "file=@/path/to/file.jpg" \
  -F "description=My vacation photo" \
  http://localhost:3001/upload
```

### Download de Arquivo
Fazer download de um arquivo do bucket de armazenamento.

**Endpoint**: `GET /files/:id`

**Parâmetros**:
- `id`: Identificador do arquivo (URL encoded)

**Resposta**: Dados binários do arquivo com headers apropriados
- `Content-Disposition: attachment; filename="original_filename.ext"`
- Content-Type corresponde ao tipo original do arquivo

**Exemplo**:
```bash
curl -O http://localhost:3001/files/uuid_filename.jpg
```

### Excluir Arquivo
Remover um arquivo do bucket de armazenamento.

**Endpoint**: `DELETE /files/:id`

**Parâmetros**:
- `id`: Identificador do arquivo (URL encoded)

**Resposta**: `200 OK`
```json
{
  "success": true
}
```

**Exemplo**:
```bash
curl -X DELETE http://localhost:3001/files/uuid_filename.jpg
```

## Respostas de Erro

Todos os endpoints retornam formato de erro consistente:

**Resposta**: `4xx` ou `5xx`
```json
{
  "error": "Error description"
}
```

### Erros Comuns

| Status | Erro | Descrição |
|--------|-------|-------------|
| 400 | No file uploaded | Endpoint de upload chamado sem arquivo |
| 404 | File not found | Arquivo não existe no armazenamento |
| 500 | GCS error | Operação do Google Cloud Storage falhou |

## Convenção de Nomenclatura de Arquivos
Arquivos são armazenados com prefixos UUID para evitar conflitos de nomenclatura:
- Original: `document.pdf`  
- Armazenado como: `f47ac10b-58cc-4372-a567-0e02b2c3d479_document.pdf`

## Limites de Tamanho de Arquivo
- Tamanho máximo de arquivo: **500MB** por arquivo
- Sem limite no armazenamento total (sujeito aos limites do bucket GCS)

## Tipos de Arquivo Suportados
Todos os tipos de arquivo são suportados. Tipos MIME comuns são preservados:
- Imagens: `image/jpeg`, `image/png`, `image/gif`, etc.
- Documentos: `application/pdf`, `text/plain`, etc.
- Vídeo: `video/mp4`, `video/webm`, etc.
- Áudio: `audio/mpeg`, `audio/wav`, etc.

## Limitação de Taxa
Atualmente não há limitação de taxa implementada.

## Configuração CORS
CORS está habilitado para todas as origens em desenvolvimento. Configure adequadamente para produção.