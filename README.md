# Interface web moderna para gerenciar arquivos no google cloud storage 

Aplicação fullstack para upload, listagem, download e exclusão de arquivos na nuvem (Google Cloud Storage).

## Passo a passo para deploy/local setup

1. **Clone o repositório:**

   git clone <URL_DO_REPOSITORIO>
   cd dreamy-file-garden
   

2. **Configuração inicial:**
   - Copie o arquivo `backend/.env.example` para `backend/.env` e preencha com os dados do seu projeto Google Cloud.
   - Solicite o arquivo de chave de serviço do Google Cloud (`keyfile.json`) ao responsável pelo projeto ou gere conforme a documentação do Google.
   - Coloque o arquivo `keyfile.json` dentro da pasta `backend/`.
   - **Atenção:** Tanto o `.env` quanto o `keyfile.json` são arquivos sensíveis e não devem ser enviados ao repositório. Eles já estão protegidos pelo `.gitignore`.

3. **Build e start com Docker Compose:**
   
   docker-compose up --build
   
   - Frontend: http://localhost
   - Backend: http://localhost:3001

## Estrutura
- **Frontend:** React + Vite (porta 80)
- **Backend:** Node.js + Express + Google Cloud Storage (porta 3001)
- **Banco de Dados:** MongoDB (porta 27017) - gerencia usuários, autenticação e metadados de arquivos

## Pré-requisitos
- [Docker](https://www.docker.com/get-started/)
- [Google Cloud Service Account Key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)


## Variáveis de ambiente do backend

### Configuração Google Cloud Storage
- `GCP_PROJECT`: ID do projeto Google Cloud
- `GCP_BUCKET`: Nome do bucket
- `GCP_KEYFILE`: Caminho do arquivo de chave de serviço (dentro do container)

### Configuração do Servidor
- `PUBLIC_URL`: URL pública do backend
- `PORT`: Porta do backend (padrão: 3001)
- `MONGODB_URI`: String de conexão MongoDB (para autenticação)

### Configuração JWT (Sistema de Autenticação)
- `JWT_SECRET`: Chave secreta para tokens de acesso - **OBRIGATÓRIO em produção**
  - Use uma string aleatória de pelo menos 32 caracteres
  - Exemplo: `openssl rand -base64 32` para gerar
- `JWT_REFRESH_SECRET`: Chave secreta para tokens de refresh - **OBRIGATÓRIO em produção**  
  - Use uma string diferente do JWT_SECRET
  - Exemplo: `openssl rand -base64 32` para gerar
- `JWT_EXPIRES_IN`: Tempo de expiração do token de acesso (padrão: 15m)
- `JWT_REFRESH_EXPIRES_IN`: Tempo de expiração do token de refresh (padrão: 7d)

### Configuração Google OAuth (Opcional)
Para habilitar login com Google, configure no [Google Cloud Console](https://console.cloud.google.com/):

1. Vá em "APIs & Services" > "Credentials"
2. Crie "OAuth 2.0 Client ID" (Web application)
3. Configure Authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`

- `GOOGLE_CLIENT_ID`: ID do cliente OAuth obtido no Google Console
- `GOOGLE_CLIENT_SECRET`: Segredo do cliente OAuth obtido no Google Console  
- `GOOGLE_CALLBACK_URL`: URL de callback (padrão: `http://localhost:3001/api/auth/google/callback`)

### Configuração CORS
- `FRONTEND_URL`: URLs permitidas para CORS (separadas por vírgula)

## Estrutura dos containers
- **dreamy-frontend**: Servidor nginx servindo o build do Vite
- **dreamy-backend**: API Express conectada ao Google Cloud Storage e MongoDB
- **cloudstorage-mongodb**: Banco MongoDB para dados de usuários e metadados de arquivos

## Endpoints do backend

### Autenticação
- `POST /api/auth/register` — Registro de usuário
- `POST /api/auth/login` — Login com email/senha
- `GET /api/auth/google` — Login com Google OAuth
- `GET /api/auth/profile` — Perfil do usuário autenticado
- `POST /api/auth/logout` — Logout

### Gerenciamento de arquivos
- `GET /api/files` — Lista arquivos do usuário
- `POST /api/files/upload` — Upload de arquivo (campo: `file`, multipart/form-data)
- `GET /api/files/:id/download` — Download de arquivo
- `DELETE /api/files/:id` — Excluir arquivo

### Funcionalidades do MongoDB
- **Usuários**: Armazena dados de registro, OAuth Google, preferências
- **Autenticação**: Gerencia tokens JWT, sessões e permissões  
- **Metadados**: Informações dos arquivos (nome, tamanho, tipo, descrição)
- **Controle de acesso**: Sistema de compartilhamento e permissões por arquivo

## Observações
- O frontend espera que o backend esteja acessível em `/files` e `/upload` (ajuste o CORS se necessário).
- O backend precisa do arquivo de chave de serviço do Google Cloud para funcionar.
- Os arquivos físicos ficam no Google Cloud Storage, apenas metadados no MongoDB.

## Documentação Adicional

Para informações mais detalhadas, consulte:

- [`docs/database.md`](docs/database.md) - Estrutura completa do MongoDB, schemas e funcionalidades
- [`docs/architecture.md`](docs/architecture.md) - Arquitetura completa do sistema
- [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md) - Sistema de autenticação e OAuth
- [`docs/api.md`](docs/api.md) - Documentação completa da API REST

---
