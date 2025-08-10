# Sistema de Autenticação CloudStorage

Este documento descreve o sistema de autenticação abrangente implementado no CloudStorage.

## Visão Geral

O sistema de autenticação fornece gerenciamento seguro de usuários com múltiplos métodos de autenticação:

- **Autenticação baseada em JWT** com tokens de acesso e atualização
- **Integração Google OAuth 2.0** para login social
- **Controle de acesso baseado em funções** (RBAC)
- **Gerenciamento seguro de sessão** com cookies HTTP-only
- **Limitação de taxa** e middleware de segurança
- **Segurança de senha** com hash bcrypt

## Como Funciona o Sistema JWT

### O que é JWT (JSON Web Token)

JWT é um padrão de token para autenticação que funciona como uma "carteirinha digital". É composto por 3 partes separadas por pontos:

```
header.payload.signature
```

**Exemplo real:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Sistema de Dois Tokens

#### JWT_SECRET (Token de Acesso)
- **Duração**: 15 minutos (curta)
- **Propósito**: Acessar recursos protegidos da API
- **Segurança**: Expira rapidamente para reduzir riscos se comprometido
- **Uso**: Enviado em cada requisição autenticada

#### JWT_REFRESH_SECRET (Token de Refresh)  
- **Duração**: 7 dias (longa)
- **Propósito**: Gerar novos tokens de acesso sem fazer login novamente
- **Segurança**: Armazenado de forma mais segura (HTTP-only cookie)
- **Uso**: Apenas para renovar tokens de acesso expirados

### Por que Duas Chaves Secretas Diferentes?

**Segurança por Separação:**
```javascript
// Se alguém descobrir JWT_SECRET, só consegue:
// - Falsificar tokens de acesso (15min)
// - NÃO consegue gerar refresh tokens (7 dias)

// Se descobrir JWT_REFRESH_SECRET:
// - Pode gerar novos access tokens
// - Mas precisa ter um refresh token válido primeiro
```

### Geração de Chaves Seguras

```bash
# Gerar JWT_SECRET
openssl rand -base64 32

# Gerar JWT_REFRESH_SECRET  
openssl rand -base64 32

# Exemplo de saída:
# xvX2kF8pN7qR9mT6wE3sA5vL0nK4jH8bC1dF9gJ2mP5r
```

**⚠️ IMPORTANTE**: Use chaves diferentes para JWT_SECRET e JWT_REFRESH_SECRET em produção!

## Arquitetura

### Componentes do Backend

1. **Modelo de Usuário** (`backend/models/User.js`)
   - Schema abrangente de usuário com campos de autenticação
   - Métodos integrados de hash e comparação de senha
   - Métodos de geração e validação de token
   - Gerenciamento de preferências e perfil do usuário

2. **Utilitários JWT** (`backend/utils/jwt.js`)
   - Geração de token de acesso (expiração em 15 minutos)
   - Geração de token de atualização (expiração em 7 dias)
   - Verificação e validação de token
   - Gerenciamento seguro de par de tokens

3. **Middleware de Autenticação** (`backend/middleware/auth.js`)
   - Verificação de token JWT
   - Autenticação e autorização de usuário
   - Controle de acesso baseado em funções
   - Autenticação opcional para endpoints públicos

4. **Rotas de Autenticação** (`backend/routes/auth.js`)
   - Registro e login de usuário
   - Endpoint de atualização de token
   - Gerenciamento de perfil
   - Funcionalidade de mudança de senha
   - Integração Google OAuth

5. **Configuração Passport** (`backend/config/passport.js`)
   - Estratégia JWT para validação de token
   - Estratégia Google OAuth
   - Serialização/deserialização de usuário

### Componentes do Frontend

1. **Contexto de Autenticação** (`src/contexts/AuthContext.tsx`)
   - Gerenciamento global de estado de autenticação
   - Persistência de sessão do usuário
   - Métodos de autenticação (login, registro, logout)
   - Manipulação de redirecionamento OAuth

2. **Cliente API** (`src/lib/api.ts`)
   - Instância Axios com interceptadores de autenticação
   - Atualização automática de token
   - Manipulação de erro de solicitação/resposta
   - Gerenciamento de token em cookie e localStorage

3. **Componentes UI** (`src/components/auth/`)
   - LoginForm: Autenticação por email/senha
   - RegisterForm: Registro de usuário
   - UserProfile: Gerenciamento de perfil e configurações
   - AuthModal: Wrapper modal para componentes de auth
   - GoogleOAuthButton: Integração de login com Google
   - ProtectedRoute: Componente de proteção de rota

## Fluxo de Autenticação

### Fluxo de Registro

