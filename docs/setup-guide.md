# Development Setup Guide

Complete guide for setting up the CloudStorage development environment.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- [Docker](https://www.docker.com/get-started/) and Docker Compose
- [Google Cloud Platform Account](https://cloud.google.com/)
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (optional, for CLI management)

## Google Cloud Storage Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your **Project ID** (you'll need this later)

### 2. Enable Required APIs

```bash
# Using gcloud CLI (optional)
gcloud services enable storage-api.googleapis.com
```

Or enable manually in Console:
- Go to APIs & Services → Library
- Search and enable "Google Cloud Storage JSON API"

### 3. Create a Storage Bucket

```bash
# Using gcloud CLI
gcloud storage buckets create gs://your-bucket-name --location=us-central1
```

Or create manually in Console:
- Go to Cloud Storage → Buckets
- Click "Create Bucket"
- Choose a unique bucket name
- Select region (recommended: us-central1)
- Set access control to "Fine-grained"

### 4. Create Service Account

1. Go to IAM & Admin → Service Accounts
2. Click "Create Service Account"
3. Name: `cloudstorage-service-account`
4. Grant roles:
   - **Storage Object Admin** (for file operations)
   - **Storage Bucket Reader** (for listing)

### 5. Generate Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" → "Create New Key"
4. Select **JSON** format
5. Download the key file
6. **Rename to `keyfile.json`**

## Local Development Setup

### 1. Clone and Install Dependencies

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

### 2. Configure Environment Variables

**Backend Configuration:**
```bash
# Copy template
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
GCP_PROJECT=your-google-cloud-project-id
GCP_BUCKET=your-bucket-name
GCP_KEYFILE=/app/keyfile.json
PUBLIC_URL=http://localhost:3001
PORT=3001
```

**Frontend Configuration (optional):**
```bash
# Create .env.local in root directory
echo "VITE_API_URL=http://localhost:3001" > .env.local
```

### 3. Place Service Account Key

```bash
# Move downloaded keyfile to backend directory
mv ~/Downloads/your-service-account-key.json backend/keyfile.json
```

**⚠️ Security Note**: The `keyfile.json` is in `.gitignore` and should never be committed to version control.

### 4. Verify Configuration

Test your GCS connection:
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

## Running the Application

### Option 1: Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

Services will be available at:
- **Frontend**: http://localhost (port 80)
- **Backend**: http://localhost:3001

### Option 2: Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Services will be available at:
- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:3001

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GCP_PROJECT` | ✅ | Google Cloud Project ID | `my-project-123456` |
| `GCP_BUCKET` | ✅ | Storage bucket name | `my-cloudstorage-bucket` |
| `GCP_KEYFILE` | ✅ | Path to service account key | `/app/keyfile.json` |
| `PUBLIC_URL` | ❌ | Backend public URL | `http://localhost:3001` |
| `PORT` | ❌ | Backend port | `3001` |

### Frontend (`.env.local`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | ❌ | Backend API base URL | `http://localhost:3001` |

## Troubleshooting

### Common Issues

**1. "Permission denied" errors**
- Verify service account has correct IAM roles
- Check `keyfile.json` path and permissions

**2. "Bucket not found"**
- Verify bucket name in `.env` matches actual bucket
- Ensure bucket exists and is accessible

**3. "CORS errors" in browser**
- Backend CORS is configured for development
- In production, configure CORS for your domain

**4. Docker build fails**
- Ensure `keyfile.json` exists in `backend/` directory
- Check Docker daemon is running

**5. Frontend can't connect to backend**
- Verify `VITE_API_URL` points to correct backend URL
- Check backend is running and accessible

### Logs and Debugging

**View Docker logs:**
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs frontend
docker-compose logs backend
```

**Backend has detailed request logging** via Morgan middleware:
- All HTTP requests are logged to console
- Includes IP, method, URL, response time

## Next Steps

- Read [Architecture Overview](./architecture.md) to understand system design
- Check [API Reference](./api.md) for endpoint documentation
- See [Development Guide](./development.md) for common workflows