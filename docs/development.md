# Development Guide

Guide for common development workflows and patterns in the CloudStorage project.

## Project Structure

```
dreamy-file-garden/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── FileUpload.tsx       # File upload interface
│   │   ├── FileList.tsx         # File management interface  
│   │   ├── FilePreview.tsx      # File preview modal
│   │   └── ui/                  # shadcn/ui components
│   ├── hooks/                   # Custom React hooks
│   │   └── useFileStorage.ts    # Core file operations hook
│   ├── lib/                     # Utility libraries
│   │   ├── fileUtils.ts         # File helper functions
│   │   └── utils.ts             # General utilities
│   ├── pages/                   # Page components
│   ├── types/                   # TypeScript type definitions
│   └── App.tsx                  # Main application component
├── backend/                     # Backend source code
│   ├── index.js                 # Express server
│   ├── package.json             # Backend dependencies
│   └── .env                     # Environment variables
├── docs/                        # Documentation
└── docker-compose.yml           # Development environment
```

## Development Workflow

### Adding New File Operations

**1. Define Types** (`src/types/file.ts`)
```typescript
// Add new interface for your operation
export interface FileOperation {
  // Define structure
}
```

**2. Extend useFileStorage Hook** (`src/hooks/useFileStorage.ts`)
```typescript
export const useFileStorage = () => {
  // Add new state if needed
  const [newState, setNewState] = useState();

  // Add new operation
  const newOperation = useCallback(async (params) => {
    try {
      // Implementation
      const response = await fetch(`${API_URL}/new-endpoint`, {
        method: 'POST',
        body: JSON.stringify(params)
      });
      // Handle response
      toast({ title: 'Success message' });
    } catch (error) {
      toast({ 
        title: 'Error message',
        variant: 'destructive' 
      });
    }
  }, []);

  return {
    // Existing returns...
    newOperation
  };
};
```

**3. Add Backend Endpoint** (`backend/index.js`)
```javascript
app.post('/new-endpoint', async (req, res) => {
  try {
    // Validate input
    // Process with Google Cloud Storage
    // Return response
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**4. Update Components**
```typescript
const { newOperation } = useFileStorage();

// Use in component
const handleNewOperation = () => {
  newOperation(params);
};
```

### Adding New UI Components

**1. Create Component File**
```typescript
// src/components/NewComponent.tsx
import { Component } from '@/components/ui/component';

interface NewComponentProps {
  // Define props
}

export const NewComponent = ({ ...props }: NewComponentProps) => {
  return (
    <div>
      {/* Implementation */}
    </div>
  );
};
```

**2. Follow Design System Patterns**
- Use shadcn/ui components as base
- Apply Tailwind CSS classes
- Include hover states and animations
- Add proper accessibility attributes
- Handle loading and error states

**3. Example Pattern**
```typescript
export const FileCard = ({ file, onAction }: FileCardProps) => {
  const [loading, setLoading] = useState(false);

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4">
        {/* Content */}
        <Button 
          onClick={onAction}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Processing...' : 'Action'}
        </Button>
      </CardContent>
    </Card>
  );
};
```

## Key Development Patterns

### 1. Error Handling Pattern

**Consistent Error Handling:**
```typescript
try {
  const result = await apiOperation();
  toast({
    title: 'Success message',
    description: 'Detail message'
  });
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  toast({
    title: 'Error message', 
    description: (error as Error).message,
    variant: 'destructive'
  });
  throw error; // Re-throw if needed
}
```

### 2. Loading State Pattern

**Component Loading States:**
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
    {loading ? 'Processing...' : 'Action'}
  </Button>
);
```

### 3. File Type Detection Pattern

**Using fileUtils:**
```typescript
import { getFileCategory, getFileIcon, formatFileSize } from '@/lib/fileUtils';

const fileCategory = getFileCategory(file.type); // 'images', 'documents', etc.
const fileIcon = getFileIcon(file.type);         // React component
const formattedSize = formatFileSize(file.size); // '2.4 MB'
```

### 4. State Update Pattern

**Optimistic Updates:**
```typescript
// Update UI immediately
setFiles(prev => prev.filter(f => f.id !== fileId));

try {
  // Then sync with server
  await deleteFile(fileId);
} catch (error) {
  // Rollback on failure
  setFiles(prev => [...prev, deletedFile]);
  throw error;
}
```

## Testing Patterns

### Manual Testing Checklist

**File Upload:**
- [ ] Drag & drop works
- [ ] File validation (size, type)
- [ ] Progress tracking
- [ ] Error handling
- [ ] Multiple files
- [ ] Upload cancellation