1. Usuário fornece email, senha e nome
2. Backend valida entrada e verifica usuários existentes
3. Senha é hasheada usando bcrypt
4. Registro do usuário é criado no MongoDB
5. Tokens JWT são gerados e retornados
6. Tokens são armazenados em cookies HTTP-only
7. Usuário é automaticamente logado

### Fluxo de Login

1. Usuário fornece email e senha
2. Backend valida credenciais
3. Senha é verificada usando bcrypt
4. Tokens JWT são gerados
5. Último login do usuário é atualizado
6. Tokens são armazenados em cookies e retornados
7. Frontend atualiza estado de autenticação

### Fluxo Google OAuth

1. Usuário clica no botão "Continuar com Google"
2. Redirecionamento para tela de consentimento Google OAuth
3. Usuário concede permissões
4. Google redireciona para callback do backend
5. Backend recebe tokens OAuth e perfil do usuário
6. Conta do usuário é criada ou vinculada
7. Tokens JWT são gerados
8. Usuário é redirecionado para frontend com status de sucesso
9. Frontend detecta sucesso OAuth e atualiza estado

### Fluxo de Atualização de Token

1. Solicitação API falha com 401 Unauthorized
2. Interceptador Axios captura o erro
3. Token de atualização é enviado para backend
4. Novo token de acesso é gerado e retornado
5. Solicitação original é repetida com novo token
6. Se atualização falhar, usuário é deslogado

## Fluxo Detalhado com Diagramas

### 1. Processo de Login

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend
    participant DB as MongoDB
    
    U->>F: Email + Senha
    F->>B: POST /api/auth/login
    B->>DB: Verificar credenciais
    DB-->>B: Usuário válido
    
    Note over B: Gerar 2 tokens com chaves diferentes
    B->>B: JWT.sign(payload, JWT_SECRET, {expiresIn: '15m'})
    B->>B: JWT.sign(payload, JWT_REFRESH_SECRET, {expiresIn: '7d'})
    
    B-->>F: Access Token + Refresh Token (cookies HTTP-only)
    F-->>U: Login bem-sucedido
```

### 2. Requisições Autenticadas

```mermaid
sequenceDiagram
    participant F as Frontend  
    participant B as Backend
    participant GCS as Google Cloud Storage
    
    F->>B: GET /api/files (com Access Token)
    B->>B: JWT.verify(token, JWT_SECRET)
    
    alt Token válido
        B->>GCS: Listar arquivos do usuário
        GCS-->>B: Lista de arquivos
        B-->>F: Dados dos arquivos
    else Token expirado/inválido
        B-->>F: 401 Unauthorized
    end
```

### 3. Renovação Automática de Token

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    
    F->>B: GET /api/files (Access Token expirado)
    B-->>F: 401 Unauthorized
    
    Note over F: Interceptor Axios detecta 401
    F->>B: POST /api/auth/refresh (com Refresh Token)
    B->>B: JWT.verify(refreshToken, JWT_REFRESH_SECRET)
    
    alt Refresh Token válido
        B->>B: Gerar novo Access Token
        B-->>F: Novo Access Token
        F->>B: Repetir requisição original com novo token
        B-->>F: Dados solicitados
    else Refresh Token expirado
        B-->>F: 401 - Fazer login novamente
        F->>F: Redirecionar para tela de login
    end
```

### Implementação Prática

**Geração dos tokens:**
```javascript
const generateTokens = (user) => {
  // Token de acesso - curta duração
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email }, 
    process.env.JWT_SECRET,           // Primeira chave secreta
    { expiresIn: '15m' }
  );
  
  // Token de refresh - longa duração  
  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,   // Segunda chave secreta
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};
```

**Middleware de autenticação:**
```javascript
const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};
```

### Vantagens deste Sistema

1. **Segurança**: Dois níveis de proteção contra comprometimento
2. **Performance**: Tokens são stateless, não precisam consultar banco
3. **Escalabilidade**: Sistema distribuído sem dependência de sessão
4. **UX**: Renovação transparente para o usuário
5. **Flexibilidade**: Controle granular de expiração

## Experiência do Usuário na Prática

### O que acontece quando você deixa a aplicação aberta?

**Cenário:** Você faz login, deixa a aba do navegador aberta por 16+ minutos sem usar, e depois volta a interagir com a aplicação.

#### ⏰ Timeline da Sessão do Usuário


timeline
    title Experiência do Usuário - Tokens Expirando
    
    section Login Inicial
        00:00 : Faz login na aplicação
              : ✅ Access Token (15min)
              : ✅ Refresh Token (7 dias)
              : "Login bem-sucedido!"
    
    section Uso Normal (0-15min)
        00:05 : Clica em "Upload arquivo" → ✅ Funciona normal
        00:10 : Lista arquivos → ✅ Funciona normal  
        00:14 : Download arquivo → ✅ Funciona normal
    
    section Após 16 minutos (Token Expirado)
        00:16 : Clica em "Ver arquivos"
              : ⚠️ Access Token expirado (internamente)
              : 🔄 Sistema renova automaticamente
              : ✅ Lista arquivos aparece
              : "Usuário nem percebe o delay"
    
    section Continuação Normal  
        00:20 : Upload novo arquivo → ✅ Funciona normal
        00:25 : Delete arquivo → ✅ Funciona normal
        00:30 : Continua usando...
        
    section Muito Tempo Depois
        7 dias : Refresh Token expira
               : ❌ Precisa fazer login novamente
               : "Por favor, faça login"


