# Architecture Overview

CloudStorage system architecture and component relationships.

## System Overview

CloudStorage is a modern web application for file management with cloud storage, built using a clean 3-tier architecture:

```mermaid
graph TB
    subgraph "Client Tier"
        UI[React Frontend]
    end
    
    subgraph "Application Tier"  
        API[Express Backend]
    end
    
    subgraph "Storage Tier"
        GCS[Google Cloud Storage]
    end
    
    UI --> API
    API --> GCS
```

## High-Level Architecture

### Frontend (React SPA)
- **Technology**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **State Management**: React Query + Custom Hooks
- **Routing**: React Router
- **Build Tool**: Vite with SWC

### Backend (REST API)
- **Technology**: Node.js + Express
- **Cloud Integration**: Google Cloud Storage SDK
- **File Processing**: Multer (memory storage)
- **Logging**: Morgan
- **Security**: CORS enabled

### Deployment
- **Containerization**: Docker + Docker Compose  
- **Web Server**: nginx (frontend proxy)
- **Networking**: Internal Docker bridge network

## Component Architecture

### Frontend Components

```mermaid
graph TD
    A[App.tsx] --> B[Index Page]
    B --> C[FileUpload Component]
    B --> D[FileList Component] 
    B --> E[FilePreview Component]
    
    C --> F[useFileStorage Hook]
    D --> F
    E --> F
    
    F --> G[API Layer]
    
    H[shadcn/ui Components] --> C
    H --> D
    H --> E
    
    I[Toast System] --> F
```

#### Key Frontend Components

**1. useFileStorage Hook** (`src/hooks/useFileStorage.ts`)
- **Purpose**: Central state management for all file operations
- **Responsibilities**:
  - File listing and caching
  - Upload with progress tracking
  - Download and delete operations
  - Error handling and toast notifications
  - Backend synchronization

**2. FileUpload Component** (`src/components/FileUpload.tsx`)
- **Purpose**: Drag & drop file upload interface
- **Features**:
  - Multiple file selection
  - File validation (size, type)
  - Upload progress display
  - File description input
  - Visual feedback (animations)

**3. FileList Component** (`src/components/FileList.tsx`)
- **Purpose**: File browsing and management
- **Features**:
  - Grid/list view modes
  - Search and filtering
  - File categorization
  - Bulk operations
  - Preview, download, delete actions

**4. FilePreview Component** (`src/components/FilePreview.tsx`)
- **Purpose**: File preview modal
- **Features**:
  - Image preview
  - File metadata display
  - Download/delete actions

### Backend Architecture

```mermaid
graph TD
    A[Express Server] --> B[CORS Middleware]
    B --> C[Morgan Logging]
    C --> D[JSON Parser]
    D --> E[Multer File Handler]
    
    E --> F[Route Handlers]
    
    F --> G[GET /files]
    F --> H[POST /upload]  
    F --> I[GET /files/:id]
    F --> J[DELETE /files/:id]
    
    G --> K[Google Cloud Storage]
    H --> K
    I --> K  
    J --> K
```

#### Backend Components

**1. Express Server** (`backend/index.js`)
- **Purpose**: REST API server
- **Middleware Stack**:
  - CORS (cross-origin requests)
  - Morgan (request logging)
  - Express JSON parser
  - Multer (file upload handling)

**2. Google Cloud Storage Integration**
- **SDK**: `@google-cloud/storage`
- **Authentication**: Service account key file
- **Operations**: List, upload, download, delete
- **File Naming**: UUID-prefixed to prevent conflicts

## Data Flow

### File Upload Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FC as FileUpload Component
    participant H as useFileStorage Hook
    participant API as Express Backend
    participant GCS as Google Cloud Storage
    
    U->>FC: Select/Drop Files
    FC->>FC: File Validation
    FC->>H: uploadFile()
    H->>H: Create Progress Tracker
    H->>API: POST /upload (FormData)
    API->>API: Multer Processing
    API->>GCS: Upload to Bucket
    GCS-->>API: Upload Success
    API-->>H: File Metadata
    H->>H: Update File List
    H->>H: Show Success Toast
    H-->>FC: Upload Complete
