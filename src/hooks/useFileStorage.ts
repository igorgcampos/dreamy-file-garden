import React, { useState, useCallback, useEffect } from 'react';
import { CloudFile, UploadProgress } from '@/types/file';
import { toast } from '@/hooks/use-toast';
import { filesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

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
    
    // Create optimistic file entry
    const optimisticFile: CloudFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date(),
      url: '', // Will be updated when real response comes
      description: description,
    };
    
    // Add optimistic file to the list immediately
    setFiles(prev => [optimisticFile, ...prev]);
    
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
      
      const realCloudFile = response.data;
      
      // Replace optimistic file with real data
      setFiles(prev => prev.map(f => 
        f.id === fileId ? realCloudFile : f
      ));
      
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

      // Refresh file list after successful upload
      await fetchFiles();
      
      return realCloudFile;
      
    } catch (error: any) {
      // Remove optimistic file on error
      setFiles(prev => prev.filter(f => f.id !== fileId));
      
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
  }, [isAuthenticated]);

  // Delete file from backend with optimistic updates
  const deleteFile = useCallback(async (fileId: string) => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to delete files',
        variant: 'destructive',
      });
      return;
    }
    
    // Find the file to delete for rollback if needed
    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;
    
    // Optimistic update: remove file immediately
    setFiles(prev => prev.filter(f => f.id !== fileId));
    
    // Show optimistic success toast
    toast({
      title: 'Arquivo deletado',
      description: 'Arquivo removido com sucesso!',
    });
    
    try {
      // Make API call
      await filesAPI.delete(fileId);
    } catch (error: any) {
      // Rollback on error: add file back
      setFiles(prev => [fileToDelete, ...prev]);
      
      toast({
        title: 'Erro ao deletar',
        description: error.response?.data?.error || 'Falha ao remover o arquivo',
        variant: 'destructive',
      });
    }
  }, [isAuthenticated, files]);

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

  // Batch delete files with optimistic updates
  const batchDeleteFiles = useCallback(async (fileIds: string[]) => {
    if (!isAuthenticated || fileIds.length === 0) return;
    
    // Find files to delete for rollback if needed
    const filesToDelete = files.filter(f => fileIds.includes(f.id));
    
    // Optimistic update: remove files immediately
    setFiles(prev => prev.filter(f => !fileIds.includes(f.id)));
    
    // Show optimistic success toast
    toast({
      title: 'Arquivos deletados',
      description: `${fileIds.length} arquivo(s) removido(s) com sucesso!`,
    });
    
    try {
      // Make API calls for each file (could be optimized with a batch endpoint)
      await Promise.all(fileIds.map(id => filesAPI.delete(id)));
    } catch (error: any) {
      // Rollback on error: add files back
      setFiles(prev => [...filesToDelete, ...prev]);
      
      toast({
        title: 'Erro ao deletar arquivos',
        description: error.response?.data?.error || 'Falha ao remover alguns arquivos',
        variant: 'destructive',
      });
    }
  }, [isAuthenticated, files]);

  // Batch download files
  const batchDownloadFiles = useCallback(async (filesToDownload: CloudFile[]) => {
    try {
      // Download each file (in a real app, you might want to create a zip)
      for (const file of filesToDownload) {
        await downloadFile(file);
        // Add a small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      toast({
        title: 'Downloads iniciados',
        description: `Iniciando download de ${filesToDownload.length} arquivo(s)...`,
      });
      
    } catch (error: any) {
      toast({
        title: 'Erro no download em lote',
        description: 'Falha ao baixar alguns arquivos',
        variant: 'destructive',
      });
    }
  }, [downloadFile]);

  return {
    files,
    uploadProgress,
    loading,
    uploadFile,
    deleteFile,
    downloadFile,
    batchDeleteFiles,
    batchDownloadFiles,
  };
};