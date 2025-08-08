# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CloudStorage is a fullstack web application for file management with Google Cloud Storage integration. The project consists of:
- **Frontend**: React 18 + Vite + TypeScript + shadcn/ui components + Tailwind CSS
- **Backend**: Node.js + Express + Google Cloud Storage API
- **Deployment**: Docker Compose with nginx proxy

## Development Commands

### Frontend Development
```bash
npm run dev          # Start development server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend Development
```bash
cd backend
npm start           # Start backend server (port 3001)
```

### Docker Development
```bash
docker-compose up --build    # Build and run both services
# Frontend: http://localhost (port 80)
# Backend: http://localhost:3001
```

## Architecture

### Frontend Structure
- **Main App**: Single-page React app with React Router (`src/App.tsx`)
- **Pages**: `src/pages/Index.tsx` (main dashboard), `src/pages/NotFound.tsx`
- **Core Hook**: `src/hooks/useFileStorage.ts` - handles all file operations (upload, download, delete, list)
- **Components**: 
  - `src/components/FileUpload.tsx` - drag & drop file upload
  - `src/components/FileList.tsx` - file grid/list display
  - `src/components/FilePreview.tsx` - file preview modal
- **UI Components**: shadcn/ui components in `src/components/ui/`
- **Types**: `src/types/file.ts` - CloudFile, UploadProgress interfaces
- **State Management**: React Query for server state, React hooks for local state

### Backend Structure
- **API Server**: `backend/index.js` - Express server with Google Cloud Storage integration
- **Endpoints**: 
  - `GET /files` - list all files
  - `POST /upload` - upload file (multipart/form-data)
  - `GET /files/:id` - download file
  - `DELETE /files/:id` - delete file
- **File Storage**: Google Cloud Storage with UUID-based naming
- **Middleware**: CORS, multer (memory storage), morgan logging

### Key Configuration Files
- `vite.config.ts` - Vite config with path aliases (`@/` → `./src/`)
- `tsconfig.json` - TypeScript config with relaxed strictness
- `tailwind.config.ts` - Tailwind with custom gradients and animations
- `components.json` - shadcn/ui configuration
- `docker-compose.yml` - Multi-container setup
- `backend/.env.example` - Required environment variables template

## Environment Setup

### Required Environment Variables (backend/.env)
```
GCP_PROJECT=your-google-cloud-project-id
GCP_BUCKET=your-bucket-name
GCP_KEYFILE=/app/keyfile.json
PUBLIC_URL=http://localhost:3001
PORT=3001
```

### Required Files
- `backend/keyfile.json` - Google Cloud service account key (not in repo)
- `backend/.env` - Environment configuration (not in repo)

## API Integration

The frontend communicates with the backend via REST API:
- Base URL: `VITE_API_URL` environment variable or defaults to hardcoded IP
- File operations use FormData for uploads
- Error handling with toast notifications
- Upload progress simulation (fetch doesn't support native progress)

## UI/UX Patterns

- **Design System**: shadcn/ui components with Tailwind CSS
- **Theming**: Built-in light/dark mode support via next-themes
- **Animations**: Custom Tailwind animations for smooth transitions  
- **Toast Notifications**: Sonner + shadcn toast for user feedback
- **File Handling**: Drag & drop upload, file type detection, size formatting
- **Responsive**: Mobile-first design with responsive grid layouts

## Development Notes

- TypeScript configuration is relaxed (noImplicitAny: false, strict checks disabled)
- ESLint configured for React + TypeScript with unused variables disabled
- React Query used for server state management and caching
- File preview supports common formats (images, text, etc.)
- Upload progress is simulated client-side (backend streams don't provide real progress)
- Google Cloud Storage files use UUID prefixes to avoid naming conflicts