```

### File List/Download Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FL as FileList Component
    participant H as useFileStorage Hook
    participant API as Express Backend
    participant GCS as Google Cloud Storage
    
    FL->>H: fetchFiles()
    H->>API: GET /files
    API->>GCS: List Bucket Files
    GCS-->>API: File Metadata
    API-->>H: File Array
    H->>H: Cache Files
    H-->>FL: Display Files
    
    U->>FL: Click Download
    FL->>H: downloadFile()
    H->>H: Create Download Link
    H->>API: GET /files/:id
    API->>GCS: Stream File
    GCS-->>API: File Data
    API-->>H: File Stream
```

## Key Architectural Patterns

### 1. Custom Hook Pattern
- **Implementation**: `useFileStorage` hook encapsulates all file operations
- **Benefits**: Centralized state, reusable logic, consistent error handling
- **Usage**: Shared across multiple components

### 2. Component Composition
- **Implementation**: shadcn/ui components composed into complex interfaces  
- **Benefits**: Consistent design, reusable elements, maintainable code
- **Example**: FileUpload uses Card, Button, Progress, Toast components

### 3. Separation of Concerns
- **Frontend**: UI/UX and state management only
- **Backend**: Business logic and cloud integration
- **Storage**: File persistence and retrieval

### 4. Error Boundaries
- **Implementation**: Consistent error handling via toast notifications
- **Strategy**: Fail gracefully, inform users, log for debugging
- **Coverage**: Upload failures, network errors, GCS errors

### 5. Progressive Enhancement  
- **Implementation**: Core functionality works without JavaScript
- **Features**: Responsive design, accessible components
- **Fallbacks**: Loading states, error states, empty states

## Security Architecture

### Frontend Security
- **Input Validation**: File type and size validation
- **XSS Prevention**: React's built-in sanitization
- **HTTPS**: Required for production deployment

### Backend Security  
- **File Validation**: Multer file size limits (500MB)
- **CORS**: Configured for allowed origins
- **Input Sanitization**: Express built-in protections
- **Error Handling**: No sensitive data in error responses

### Cloud Security
- **Authentication**: Service account with minimal permissions
- **Access Control**: Fine-grained IAM roles
- **Network Security**: Private bucket access only through API
- **Encryption**: GCS handles encryption at rest

## Scalability Considerations

### Current Architecture Limits
- **Single Backend Instance**: No load balancing
- **Memory Storage**: Multer uses memory for file processing
- **No Caching**: Files fetched from GCS on every request
- **No CDN**: Direct GCS access for downloads

### Future Scaling Opportunities
- **Horizontal Scaling**: Multiple backend instances with load balancer
- **Caching Layer**: Redis for file metadata caching  
- **CDN Integration**: Cloud CDN for file delivery
- **Database**: Add metadata database for complex queries
- **Authentication**: Add user management and authorization
- **File Processing**: Add image resizing, virus scanning

## Technology Decisions

### Frontend Framework: React + TypeScript
- **Why**: Strong ecosystem, TypeScript safety, component reusability
- **Alternatives**: Vue.js, Angular, Svelte
- **Trade-offs**: Bundle size vs. developer experience

### UI Library: shadcn/ui + Tailwind
- **Why**: Modern components, customizable, good accessibility
- **Alternatives**: Material-UI, Ant Design, Chakra UI
- **Trade-offs**: Learning curve vs. flexibility

### Backend: Node.js + Express  
- **Why**: JavaScript consistency, simple REST API, good GCS SDK
- **Alternatives**: Python (FastAPI), Go, Java (Spring Boot)
- **Trade-offs**: Performance vs. development speed

### Storage: Google Cloud Storage
- **Why**: Scalable, reliable, good SDK, cost-effective
- **Alternatives**: AWS S3, Azure Blob Storage, MinIO
- **Trade-offs**: Vendor lock-in vs. features