#### 🎯 Na sua experiência como usuário:

**Antes de 15 minutos:**
```
Você: [clica em qualquer ação]
Sistema: [resposta instantânea] ✅
```

**Após 16 minutos (primeira ação):**
```
Você: [clica em "Listar arquivos"]
Sistema: [meio segundo de delay] 🔄
Sistema: [mostra arquivos normalmente] ✅
Você: "Nem percebi nada diferente"
```

**Após 7 dias sem usar:**
```
Você: [clica em qualquer ação]  
Sistema: [mostra tela de login] 🔐
Você: "Preciso fazer login novamente"
```

### Fluxo Detalhado da Renovação Automática


sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend
    
    Note over U: Usuário fica 16min sem usar a app
    
    U->>F: Clica em "Download arquivo"
    F->>B: GET /files/123 (Access Token expirado)
    B-->>F: 401 Unauthorized
    
    Note over F: Axios Interceptor detecta 401<br/>Renovação automática inicia
    
    F->>B: POST /api/auth/refresh (Refresh Token)
    B->>B: Verificar Refresh Token
    B-->>F: 200 OK + Novo Access Token
    
    Note over F: Automaticamente repete<br/>a requisição original
    
    F->>B: GET /files/123 (Novo Access Token)
    B-->>F: 200 OK + Dados do arquivo
    F-->>U: ✅ Download inicia normalmente
    
    Note over U: Usuário vê apenas um<br/>pequeno delay (meio segundo)


### Resumo para o Usuário

| Tempo | O que acontece | Sua experiência |
|-------|----------------|-----------------|
| **0-15min** | Token válido | ✅ Tudo funciona instantaneamente |
| **16min+** | Primeira ação após expiração | 🔄 Meio segundo de delay, depois funciona normal |
| **16min+** | Próximas ações | ✅ Tudo volta ao normal por mais 15min |
| **7 dias** | Refresh token expira | 🔐 Pede login novamente |

**🎯 Principais benefícios:**
- **Segurança**: Tokens curtos limitam danos se comprometidos
- **Conveniência**: Não precisa fazer login a cada 15 minutos  
- **Transparência**: Renovação acontece automaticamente
- **Controle**: Sessões expiram depois de 7 dias de inatividade

## Recursos de Segurança

### Segurança de Senha
- Mínimo de 6 caracteres com requisitos de complexidade
- Hash bcrypt com rounds de salt
- Fluxo seguro de mudança de senha

### Segurança de Token
- Tokens de acesso de curta duração (15 minutos)
- Tokens de atualização de longa duração (7 dias)
- Cookies HTTP-only para prevenir XSS
- Flag segura em produção
- Invalidação de token no logout

### Limitação de Taxa
- Endpoints de autenticação: 5 solicitações por 15 minutos
- Endpoints de API gerais: 100 solicitações por 15 minutos (1000 em desenvolvimento)
- Limitação de taxa baseada em IP

### Cabeçalhos de Segurança
- Middleware Helmet para cabeçalhos de segurança
- Política de Segurança de Conteúdo (CSP)
- Configuração CORS com origens específicas

### Segurança de Sessão
- Atualização automática de token
- Invalidação de sessão em eventos de segurança
- Suporte a múltiplos dispositivos

## Configuração

### Variáveis de Ambiente

#### Backend (.env)

# Configuração JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d

# Banco de Dados
MONGODB_URI=mongodb://localhost:27017/cloudstorage

# Google OAuth (Opcional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# CORS
FRONTEND_URL=http://localhost:8080,http://localhost:3000


#### Frontend (.env)

VITE_API_URL=http://localhost:3001


## Endpoints da API

### Endpoints de Autenticação

| Método | Endpoint | Descrição | Auth Necessária |
|--------|----------|-----------|----------------|
| POST | `/api/auth/register` | Registro de usuário | Não |
| POST | `/api/auth/login` | Login de usuário | Não |
| POST | `/api/auth/logout` | Logout de usuário | Sim |
| POST | `/api/auth/refresh` | Atualizar tokens | Não |
| GET | `/api/auth/profile` | Obter perfil do usuário | Sim |
| PUT | `/api/auth/profile` | Atualizar perfil | Sim |
| PUT | `/api/auth/change-password` | Alterar senha | Sim |
| GET | `/api/auth/google` | Iniciar Google OAuth | Não |
| GET | `/api/auth/google/callback` | Callback Google OAuth | Não |

