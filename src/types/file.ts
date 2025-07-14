export interface CloudFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: Date;
  url: string;
  description?: string;
  thumbnail?: string;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export type FileFilter = 'all' | 'images' | 'documents' | 'audio' | 'video' | 'other';

export type ViewMode = 'grid' | 'list';