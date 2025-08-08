import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import File from '../models/File.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Multer setup (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Add basic file type validation if needed
    cb(null, true);
  }
});

// Google Cloud Storage setup
const storage = new Storage({
  keyFilename: process.env.GCP_KEYFILE,
  projectId: process.env.GCP_PROJECT,
});
const bucket = storage.bucket(process.env.GCP_BUCKET);

// Validation middleware
const validateUpload = [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const tags = JSON.parse(value);
          if (!Array.isArray(tags)) return false;
          return tags.every(tag => typeof tag === 'string' && tag.length <= 50);
        } catch {
          return false;
        }
      }
      return Array.isArray(value) && value.every(tag => typeof tag === 'string' && tag.length <= 50);
    })
    .withMessage('Tags must be an array of strings (max 50 chars each)'),
];

const validateFileId = [
  param('id')
    .notEmpty()
    .withMessage('File ID is required')
    .isMongoId()
    .withMessage('Invalid file ID format'),
];

// List files
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().withMessage('Search term is invalid'),
  query('type').optional().isIn(['image', 'document', 'video', 'audio', 'other']).withMessage('Invalid file type'),
  query('sortBy').optional().isIn(['name', 'size', 'createdAt', 'downloadCount']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order'),
], async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /files from ${req.ip}${req.user ? `, user: ${req.user.email}` : ' (anonymous)'}`);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }
    
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const skip = (page - 1) * limit;
    const { search, type, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    let query = { isDeleted: false };
    
    if (req.user) {
      // Authenticated user: show their files + shared files + public files
      query.$or = [
        { owner: req.user._id },
        { 'sharedWith.user': req.user._id },
        { isPublic: true }
      ];
    } else {
      // Anonymous user: only public files
      query.isPublic = true;
    }
    
    // Add search filter
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { originalName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      });
    }
    
    // Add type filter
    if (type) {
      const typeMap = {
        image: /^image\//,
        document: /^(application\/pdf|application\/msword|application\/vnd\.|text\/)/,
        video: /^video\//,
        audio: /^audio\//,
        other: /^(?!(image|video|audio|application\/pdf|application\/msword|application\/vnd\.|text\/))/
      };
      
      if (typeMap[type]) {
        query.mimetype = { $regex: typeMap[type] };
      }
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const files = await File.find(query)
      .populate('owner', 'name email avatar')
      .populate('sharedWith.user', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await File.countDocuments(query);
    
    // Transform files for response
    const transformedFiles = files.map(file => ({
      id: file._id,
      name: file.originalName,
      size: file.size,
      type: file.mimetype,
      uploadDate: file.createdAt,
      url: `${process.env.PUBLIC_URL || ''}/api/files/${file._id}/download`,
      description: file.description,
      tags: file.tags,
      owner: file.owner,
      isPublic: file.isPublic,
      downloadCount: file.downloadCount,
      lastAccessed: file.lastAccessed,
      // Only show sharing info to owner or admin
      sharedWith: req.user && (req.user._id.equals(file.owner._id) || req.user.role === 'admin') ? file.sharedWith : undefined,
      userPermission: req.user ? (
        req.user._id.equals(file.owner._id) ? 'owner' :
        file.sharedWith.find(share => share.user._id.equals(req.user._id))?.permission || 
        (file.isPublic ? 'read' : null)
      ) : (file.isPublic ? 'read' : null)
    }));
    
    res.json({
      files: transformedFiles,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
    
    console.log(`[${new Date().toISOString()}] Listed ${transformedFiles.length} files (page ${page}/${Math.ceil(total / limit)})`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error listing files:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Upload file
router.post('/upload', authenticate, upload.single('file'), validateUpload, async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /upload from ${req.ip}, user: ${req.user.email}, file: ${req.file?.originalname}`);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }
    
    const file = req.file;
    if (!file) {
      console.warn(`[${new Date().toISOString()}] No file uploaded`);
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { description = '', isPublic = false, tags: rawTags } = req.body;
    
    // Parse tags
    let tags = [];
    if (rawTags) {
      try {
        tags = typeof rawTags === 'string' ? JSON.parse(rawTags) : rawTags;
        if (!Array.isArray(tags)) tags = [];
      } catch {
        tags = [];
      }
    }
    
    // Generate unique filename
    const gcsFileName = `${uuidv4()}_${file.originalname}`;
    
    // Create file record in database
    const fileRecord = new File({
      filename: gcsFileName,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      description,
      owner: req.user._id,
      isPublic,
      tags,
    });
    
    await fileRecord.save();
    
    try {
      // Upload to Google Cloud Storage
      const blob = bucket.file(gcsFileName);
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          metadata: { 
            description,
            fileId: fileRecord._id.toString(),
            uploaderId: req.user._id.toString(),
          }
        }
      });
      
      await new Promise((resolve, reject) => {
        blobStream.on('finish', resolve);
        blobStream.on('error', reject);
        blobStream.end(file.buffer);
      });
      
      // Populate owner info and return
      await fileRecord.populate('owner', 'name email avatar');
      
      const responseFile = {
        id: fileRecord._id,
        name: fileRecord.originalName,
        size: fileRecord.size,
        type: fileRecord.mimetype,
        uploadDate: fileRecord.createdAt,
        url: `${process.env.PUBLIC_URL || ''}/api/files/${fileRecord._id}/download`,
        description: fileRecord.description,
        tags: fileRecord.tags,
        owner: fileRecord.owner,
        isPublic: fileRecord.isPublic,
      };
      
      res.status(201).json(responseFile);
      console.log(`[${new Date().toISOString()}] Upload success: ${gcsFileName}, user: ${req.user.email}`);
      
    } catch (uploadError) {
      // Clean up database record if GCS upload fails
      await File.findByIdAndDelete(fileRecord._id);
      throw uploadError;
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Upload error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Download file
router.get('/:id/download', optionalAuth, validateFileId, async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /files/${req.params.id}/download from ${req.ip}${req.user ? `, user: ${req.user.email}` : ' (anonymous)'}`);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }
    
    const fileRecord = await File.findById(req.params.id);
    if (!fileRecord || fileRecord.isDeleted) {
      console.warn(`[${new Date().toISOString()}] File not found: ${req.params.id}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check permissions
    if (!req.user) {
      // Anonymous user - only public files
      if (!fileRecord.isPublic) {
        return res.status(401).json({ error: 'Authentication required' });
      }
    } else {
      // Authenticated user - check access
      if (!fileRecord.hasAccess(req.user._id, 'read')) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Check if file exists in GCS
    const gcsFile = bucket.file(fileRecord.filename);
    const [exists] = await gcsFile.exists();
    
    if (!exists) {
      console.warn(`[${new Date().toISOString()}] File not found in GCS: ${fileRecord.filename}`);
      return res.status(404).json({ error: 'File not found in storage' });
    }
    
    // Update download count and last accessed
    fileRecord.incrementDownloadCount();
    await fileRecord.save();
    
    // Set headers
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}"`);
    res.setHeader('Content-Type', fileRecord.mimetype);
    
    // Stream file
    gcsFile.createReadStream().pipe(res);
    console.log(`[${new Date().toISOString()}] Download started: ${fileRecord.filename}${req.user ? `, user: ${req.user.email}` : ' (anonymous)'}`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Download error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/:id', authenticate, validateFileId, async (req, res) => {
  console.log(`[${new Date().toISOString()}] DELETE /files/${req.params.id} from ${req.ip}, user: ${req.user.email}`);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }
    
    const fileRecord = await File.findById(req.params.id);
    if (!fileRecord || fileRecord.isDeleted) {
      console.warn(`[${new Date().toISOString()}] File not found: ${req.params.id}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check permissions (only owner or admin can delete)
    if (!req.user._id.equals(fileRecord.owner) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only file owner can delete.' });
    }
    
    try {
      // Delete from Google Cloud Storage
      const gcsFile = bucket.file(fileRecord.filename);
      await gcsFile.delete();
    } catch (gcsError) {
      console.warn(`[${new Date().toISOString()}] Warning: Could not delete from GCS: ${fileRecord.filename}`, gcsError.message);
    }
    
    // Soft delete in database
    fileRecord.softDelete();
    await fileRecord.save();
    
    res.json({ success: true, message: 'File deleted successfully' });
    console.log(`[${new Date().toISOString()}] Deleted file: ${fileRecord.filename}, user: ${req.user.email}`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Delete error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Update file metadata
router.put('/:id', authenticate, validateFileId, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => tags.every(tag => typeof tag === 'string' && tag.length <= 50))
    .withMessage('Each tag must be a string with max 50 characters'),
], async (req, res) => {
  console.log(`[${new Date().toISOString()}] PUT /files/${req.params.id} from ${req.ip}, user: ${req.user.email}`);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }
    
    const fileRecord = await File.findById(req.params.id).populate('owner', 'name email avatar');
    if (!fileRecord || fileRecord.isDeleted) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check permissions (only owner or admin can update)
    if (!req.user._id.equals(fileRecord.owner._id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only file owner can update.' });
    }
    
    const allowedUpdates = ['name', 'description', 'isPublic', 'tags'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'name') {
          updates.originalName = req.body[key];
        } else {
          updates[key] = req.body[key];
        }
      }
    });
    
    Object.assign(fileRecord, updates);
    await fileRecord.save();
    
    const responseFile = {
      id: fileRecord._id,
      name: fileRecord.originalName,
      size: fileRecord.size,
      type: fileRecord.mimetype,
      uploadDate: fileRecord.createdAt,
      url: `${process.env.PUBLIC_URL || ''}/api/files/${fileRecord._id}/download`,
      description: fileRecord.description,
      tags: fileRecord.tags,
      owner: fileRecord.owner,
      isPublic: fileRecord.isPublic,
    };
    
    res.json({
      message: 'File updated successfully',
      file: responseFile
    });
    
    console.log(`[${new Date().toISOString()}] Updated file: ${fileRecord._id}, user: ${req.user.email}`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Update error:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;