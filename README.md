# Interface web moderna para gerenciar arquivos no google cloud storage 

Aplicação fullstack para upload, listagem, download e exclusão de arquivos na nuvem (Google Cloud Storage).

## Estrutura
- **Frontend:** React + Vite (porta 80)
- **Backend:** Node.js + Express + Google Cloud Storage (porta 3001)

## Pré-requisitos
- [Docker](https://www.docker.com/get-started/)
- [Google Cloud Service Account Key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)

## Configuração

1. **Configuração inicial para cada desenvolvedor:**
   - Copie o arquivo `backend/.env.example` para `backend/.env` e preencha com os dados do seu projeto Google Cloud.
   - Solicite o arquivo de chave de serviço do Google Cloud (`keyfile.json`) ao responsável pelo projeto ou gere conforme a documentação do Google.
   - Coloque o arquivo `keyfile.json` dentro da pasta `backend/`.
   - **Atenção:** Tanto o `.env` quanto o `keyfile.json` são arquivos sensíveis e não devem ser enviados ao repositório. Eles já estão protegidos pelo `.gitignore`.

2. **Build e start com Docker Compose:**
   
   docker-compose up --build
   
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