**File Management:**
- [ ] File listing
- [ ] Search functionality
- [ ] Filter by type
- [ ] Grid/list views
- [ ] File preview
- [ ] Download works
- [ ] Delete confirmation

**Responsive Design:**
- [ ] Mobile layout
- [ ] Tablet layout
- [ ] Desktop layout
- [ ] Touch interactions

### API Testing

**Using curl:**
```bash
# Test upload
curl -X POST -F "file=@test.jpg" http://localhost:3001/upload

# Test listing
curl http://localhost:3001/files

# Test download
curl -O http://localhost:3001/files/file-id

# Test delete
curl -X DELETE http://localhost:3001/files/file-id
```

## Code Style Guidelines

### TypeScript Guidelines

**1. Use Explicit Types:**
```typescript
// Good
interface FileListProps {
  files: CloudFile[];
  onDownload: (file: CloudFile) => void;
}

// Avoid
const props: any = { ... };
```

**2. Use Proper Async/Await:**
```typescript
// Good
const uploadFile = async (file: File): Promise<CloudFile> => {
  const result = await fetch(url, options);
  return await result.json();
};

// Avoid mixing promises and async/await
```

### React Guidelines

**1. Use Functional Components:**
```typescript
// Good
export const FileUpload = ({ onUpload }: Props) => {
  return <div>...</div>;
};

// Avoid class components unless necessary
```

**2. Extract Custom Hooks:**
```typescript
// Good - reusable logic
const useFileOperations = () => {
  // Hook logic
};

// Use in components
const { upload, delete } = useFileOperations();
```

**3. Component Organization:**
```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Interface definitions
interface Props {
  // ...
}

// 3. Component implementation
export const Component = ({ ...props }: Props) => {
  // 4. State
  const [state, setState] = useState();

  // 5. Effects and handlers
  useEffect(() => {}, []);
  
  const handleClick = () => {};

  // 6. Render
  return <div>...</div>;
};
```

### CSS/Styling Guidelines

**1. Use Tailwind Classes:**
```typescript
// Good
<div className="flex items-center space-x-4 p-6 bg-card rounded-lg">

// Avoid custom CSS unless necessary
```

**2. Responsive Design:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

**3. Animation Classes:**
```typescript
<div className="transition-all duration-300 hover:scale-105">
```

## Common Issues and Solutions

### 1. CORS Issues
**Problem**: Frontend can't access backend
**Solution**: Verify CORS configuration in backend:
```javascript
app.use(cors()); // Allow all origins in development
```

### 2. File Upload Failures
**Problem**: Large files fail to upload
**Solution**: Check multer limits and GCS permissions:
```javascript
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});
```

### 3. Environment Variables Not Loading
**Problem**: Backend can't find GCS credentials
**Solution**: Verify `.env` file location and variable names:
```bash
# Check file exists
ls -la backend/.env

# Verify variables are loaded
node -e "console.log(process.env.GCP_PROJECT)"
```

### 4. TypeScript Errors
**Problem**: Build fails with TypeScript errors
**Solution**: The project uses relaxed TypeScript config. Check `tsconfig.json`:
```json
{
  "compilerOptions": {
    "noImplicitAny": false,
    "strictNullChecks": false
  }
}
```

## Debugging

### Frontend Debugging
```typescript
// Add debugging to useFileStorage hook
const uploadFile = async (file: File) => {
  console.log('Uploading file:', file.name, file.size);
  
  try {
    const result = await fetch(url, options);
    console.log('Upload response:', result.status);
    return result.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
```

### Backend Debugging
```javascript
// Morgan logging is enabled by default
app.use(morgan('combined'));

// Add custom logging
app.post('/upload', (req, res) => {
  console.log('Upload request:', req.file?.originalname);
  // ... rest of handler
});
```

### GCS Debugging
```javascript
// Test GCS connection
const testGCS = async () => {
  try {
    const [files] = await bucket.getFiles();
    console.log(`Found ${files.length} files`);
  } catch (error) {
    console.error('GCS error:', error.message);
  }
};
```

## Performance Considerations

### Frontend Optimization
- Use React.memo for expensive components
- Implement virtual scrolling for large file lists
- Optimize images with proper formats and sizes
- Use lazy loading for file previews

### Backend Optimization  
- Stream large files instead of loading into memory
- Add response caching for file metadata
- Implement request rate limiting
- Use compression middleware

### Network Optimization
- Enable gzip compression
- Use CDN for file delivery
- Implement progressive file loading
- Add retry logic for failed requests