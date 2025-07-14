# Interface web moderna para gerenciar arquivos no google cloud storage 

Aplicação fullstack para upload, listagem, download e exclusão de arquivos na nuvem (Google Cloud Storage).

## Estrutura
- **Frontend:** React + Vite (porta 80)
- **Backend:** Node.js + Express + Google Cloud Storage (porta 3001)

## Pré-requisitos
- [Docker](https://www.docker.com/get-started/)
- [Google Cloud Service Account Key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)

## Configuração

1. **Crie um arquivo `.env` em `backend/` baseado em `.env.example`**
   - Coloque o arquivo de chave do Google (`keyfile.json`) em `backend/`.

2. **Build e start com Docker Compose:**
   ```sh
   docker-compose up --build
   ```
   - Frontend: http://localhost
   - Backend: http://localhost:3001

## Variáveis de ambiente do backend
- `GCP_PROJECT`: ID do projeto Google Cloud
- `GCP_BUCKET`: Nome do bucket
- `GCP_KEYFILE`: Caminho do arquivo de chave de serviço (dentro do container)
- `PUBLIC_URL`: URL pública do backend
- `PORT`: Porta do backend (padrão: 3001)

## Estrutura dos containers
- **dreamy-frontend**: Servidor nginx servindo o build do Vite
- **dreamy-backend**: API Express conectada ao Google Cloud Storage

## Endpoints do backend
- `GET /files` — Lista arquivos
- `POST /upload` — Upload de arquivo (campo: `file`, multipart/form-data)
- `GET /files/:id` — Download
- `DELETE /files/:id` — Excluir

## Observações
- O frontend espera que o backend esteja acessível em `/files` e `/upload` (ajuste o CORS se necessário).
- O backend precisa do arquivo de chave de serviço do Google Cloud para funcionar.

---
