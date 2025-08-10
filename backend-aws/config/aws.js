// AWS Services Configuration for CloudStorage Migration
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

// AWS Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET;

if (!S3_BUCKET) {
  console.error('S3_BUCKET environment variable is required');
  process.exit(1);
}

// S3 Client Configuration - optimized for cost and performance
const s3Client = new S3Client({
  region: AWS_REGION,
  // Use instance profile or IAM roles in production
  // credentials will be automatically retrieved from:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. IAM instance profile (recommended for EC2/ECS)
  // 3. IAM role (recommended for ECS Fargate)
  
  // Performance optimizations
  maxAttempts: 3,
  requestTimeout: 30000, // 30 seconds
  
  // Cost optimization: use regional endpoint
  forcePathStyle: false,
  useAccelerateEndpoint: false, // Enable only if global users need faster uploads
});

// File upload with automatic multipart for large files
export const uploadToS3 = async (fileBuffer, fileName, mimetype, metadata = {}) => {
  try {
    console.log(`[${new Date().toISOString()}] Starting S3 upload: ${fileName}`);
    
    // Create upload instance with automatic multipart handling
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimetype,
        
        // Cost optimization: use Standard storage class
        // Files will be automatically moved to IA/Glacier via lifecycle rules
        StorageClass: 'STANDARD',
        
        // Metadata for file management
        Metadata: {
          'original-name': encodeURIComponent(metadata.originalName || fileName),
          'uploaded-by': metadata.uploaderId || 'system',
          'file-id': metadata.fileId || '',
          'upload-date': new Date().toISOString(),
          ...metadata
        },
        
        // Server-side encryption (cost-effective AES256)
        ServerSideEncryption: 'AES256',
        
        // Cache control for CloudFront
        CacheControl: 'max-age=31536000', // 1 year for static files
      },
    });

    // Monitor upload progress (optional)
    upload.on('httpUploadProgress', (progress) => {
      if (progress.total) {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        console.log(`Upload progress: ${percentage}%`);
      }
    });

    const result = await upload.done();
    console.log(`[${new Date().toISOString()}] S3 upload completed: ${fileName}`);
    
    return {
      success: true,
      key: fileName,
      etag: result.ETag,
      location: result.Location,
      bucket: S3_BUCKET
    };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] S3 upload error:`, error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

// Generate presigned URL for secure downloads
export const generatePresignedUrl = async (fileName, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileName,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    
    console.log(`[${new Date().toISOString()}] Generated presigned URL for: ${fileName}`);
    return signedUrl;
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Presigned URL error:`, error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

// Delete file from S3
export const deleteFromS3 = async (fileName) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileName,
    });

    await s3Client.send(command);
    console.log(`[${new Date().toISOString()}] Deleted from S3: ${fileName}`);
    
    return { success: true };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] S3 delete error:`, error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

// Check if file exists in S3
export const fileExistsInS3 = async (fileName) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileName,
    });

    await s3Client.send(command);
    return true;
    
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
};

// Get file metadata from S3
export const getS3FileMetadata = async (fileName) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileName,
    });

    const response = await s3Client.send(command);
    
    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      etag: response.ETag,
      metadata: response.Metadata || {},
      storageClass: response.StorageClass || 'STANDARD'
    };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] S3 metadata error:`, error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
};

// Batch operations for cost efficiency
export const batchDeleteFromS3 = async (fileNames) => {
  if (!fileNames || fileNames.length === 0) return { success: true };
  
  try {
    // S3 supports up to 1000 objects per delete request
    const chunks = [];
    for (let i = 0; i < fileNames.length; i += 1000) {
      chunks.push(fileNames.slice(i, i + 1000));
    }
    
    const results = [];
    for (const chunk of chunks) {
      const deleteParams = {
        Bucket: S3_BUCKET,
        Delete: {
          Objects: chunk.map(fileName => ({ Key: fileName })),
          Quiet: true, // Don't return info about successful deletions
        },
      };
      
      const result = await s3Client.send(new DeleteObjectsCommand(deleteParams));
      results.push(result);
    }
    
    console.log(`[${new Date().toISOString()}] Batch deleted ${fileNames.length} files from S3`);
    return { success: true, results };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] S3 batch delete error:`, error);
    throw new Error(`Failed to batch delete files: ${error.message}`);
  }
};

// Health check for S3 connectivity
export const s3HealthCheck = async () => {
  try {
    // Simple operation to test connectivity
    const command = new HeadBucketCommand({ Bucket: S3_BUCKET });
    await s3Client.send(command);
    
    return { 
      status: 'healthy',
      service: 'S3',
      bucket: S3_BUCKET,
      region: AWS_REGION
    };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] S3 health check failed:`, error);
    return {
      status: 'unhealthy',
      service: 'S3',
      error: error.message
    };
  }
};

export { s3Client, S3_BUCKET, AWS_REGION };