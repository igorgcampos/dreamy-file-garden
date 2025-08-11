# Upload de Pastas e Estrutura Hierárquica

## Overview

Implementar funcionalidade para upload de pastas completas mantendo a estrutura hierárquica de diretórios no Google Cloud Storage e na interface do usuário.

## Estado Atual

### ❌ Limitações Identificadas

1. **Frontend (`src/components/FileUpload.tsx`)**
   - Usa apenas `react-dropzone` básico
   - Não suporta seleção de diretórios
   - Sem atributo `webkitdirectory`

2. **Backend (`backend/routes/files.js`)**
   - Gera nomes únicos sem preservar estrutura: `${uuidv4()}_${filename}`
   - Perde informações de path/diretório
   - Todos os arquivos ficam na raiz do bucket

3. **Database (MongoDB)**
   - Schema não armazena informações de hierarquia
   - Sem campos para `path` ou `directory`

4. **UI/UX**
   - Interface não mostra estrutura de pastas
   - Listagem apenas em formato plano (sem árvore)

## Implementação Proposta

### 1. Frontend Changes

#### FileUpload Component
```typescript
// Adicionar suporte para upload de diretórios
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop,
  maxSize: 500 * 1024 * 1024,
  multiple: true,
  // Nova funcionalidade:
  directory: true  // Permitir seleção de diretórios
});

// Input com suporte a webkitdirectory
<input 
  {...getInputProps()} 
  webkitdirectory 
  directory 
  multiple 
/>
```

#### Nova UI para Estrutura de Pastas
- Componente TreeView para mostrar hierarquia
- Toggle entre visualização plana/árvore
- Navegação por breadcrumbs
- Ícones de pasta vs arquivo

### 2. Backend Changes

#### Schema Update (models/File.js)
```javascript
const fileSchema = new mongoose.Schema({
  // Campos existentes...
  filename: String,      // Nome único no GCS
  originalName: String,  // Nome original do arquivo
  
  // Novos campos para hierarquia:
  path: {
    type: String,
    default: '/',        // Caminho completo: '/pasta/subpasta/'
    required: true
  },
  parentPath: {
    type: String,        // Caminho do diretório pai: '/pasta/'
    default: '/'
  },
  isDirectory: {
    type: Boolean,
    default: false       // Flag para distinguir pastas de arquivos
  },
  fullPath: {
    type: String,        // Caminho completo: '/pasta/arquivo.pdf'
    required: true,
    index: true
  }
});
```

#### Routes Update
```javascript
// Upload preservando estrutura
const gcsFileName = file.webkitRelativePath ? 
  `${file.webkitRelativePath}` : 
  `${uuidv4()}_${file.originalname}`;

// Criar registros de diretórios
const createDirectoryStructure = async (filePath, userId) => {
  const pathParts = filePath.split('/');
  let currentPath = '';
  
  for (const part of pathParts.slice(0, -1)) {
    currentPath += `/${part}`;
    
    // Verificar se diretório já existe
    const existingDir = await File.findOne({
      path: currentPath,
      isDirectory: true,
      owner: userId
    });
    
    if (!existingDir) {
      await File.create({
        filename: currentPath,
        originalName: part,
        path: currentPath,
        isDirectory: true,
        owner: userId
      });
    }
  }
};
```

#### New Endpoints
```javascript
// GET /api/files/tree - Retorna estrutura hierárquica
router.get('/tree', authenticate, async (req, res) => {
  const files = await File.find({ 
    owner: req.user._id,
    isDeleted: false 
  }).sort({ path: 1, isDirectory: -1, originalName: 1 });
  
  const tree = buildFileTree(files);
  res.json(tree);
});

// POST /api/files/create-folder - Criar nova pasta
router.post('/create-folder', authenticate, async (req, res) => {
  const { name, parentPath = '/' } = req.body;
  // Implementação...
});
```

### 3. GCS Structure

#### Nomenclatura Hierárquica
```
Estrutura atual:
a1b2c3d4-uuid_arquivo.pdf (raiz)

Estrutura proposta:
documentos/projetos/arquivo.pdf
imagens/2024/janeiro/foto.jpg
videos/tutorials/video.mp4
```

#### Vantagens
- Organização visual no GCS Console
- Facilita backup/sync de estruturas
- URLs mais legíveis
- Suporte nativo a "pastas" no GCS

### 4. UI/UX Improvements

#### TreeView Component
```typescript
interface TreeNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: TreeNode[];
  size?: number;
  uploadDate?: Date;
}

const FileTreeView: React.FC<{
  tree: TreeNode[];
  onFileClick: (file: TreeNode) => void;
  onFolderClick: (folder: TreeNode) => void;
}> = ({ tree, onFileClick, onFolderClick }) => {
  // Implementação da árvore...
};
```

#### Breadcrumb Navigation
```typescript
const BreadcrumbNav: React.FC<{
  currentPath: string;
  onNavigate: (path: string) => void;
}> = ({ currentPath, onNavigate }) => {
  // Navegação por breadcrumbs...
};
```

### 5. Features Adicionais

#### Bulk Operations
- Seleção múltipla em pastas
- Download de pasta como ZIP
- Mover/copiar pastas inteiras
- Aplicar tags a toda uma pasta

#### Search & Filter
- Busca dentro de pastas específicas
- Filtro por tipo de arquivo em diretórios
- Navegação rápida por estrutura

#### Sharing & Permissions
- Compartilhar pasta inteira
- Permissões herdadas em subpastas
- Links de compartilhamento para pastas

## Estimativa de Desenvolvimento

### Fase 1: Backend (2-3 dias)
- [ ] Atualizar schema do MongoDB
- [ ] Modificar rota de upload para preservar paths
- [ ] Criar endpoint `/tree` para estrutura hierárquica
- [ ] Implementar criação automática de diretórios

### Fase 2: Frontend Core (3-4 dias)
- [ ] Adicionar suporte `webkitdirectory` no FileUpload
- [ ] Criar componente TreeView básico
- [ ] Implementar navegação por breadcrumbs
- [ ] Atualizar hooks para trabalhar com estrutura hierárquica

### Fase 3: UI/UX (2-3 dias)
- [ ] Design de ícones pasta/arquivo
- [ ] Animações de expand/collapse
- [ ] Drag & drop entre pastas
- [ ] Context menu (criar pasta, renomear, etc.)

### Fase 4: Features Avançadas (3-5 dias)
- [ ] Bulk operations em pastas
- [ ] Download de pasta como ZIP
- [ ] Sistema de permissões hierárquicas
- [ ] Busca e filtros avançados

**Total Estimado: 10-15 dias de desenvolvimento**

## Considerações Técnicas

### Performance
- Lazy loading para pastas grandes
- Virtualização da árvore para muitos itens
- Cache de estrutura no frontend
- Índices otimizados no MongoDB

### Compatibilidade
- Fallback para browsers sem `webkitdirectory`
- Manter compatibilidade com uploads existentes
- Migração de arquivos existentes para nova estrutura

### Segurança
- Validação de paths (evitar ../, path traversal)
- Limites de profundidade de diretórios
- Sanitização de nomes de pastas

## Referências

- [MDN: HTMLInputElement.webkitdirectory](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory)
- [GCS: Object naming guidelines](https://cloud.google.com/storage/docs/naming-objects)
- [React DnD: File uploads](https://react-dnd.github.io/react-dnd/examples/dustbin/multiple-targets)
- [Tree View UI Patterns](https://ant.design/components/tree)

---

**Prioridade: Média** | **Impacto: Alto** | **Complexidade: Média-Alta**

*Criado em: 2025-08-11*
*Status: Planejado*