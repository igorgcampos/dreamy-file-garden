# API Reference

CloudStorage REST API for file management operations with Google Cloud Storage integration.

## Base URL
- **Development**: `http://localhost:3001`
- **Production**: Set via `PUBLIC_URL` environment variable

## Authentication
Currently no authentication required. All endpoints are publicly accessible.

## Endpoints

### List Files
Get all files from the storage bucket.

**Endpoint**: `GET /files`

**Response**: `200 OK`
```json
[
  {
    "id": "uuid_filename.jpg",
    "name": "filename.jpg", 
    "size": 2048576,
    "type": "image/jpeg",
    "uploadDate": "2024-01-15T10:30:00.000Z",
    "url": "http://localhost:3001/files/uuid_filename.jpg"
  }
]
```

**Example**:
```bash
curl http://localhost:3001/files
```

### Upload File
Upload a file to the storage bucket.

**Endpoint**: `POST /upload`

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file` (required): The file to upload
- `description` (optional): File description

**Response**: `200 OK`
```json
{
  "id": "uuid_filename.jpg",
  "name": "filename.jpg",
  "size": 2048576,
  "type": "image/jpeg", 
  "uploadDate": "2024-01-15T10:30:00.000Z",
  "url": "http://localhost:3001/files/uuid_filename.jpg",
  "description": "My vacation photo"
}
```

**Example**:
```bash
curl -X POST \
  -F "file=@/path/to/file.jpg" \
  -F "description=My vacation photo" \
  http://localhost:3001/upload
```

### Download File
Download a file from the storage bucket.

**Endpoint**: `GET /files/:id`

**Parameters**:
- `id`: File identifier (URL encoded)

**Response**: File binary data with appropriate headers
- `Content-Disposition: attachment; filename="original_filename.ext"`
- Content-Type matches original file type

**Example**:
```bash
curl -O http://localhost:3001/files/uuid_filename.jpg
```

### Delete File
Remove a file from the storage bucket.

**Endpoint**: `DELETE /files/:id`

**Parameters**:
- `id`: File identifier (URL encoded)

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Example**:
```bash
curl -X DELETE http://localhost:3001/files/uuid_filename.jpg
```

## Error Responses

All endpoints return consistent error format:

**Response**: `4xx` or `5xx`
```json
{
  "error": "Error description"
}
```

### Common Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | No file uploaded | Upload endpoint called without file |
| 404 | File not found | File does not exist in storage |
| 500 | GCS error | Google Cloud Storage operation failed |

## File Naming Convention
Files are stored with UUID prefixes to avoid naming conflicts:
- Original: `document.pdf`  
- Stored as: `f47ac10b-58cc-4372-a567-0e02b2c3d479_document.pdf`

## File Size Limits
- Maximum file size: **500MB** per file
- No limit on total storage (subject to GCS bucket limits)

## Supported File Types
All file types are supported. Common MIME types are preserved:
- Images: `image/jpeg`, `image/png`, `image/gif`, etc.
- Documents: `application/pdf`, `text/plain`, etc.
- Video: `video/mp4`, `video/webm`, etc.
- Audio: `audio/mpeg`, `audio/wav`, etc.

## Rate Limiting
Currently no rate limiting implemented.

## CORS Configuration
CORS is enabled for all origins in development. Configure appropriately for production.