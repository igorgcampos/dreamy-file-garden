# Guia de Desenvolvimento

Guia para fluxos de trabalho e padrões de desenvolvimento comuns no projeto CloudStorage.

## Estrutura do Projeto

```
dreamy-file-garden/
├── src/                          # Código fonte do frontend
│   ├── components/               # Componentes React
│   │   ├── FileUpload.tsx       # Interface de upload de arquivos
│   │   ├── FileList.tsx         # Interface de gerenciamento de arquivos
│   │   ├── FilePreview.tsx      # Modal de preview de arquivos
│   │   └── ui/                  # Componentes shadcn/ui
│   ├── hooks/                   # React hooks customizados
│   │   └── useFileStorage.ts    # Hook principal de operações de arquivo
│   ├── lib/                     # Bibliotecas utilitárias
│   │   ├── fileUtils.ts         # Funções auxiliares de arquivo
│   │   └── utils.ts             # Utilitários gerais
│   ├── pages/                   # Componentes de página
│   ├── types/                   # Definições de tipos TypeScript
│   └── App.tsx                  # Componente principal da aplicação
├── backend/                     # Código fonte do backend
│   ├── index.js                 # Servidor Express
│   ├── package.json             # Dependências do backend
│   └── .env                     # Variáveis de ambiente
├── docs/                        # Documentação
└── docker-compose.yml           # Ambiente de desenvolvimento
```

## Fluxo de Desenvolvimento

### Adicionando Novas Operações de Arquivo

**1. Definir Tipos** (`src/types/file.ts`)
```typescript
// Adicionar nova interface para sua operação
export interface FileOperation {
  // Definir estrutura
}
```

**2. Estender Hook useFileStorage** (`src/hooks/useFileStorage.ts`)
```typescript
export const useFileStorage = () => {
  // Adicionar novo estado se necessário
  const [newState, setNewState] = useState();

  // Adicionar nova operação
  const newOperation = useCallback(async (params) => {
    try {
      // Implementação
      const response = await fetch(`${API_URL}/new-endpoint`, {
        method: 'POST',
        body: JSON.stringify(params)
      });
      // Tratar resposta
      toast({ title: 'Mensagem de sucesso' });
    } catch (error) {
      toast({ 
        title: 'Mensagem de erro',
        variant: 'destructive' 
      });
    }
  }, []);

  return {
    // Retornos existentes...
    newOperation
  };
};
```

**3. Adicionar Endpoint do Backend** (`backend/index.js`)
```javascript
app.post('/new-endpoint', async (req, res) => {
  try {
    // Validar entrada
    // Processar com Google Cloud Storage
    // Retornar resposta
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**4. Atualizar Componentes**
```typescript
const { newOperation } = useFileStorage();

// Usar no componente
const handleNewOperation = () => {
  newOperation(params);
};
```

### Adicionando Novos Componentes de UI

**1. Criar Arquivo do Componente**
```typescript
// src/components/NewComponent.tsx
import { Component } from '@/components/ui/component';

interface NewComponentProps {
  // Definir props
}

export const NewComponent = ({ ...props }: NewComponentProps) => {
  return (
    <div>
      {/* Implementação */}
    </div>
  );
};
```

**2. Seguir Padrões do Sistema de Design**
- Usar componentes shadcn/ui como base
- Aplicar classes Tailwind CSS
- Incluir estados de hover e animações
- Adicionar atributos de acessibilidade adequados
- Tratar estados de carregamento e erro

**3. Padrão de Exemplo**
```typescript
export const FileCard = ({ file, onAction }: FileCardProps) => {
  const [loading, setLoading] = useState(false);

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4">
        {/* Conteúdo */}
        <Button 
          onClick={onAction}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Processando...' : 'Ação'}
        </Button>
      </CardContent>
    </Card>
  );
};
```

## Padrões de Desenvolvimento Principais

### 1. Padrão de Tratamento de Erro

**Tratamento Consistente de Erros:**
```typescript
try {
  const result = await apiOperation();
  toast({
    title: 'Mensagem de sucesso',
    description: 'Mensagem de detalhe'
  });
  return result;
} catch (error) {
  console.error('Operação falhou:', error);
  toast({
    title: 'Mensagem de erro', 
    description: (error as Error).message,
    variant: 'destructive'
  });
  throw error; // Re-lançar se necessário
}
```

### 2. Padrão de Estado de Carregamento

**Estados de Carregamento de Componente:**
```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await operation();
  } finally {
    setLoading(false);
  }
};

return (
  <Button disabled={loading}>
    {loading ? 'Processando...' : 'Ação'}
  </Button>
);
```

### 3. Padrão de Detecção de Tipo de Arquivo

**Usando fileUtils:**
```typescript
import { getFileCategory, getFileIcon, formatFileSize } from '@/lib/fileUtils';

const fileCategory = getFileCategory(file.type); // 'images', 'documents', etc.
const fileIcon = getFileIcon(file.type);         // Componente React
const formattedSize = formatFileSize(file.size); // '2.4 MB'
```

### 4. Padrão de Atualização de Estado

**Atualizações Otimistas:**
```typescript
// Atualizar UI imediatamente
setFiles(prev => prev.filter(f => f.id !== fileId));

