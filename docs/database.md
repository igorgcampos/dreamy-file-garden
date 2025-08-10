# Estrutura do Banco de Dados MongoDB

O CloudStorage utiliza MongoDB para gerenciar dados de usuários, autenticação e metadados de arquivos. Os arquivos físicos são armazenados no Google Cloud Storage, mas as informações sobre eles ficam no MongoDB.

## Visão Geral

```mermaid
graph TD
    A[CloudStorage App] --> B[MongoDB]
    A --> C[Google Cloud Storage]
    
    B --> D[Coleção Users]
    B --> E[Coleção Files] 
    
    C --> F[Arquivos Físicos]
    
    E --> G[Metadados dos Arquivos]
    E --> H[Referências GCS]
    
    D --> I[Dados de Usuários]
    D --> J[Tokens JWT]
    D --> K[OAuth Data]
```

## Estrutura das Coleções

### 1. Coleção `users`

Armazena informações de usuários, autenticação e preferências.

```javascript
{
  _id: ObjectId,
  email: String,           // Email único do usuário
  password: String,        // Hash bcrypt (opcional para OAuth)
  name: String,           // Nome do usuário
  avatar: String,         // URL do avatar (opcional)
  role: String,           // 'user' | 'admin'
  googleId: String,       // ID do Google OAuth (opcional)
  
  // Verificação de email
  isEmailVerified: Boolean,
  emailVerificationToken: String,
  
  // Reset de senha
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // JWT refresh token
  refreshToken: String,
  
  // Atividade do usuário
  lastLogin: Date,
  isActive: Boolean,
  
  // Preferências
  preferences: {
    theme: String,        // 'light' | 'dark' | 'system'
    language: String,     // 'en' | 'pt-BR'
  },
  
  // Timestamps automáticos
  createdAt: Date,
  updatedAt: Date
}
```

**Índices:**
- `email: 1` (único)
- `googleId: 1` (único)
- `emailVerificationToken: 1`
- `passwordResetToken: 1`

### 2. Coleção `files`

Armazena metadados dos arquivos e controle de acesso. Os arquivos físicos ficam no Google Cloud Storage.

```javascript
{
  _id: ObjectId,
  filename: String,        // Nome no GCS (com UUID prefix)
  originalName: String,    // Nome original do arquivo
  size: Number,           // Tamanho em bytes
  mimetype: String,       // MIME type do arquivo
  description: String,    // Descrição opcional
  
  // Controle de acesso
  owner: ObjectId,        // Referência ao usuário proprietário
  isPublic: Boolean,      // Se o arquivo é público
  
  // Compartilhamento
  sharedWith: [{
    user: ObjectId,       // Usuário com acesso
    permission: String,   // 'read' | 'write'
    sharedAt: Date       // Quando foi compartilhado
  }],
  
  // Organização
  tags: [String],         // Tags para categorização
  
  // Métricas
  downloadCount: Number,  // Contador de downloads
  lastAccessed: Date,    // Último acesso
  
  // Soft delete
  isDeleted: Boolean,
  deletedAt: Date,
  
  // Timestamps automáticos
  createdAt: Date,
  updatedAt: Date
}
```

**Índices:**
- `owner: 1`
- `filename: 1` (único)
- `sharedWith.user: 1`
- `tags: 1`
- `isDeleted: 1`
- `createdAt: -1`

## Funcionalidades do Sistema de Banco

### Autenticação e Usuários

**1. Registro de Usuários:**
- Armazena credenciais com hash bcrypt
- Suporte a Google OAuth (sem senha necessária)
- Tokens de verificação de email
- Sistema de roles (user/admin)

**2. Sistema JWT:**
- Refresh tokens armazenados no banco
- Tokens de acesso em memória (httpOnly cookies)
- Expiração automática configurável

**3. Reset de Senha:**
- Tokens temporários com expiração
- Sistema seguro de recuperação

### Gerenciamento de Arquivos

**1. Metadados:**
- Informações completas dos arquivos
- Link com arquivos físicos no GCS via `filename`
- Histórico de uploads e modificações

**2. Controle de Acesso:**
- Proprietário tem acesso total
- Sistema de compartilhamento granular
- Arquivos públicos ou privados
- Permissões de leitura/escrita

