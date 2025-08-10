# Guia de Configuração do Ambiente de Desenvolvimento

Guia completo para configurar o ambiente de desenvolvimento do CloudStorage.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+ e npm
- [Docker](https://www.docker.com/get-started/) e Docker Compose
- [Conta na Google Cloud Platform](https://cloud.google.com/)
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (opcional, para gerenciamento via CLI)

## Configuração do Google Cloud Storage

### 1. Criar um Projeto no Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Anote seu **Project ID** (você precisará dele mais tarde)

### 2. Habilitar APIs Necessárias

```bash
# Usando gcloud CLI (opcional)
gcloud services enable storage-api.googleapis.com
```

Ou habilite manualmente no Console:
- Vá em APIs & Services → Library
- Procure e habilite "Google Cloud Storage JSON API"

### 3. Criar um Bucket de Armazenamento

```bash
# Usando gcloud CLI
gcloud storage buckets create gs://your-bucket-name --location=us-central1
```

Ou crie manualmente no Console:
- Vá em Cloud Storage → Buckets
- Clique em "Create Bucket"
- Escolha um nome único para o bucket
- Selecione a região (recomendado: us-central1)
- Configure o controle de acesso como "Fine-grained"

### 4. Criar Conta de Serviço

1. Vá em IAM & Admin → Service Accounts
2. Clique em "Create Service Account"
3. Nome: `cloudstorage-service-account`
4. Conceda as funções:
   - **Storage Object Admin** (para operações de arquivo)
   - **Storage Bucket Reader** (para listagem)

### 5. Gerar Chave da Conta de Serviço

1. Clique na conta de serviço criada
2. Vá na aba "Keys"
3. Clique em "Add Key" → "Create New Key"
4. Selecione formato **JSON**
5. Baixe o arquivo de chave
6. **Renomeie para `keyfile.json`**

## Configuração do Ambiente de Desenvolvimento Local

### 1. Clonar e Instalar Dependências

```bash
git clone <repository-url>
cd dreamy-file-garden

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configurar Variáveis de Ambiente

**Configuração do Backend:**
```bash
# Copy template
cp backend/.env.example backend/.env
```

Edite `backend/.env`:
```env
GCP_PROJECT=your-google-cloud-project-id
GCP_BUCKET=your-bucket-name
GCP_KEYFILE=/app/keyfile.json
PUBLIC_URL=http://localhost:3001
PORT=3001
```

**Configuração do Frontend (opcional):**
```bash
# Create .env.local in root directory
echo "VITE_API_URL=http://localhost:3001" > .env.local
```

### 3. Colocar a Chave da Conta de Serviço

```bash
# Move downloaded keyfile to backend directory
mv ~/Downloads/your-service-account-key.json backend/keyfile.json
```

**⚠️ Nota de Segurança**: O `keyfile.json` está no `.gitignore` e nunca deve ser commitado no controle de versão.

### 4. Verificar Configuração

Teste sua conexão GCS:
```bash
cd backend
node -e "
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
  keyFilename: './keyfile.json',
  projectId: process.env.GCP_PROJECT || 'your-project-id'
});
storage.bucket('your-bucket-name').exists().then(([exists]) => 
  console.log(exists ? '✅ Bucket accessible' : '❌ Bucket not found')
);
"
```

## Executando a Aplicação

### Opção 1: Docker Compose (Recomendado)

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

Os serviços estarão disponíveis em:
- **Frontend**: http://localhost (porta 80)
- **Backend**: http://localhost:3001

### Opção 2: Modo Desenvolvimento

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Os serviços estarão disponíveis em:
- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:3001

## Referência de Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável | Obrigatório | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `GCP_PROJECT` | ✅ | ID do Projeto Google Cloud | `my-project-123456` |
| `GCP_BUCKET` | ✅ | Nome do bucket de armazenamento | `my-cloudstorage-bucket` |
| `GCP_KEYFILE` | ✅ | Caminho para chave da conta de serviço | `/app/keyfile.json` |
| `PUBLIC_URL` | ❌ | URL pública do backend | `http://localhost:3001` |
| `PORT` | ❌ | Porta do backend | `3001` |

### Frontend (`.env.local`)

| Variável | Obrigatório | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `VITE_API_URL` | ❌ | URL base da API do backend | `http://localhost:3001` |

## Solução de Problemas

### Problemas Comuns

**1. Erros de "Permission denied"**
- Verifique se a conta de serviço tem as funções IAM corretas
- Verifique o caminho e permissões do `keyfile.json`

**2. "Bucket not found"**
- Verifique se o nome do bucket no `.env` coincide com o bucket real
- Certifique-se de que o bucket existe e está acessível

**3. "CORS errors" no navegador**
- O CORS do backend está configurado para desenvolvimento
- Em produção, configure CORS para seu domínio

**4. Falha na construção do Docker**
- Certifique-se de que `keyfile.json` existe no diretório `backend/`
- Verifique se o daemon do Docker está executando

**5. Frontend não consegue conectar ao backend**
- Verifique se `VITE_API_URL` aponta para a URL correta do backend
- Verifique se o backend está executando e acessível

### Logs e Depuração

**Ver logs do Docker:**
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs frontend
docker-compose logs backend
```

**O backend tem logging detalhado de requisições** via middleware Morgan:
- Todas as requisições HTTP são logadas no console
- Inclui IP, método, URL, tempo de resposta

## Próximos Passos

- Leia [Visão Geral da Arquitetura](./architecture.md) para entender o design do sistema
- Confira [Referência da API](./api.md) para documentação dos endpoints
- Veja [Guia de Desenvolvimento](./development.md) para workflows comuns