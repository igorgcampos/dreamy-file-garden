import React, { useState, useCallback, useEffect } from 'react';
import { CloudFile, UploadProgress } from '@/types/file';
import { toast } from '@/hooks/use-toast';
import { filesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://44.222.181.172:3001';

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export const useFileStorage = () => {
  const { isAuthenticated } = useAuth();
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [loading, setLoading] = useState(false);

  // List files from backend
  const fetchFiles = useCallback(async () => {
    if (!isAuthenticated) {
      setFiles([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await filesAPI.list();
      const data = response.data;
      
      // Handle both paginated and non-paginated responses
      const filesList = data.files || data;
      
      // Adjust dates to Date objects
      setFiles(filesList.map((f: any) => ({ 
        ...f, 
        uploadDate: new Date(f.uploadDate || f.createdAt)
      })));
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast({
        title: 'Erro ao listar arquivos',
        description: error.response?.data?.error || error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Upload file to backend
  const uploadFile = useCallback(async (file: File, description?: string): Promise<CloudFile> => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to upload files',
        variant: 'destructive',
      });
      throw new Error('Authentication required');
    }
    
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setUploadProgress(prev => [...prev, { fileId, progress: 0, status: 'uploading' }]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (description) formData.append('description', description);

      const response = await filesAPI.upload(formData, (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => prev.map(p => 
            p.fileId === fileId ? { ...p, progress } : p
          ));
        }
      });
      
      const cloudFile = response.data;
      
      setFiles(prev => [cloudFile, ...prev]);
      setUploadProgress(prev => prev.map(p => 
        p.fileId === fileId ? { ...p, progress: 100, status: 'completed' } : p
      ));
      
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.fileId !== fileId));
      }, 2000);
      
      toast({
        title: 'Upload concluído',
        description: `${file.name} foi enviado com sucesso!`,
      });
      
      await fetchFiles(); // Update file list after upload
      return cloudFile;
      
    } catch (error: any) {
      setUploadProgress(prev => prev.map(p => 
        p.fileId === fileId ? { ...p, status: 'error' } : p
      ));
      
      toast({
        title: 'Erro no upload',
        description: error.response?.data?.error || `Falha ao enviar ${file.name}`,
        variant: 'destructive',
      });
      
      throw error;
    }
  }, [isAuthenticated, fetchFiles]);

  // Delete file from backend
  const deleteFile = useCallback(async (fileId: string) => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to delete files',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setLoading(true);
      await filesAPI.delete(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast({
        title: 'Arquivo deletado',
        description: 'Arquivo removido com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar',
        description: error.response?.data?.error || 'Falha ao remover o arquivo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Download file from backend
  const downloadFile = useCallback(async (file: CloudFile) => {
    try {
      const response = await filesAPI.download(file.id);
      
      // Create blob from response
      const blob = new Blob([response.data], { 
        type: file.type || 'application/octet-stream' 
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Download iniciado',
        description: `Baixando ${file.name}...`,
        duration: 3000,
      });
      
    } catch (error: any) {
      toast({
        title: 'Erro no download',
        description: error.response?.data?.error || `Falha ao baixar ${file.name}`,
        variant: 'destructive',
      });
    }
  }, []);

  return {
    files,
    uploadProgress,
    loading,
    uploadFile,
    deleteFile,
    downloadFile,
  };
};