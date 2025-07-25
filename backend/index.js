import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import morgan from 'morgan';

// Config
dotenv.config();
const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());

// HTTP request logging
app.use(morgan('combined'));

// Multer setup (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Google Cloud Storage setup
const storage = new Storage({
  keyFilename: process.env.GCP_KEYFILE,
  projectId: process.env.GCP_PROJECT,
});
const bucket = storage.bucket(process.env.GCP_BUCKET);

// List files
app.get('/files', async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /files from ${req.ip}`);
  try {
    const [files] = await bucket.getFiles();
    const result = files.map(file => ({
      id: file.name,
      name: path.basename(file.name),
      size: file.metadata.size,
      type: file.metadata.contentType,
      uploadDate: file.metadata.timeCreated,
      url: `${process.env.PUBLIC_URL || ''}/files/${encodeURIComponent(file.name)}`
    }));
    res.json(result);
    console.log(`[${new Date().toISOString()}] Listed ${result.length} files`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error listing files:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Upload file
app.post('/upload', upload.single('file'), async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /upload from ${req.ip}, file: ${req.file?.originalname}`);
  try {
    const file = req.file;
    const description = req.body.description || '';
    if (!file) {
      console.warn(`[${new Date().toISOString()}] No file uploaded`);
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const gcsFileName = `${uuidv4()}_${file.originalname}`;
    const blob = bucket.file(gcsFileName);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: { description }
      }
    });
    blobStream.end(file.buffer);
    blobStream.on('finish', async () => {
      res.json({
        id: gcsFileName,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        uploadDate: new Date(),
        url: `${process.env.PUBLIC_URL || ''}/files/${encodeURIComponent(gcsFileName)}`,
        description
      });
      console.log(`[${new Date().toISOString()}] Upload success: ${gcsFileName}`);
    });
    blobStream.on('error', err => {
      console.error(`[${new Date().toISOString()}] Upload error:`, err);
      res.status(500).json({ error: err.message });
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Upload error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Download file
app.get('/files/:id', async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /files/${req.params.id} from ${req.ip}`);
  try {
    const file = bucket.file(req.params.id);
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`[${new Date().toISOString()}] File not found: ${req.params.id}`);
      return res.status(404).json({ error: 'File not found' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(req.params.id)}"`);
    file.createReadStream().pipe(res);
    console.log(`[${new Date().toISOString()}] Download started: ${req.params.id}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Download error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Delete file
app.delete('/files/:id', async (req, res) => {
  console.log(`[${new Date().toISOString()}] DELETE /files/${req.params.id} from ${req.ip}`);
  try {
    const file = bucket.file(req.params.id);
    await file.delete();
    res.json({ success: true });
    console.log(`[${new Date().toISOString()}] Deleted file: ${req.params.id}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Delete error:`, err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
}); 