### Endpoints de Arquivo Protegidos

Todas as operações de arquivo requerem autenticação:

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|----------|
| GET | `/api/files` | Listar arquivos do usuário | Usuário |
| POST | `/api/files/upload` | Enviar arquivo | Usuário |
| GET | `/api/files/:id/download` | Baixar arquivo | Acesso de leitura |
| DELETE | `/api/files/:id` | Deletar arquivo | Proprietário/Admin |
| PUT | `/api/files/:id` | Atualizar metadados do arquivo | Proprietário/Admin |

## Exemplos de Uso

### Autenticação Frontend


import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password123' });
      // Usuário está agora autenticado
    } catch (error) {
      // Tratar erro de login
    }
  };

  if (!isAuthenticated) {
    return <div>Por favor, faça login</div>;
  }

  return <div>Bem-vindo, {user.name}!</div>;
}


### Rotas Protegidas


import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin">
          <AdminPanel />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
```

### Solicitações API


import { api } from '@/lib/api';

// Solicitações autenticadas incluem tokens automaticamente
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/files/upload', formData);
  return response.data;
};


## Schema do Banco de Dados

### Coleção de Usuários


{
  _id: ObjectId,
  email: String (único, obrigatório),
  password: String (hasheada, opcional para usuários OAuth),
  name: String (obrigatório),
  avatar: String (opcional),
  role: String (enum: ['user', 'admin'], padrão: 'user'),
  googleId: String (único, esparso, opcional),
  isEmailVerified: Boolean (padrão: false),
  emailVerificationToken: String (opcional),
  passwordResetToken: String (opcional),
  passwordResetExpires: Date (opcional),
  refreshToken: String (opcional),
  lastLogin: Date (opcional),
  isActive: Boolean (padrão: true),
  preferences: {
    theme: String (enum: ['light', 'dark', 'system'], padrão: 'system'),
    language: String (padrão: 'pt')
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Tratamento de Erros

### Códigos de Erro Comuns

- `NO_TOKEN`: Nenhum token de autenticação fornecido
- `INVALID_TOKEN`: Token é inválido ou malformado
- `TOKEN_EXPIRED`: Token de acesso expirou
- `USER_NOT_FOUND`: Conta do usuário não existe
- `INVALID_CREDENTIALS`: Email/senha incorretos
- `USER_EXISTS`: Email já registrado
- `ACCOUNT_DEACTIVATED`: Conta do usuário está desabilitada
- `INSUFFICIENT_PERMISSIONS`: Usuário não possui permissões necessárias
- `RATE_LIMIT_EXCEEDED`: Muitas solicitações

## Configuração de Desenvolvimento

1. Instalar dependências:
```bash
# Backend
cd backend
npm install

# Frontend
npm install
```

2. Configurar variáveis de ambiente (copiar de .env.example)

3. Iniciar MongoDB:
```bash
# Usando Docker
docker-compose -f docker-compose.dev.yml up mongodb

# Ou MongoDB local
mongod
```

4. Iniciar servidores de desenvolvimento:
```bash
# Backend
cd backend
npm start

# Frontend
npm run dev
```

## Deploy em Produção

1. Definir variáveis de ambiente seguras
2. Configurar MongoDB com autenticação
3. Configurar certificados SSL
4. Configurar proxy reverso (nginx)
5. Usar Docker Compose para orquestração

```bash
# Deploy em produção
docker-compose --profile production up -d
```

## Considerações de Segurança

1. **Use segredos JWT fortes** em produção
2. **Habilite autenticação MongoDB**
3. **Configure origens CORS adequadas**
4. **Use HTTPS** em produção
5. **Defina flags de cookie seguro**
6. **Rotacione segredos regularmente**
7. **Monitore logs de autenticação**
8. **Implemente bloqueio de conta** para proteção contra ataques de força bruta
9. **Use configurações específicas do ambiente**
10. **Auditorias de segurança regulares**

## Solução de Problemas

### Problemas Comuns

1. **Incompatibilidade de Segredo JWT**: Garantir que segredos JWT coincidam entre serviços
2. **Erros CORS**: Verificar configuração FRONTEND_URL
3. **Conexão MongoDB**: Verificar string de conexão e credenciais
4. **Google OAuth**: Garantir que URIs de redirecionamento coincidam exatamente
5. **Loop de Atualização de Token**: Verificar problemas de validação de token

### Comandos de Debug

```bash
# Verificar conexão MongoDB
docker exec -it cloudstorage-mongodb-dev mongosh

# Visualizar logs da aplicação
docker logs cloudstorage-backend-dev

# Testar endpoints da API
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```