try {
  // Então sincronizar com servidor
  await deleteFile(fileId);
} catch (error) {
  // Reverter em caso de falha
  setFiles(prev => [...prev, deletedFile]);
  throw error;
}
```

## Padrões de Teste

### Lista de Verificação de Testes Manuais

**Upload de Arquivo:**
- [ ] Arrastar e soltar funciona
- [ ] Validação de arquivo (tamanho, tipo)
- [ ] Acompanhamento de progresso
- [ ] Tratamento de erros
- [ ] Múltiplos arquivos
- [ ] Cancelamento de upload

**Gerenciamento de Arquivos:**
- [ ] Listagem de arquivos
- [ ] Funcionalidade de busca
- [ ] Filtro por tipo
- [ ] Visualizações em grade/lista
- [ ] Preview de arquivo
- [ ] Download funciona
- [ ] Confirmação de exclusão

**Design Responsivo:**
- [ ] Layout mobile
- [ ] Layout tablet
- [ ] Layout desktop
- [ ] Interações por toque

### Testes de API

**Usando curl:**
```bash
# Testar upload
curl -X POST -F "file=@test.jpg" http://localhost:3001/upload

# Testar listagem
curl http://localhost:3001/files

# Testar download
curl -O http://localhost:3001/files/file-id

# Testar exclusão
curl -X DELETE http://localhost:3001/files/file-id
```

## Diretrizes de Estilo de Código

### Diretrizes TypeScript

**1. Usar Tipos Explícitos:**
```typescript
// Bom
interface FileListProps {
  files: CloudFile[];
  onDownload: (file: CloudFile) => void;
}

// Evitar
const props: any = { ... };
```

**2. Usar Async/Await Adequadamente:**
```typescript
// Bom
const uploadFile = async (file: File): Promise<CloudFile> => {
  const result = await fetch(url, options);
  return await result.json();
};

// Evitar misturar promises e async/await
```

### Diretrizes React

**1. Usar Componentes Funcionais:**
```typescript
// Bom
export const FileUpload = ({ onUpload }: Props) => {
  return <div>...</div>;
};

// Evitar componentes de classe a menos que necessário
```

**2. Extrair Hooks Customizados:**
```typescript
// Bom - lógica reutilizável
const useFileOperations = () => {
  // Lógica do hook
};

// Usar em componentes
const { upload, delete } = useFileOperations();
```

**3. Organização de Componente:**
```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Definições de interface
interface Props {
  // ...
}

// 3. Implementação do componente
export const Component = ({ ...props }: Props) => {
  // 4. Estado
  const [state, setState] = useState();

  // 5. Effects e handlers
  useEffect(() => {}, []);
  
  const handleClick = () => {};

  // 6. Render
  return <div>...</div>;
};
```

### Diretrizes de CSS/Estilização

**1. Usar Classes Tailwind:**
```typescript
// Bom
<div className="flex items-center space-x-4 p-6 bg-card rounded-lg">

// Evitar CSS customizado a menos que necessário
```

**2. Design Responsivo:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

**3. Classes de Animação:**
```typescript
<div className="transition-all duration-300 hover:scale-105">
```

## Problemas Comuns e Soluções

### 1. Problemas de CORS
**Problema**: Frontend não consegue acessar backend
**Solução**: Verificar configuração CORS no backend:
```javascript
app.use(cors()); // Permitir todas as origens em desenvolvimento
```

### 2. Falhas no Upload de Arquivo
**Problema**: Arquivos grandes falham ao fazer upload
**Solução**: Verificar limites do multer e permissões do GCS:
```javascript
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});
```

### 3. Variáveis de Ambiente Não Carregando
**Problema**: Backend não encontra credenciais do GCS
**Solução**: Verificar localização do arquivo `.env` e nomes das variáveis:
```bash
# Verificar se arquivo existe
ls -la backend/.env

# Verificar se variáveis estão carregadas
node -e "console.log(process.env.GCP_PROJECT)"
```

### 4. Erros TypeScript
**Problema**: Build falha com erros TypeScript
**Solução**: O projeto usa configuração TypeScript relaxada. Verificar `tsconfig.json`:
```json
{
  "compilerOptions": {
    "noImplicitAny": false,
    "strictNullChecks": false
  }
}
```

## Depuração

### Depuração do Frontend
```typescript
// Adicionar depuração ao hook useFileStorage
const uploadFile = async (file: File) => {
  console.log('Fazendo upload do arquivo:', file.name, file.size);
  
  try {
    const result = await fetch(url, options);
    console.log('Resposta do upload:', result.status);
    return result.json();
  } catch (error) {
    console.error('Erro no upload:', error);
    throw error;
  }
};
```

### Depuração do Backend
```javascript
// Logging Morgan está habilitado por padrão
app.use(morgan('combined'));

// Adicionar logging customizado
app.post('/upload', (req, res) => {
  console.log('Requisição de upload:', req.file?.originalname);
  // ... resto do handler
});
```

### Depuração do GCS
```javascript
// Testar conexão GCS
const testGCS = async () => {
  try {
    const [files] = await bucket.getFiles();
    console.log(`Encontrados ${files.length} arquivos`);
  } catch (error) {
    console.error('Erro GCS:', error.message);
  }
};
```

## Considerações de Performance

### Otimização do Frontend
- Usar React.memo para componentes custosos
- Implementar scroll virtual para listas grandes de arquivos
- Otimizar imagens com formatos e tamanhos adequados
- Usar lazy loading para previews de arquivo

### Otimização do Backend
- Fazer stream de arquivos grandes ao invés de carregar na memória
- Adicionar cache de resposta para metadados de arquivo
- Implementar rate limiting de requisições
- Usar middleware de compressão

### Otimização de Rede
- Habilitar compressão gzip
- Usar CDN para entrega de arquivos
- Implementar carregamento progressivo de arquivos
- Adicionar lógica de retry para requisições falhadas