**3. Organização:**
- Sistema de tags para categorização
- Soft delete para recuperação
- Métricas de uso (downloads, acessos)

**4. Busca e Filtragem:**
- Queries otimizadas por índices
- Busca por proprietário, tags, tipo
- Listagem de arquivos compartilhados

## Integração com Google Cloud Storage

```mermaid
sequenceDiagram
    participant U as Usuário
    participant API as Backend API
    participant M as MongoDB  
    participant GCS as Google Cloud Storage
    
    U->>API: Upload arquivo
    API->>GCS: Salvar arquivo físico
    GCS-->>API: Retorna filename (UUID)
    API->>M: Salvar metadados
    M-->>API: Documento criado
    API-->>U: Sucesso
    
    U->>API: Listar arquivos
    API->>M: Buscar metadados do usuário
    M-->>API: Lista de documentos
    API-->>U: Lista com metadados
    
    U->>API: Download arquivo
    API->>M: Verificar permissões
    M-->>API: Autorização OK
    API->>GCS: Stream do arquivo
    GCS-->>API: Dados do arquivo
    API-->>U: Arquivo baixado
```

## Configuração de Conexão

A conexão com MongoDB é configurada via variável de ambiente:

```bash
MONGODB_URI=mongodb://cloudstorage_user:cloudstorage_pass@mongodb:27017/cloudstorage?authSource=cloudstorage
```

**Componentes da URI:**
- `cloudstorage_user`: Usuário do banco
- `cloudstorage_pass`: Senha do banco
- `mongodb:27017`: Host e porta (container Docker)
- `cloudstorage`: Nome do banco de dados
- `authSource=cloudstorage`: Banco para autenticação

## Recursos Avançados

### 1. Métodos do Model User

```javascript
// Comparar senha
user.comparePassword(candidatePassword)

// Gerar tokens de verificação
user.generateEmailVerificationToken()
user.generatePasswordResetToken()

// Atualizar atividade
user.updateLastLogin()

// Serialização segura (remove campos sensíveis)
user.toJSON()
```

### 2. Métodos do Model File

```javascript
// Controle de acesso
file.hasAccess(userId, 'read|write')
file.shareWith(userId, 'read|write')
file.unshareWith(userId)

// Métricas
file.incrementDownloadCount()

// Soft delete
file.softDelete()
file.restore()

// Queries estáticas
File.findUserFiles(userId, includeShared)
File.findPublicFiles()
```

### 3. Middleware do Mongoose

- **Pre-save hooks**: Hash automático de senhas
- **Índices automáticos**: Criados na inicialização
- **Validações**: Schema validation integrada
- **Timestamps**: createdAt/updatedAt automáticos

## Segurança do Banco

### Proteções Implementadas

1. **Autenticação**: Usuário e senha específicos
2. **Autorização**: Controle de acesso por documento
3. **Validação**: Schema validation no Mongoose
4. **Sanitização**: Campos sensíveis excluídos do JSON
5. **Índices**: Queries otimizadas e seguras

### Dados Sensíveis

**Nunca expostos ao cliente:**
- `password` (hash bcrypt)
- `refreshToken`
- `emailVerificationToken`
- `passwordResetToken`
- `passwordResetExpires`

**Logs seguros:**
- IPs e atividades logados
- Senhas nunca aparecem em logs
- Tokens mascarados em desenvolvimento

## Performance

### Otimizações

1. **Índices estratégicos** em campos de busca frequente
2. **Populate seletivo** apenas campos necessários
3. **Paginação** para grandes conjuntos de dados
4. **Conexão persistente** com pool de conexões
5. **Queries otimizadas** com agregação quando necessário

### Monitoramento

- **Conexão MongoDB** logada no startup
- **Queries lentas** podem ser monitoradas
- **Pool de conexões** configurado para alta concorrência

## Backup e Recuperação

Para produção, recomenda-se:

1. **Backup automático** do MongoDB
2. **Replicação** para alta disponibilidade  
3. **Monitoramento** de integridade dos dados
4. **Testes de recuperação** regulares

## Desenvolvimento Local

O MongoDB roda em container Docker com:
- Dados persistidos em volume
- Usuário/senha configurados
- Rede isolada do Docker Compose
- Acessível apenas pelo backend