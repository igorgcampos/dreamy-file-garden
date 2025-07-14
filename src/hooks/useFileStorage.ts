import React, { useState, useCallback, useEffect } from 'react';
import { CloudFile, UploadProgress } from '@/types/file';
import { toast } from '@/hooks/use-toast';

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
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [loading, setLoading] = useState(false);

  // List files from backend
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/files`);
      if (!res.ok) throw new Error('Erro ao listar arquivos');
      const data = await res.json();
      // Ajusta datas para objeto Date
      setFiles(data.map((f: any) => ({ ...f, uploadDate: new Date(f.uploadDate) })));
    } catch (error) {
      toast({
        title: 'Erro ao listar arquivos',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Upload file to backend
  const uploadFile = useCallback(async (file: File, description?: string): Promise<CloudFile> => {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setUploadProgress(prev => [...prev, { fileId, progress: 0, status: 'uploading' }]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (description) formData.append('description', description);

      // Progress feedback (simulado, fetch não tem nativo)
      for (let i = 0; i <= 80; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 80));
        setUploadProgress(prev => prev.map(p => p.fileId === fileId ? { ...p, progress: i } : p));
      }

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Erro ao enviar arquivo');
      const cloudFile = await res.json();
      setFiles(prev => [cloudFile, ...prev]);
      setUploadProgress(prev => prev.map(p => p.fileId === fileId ? { ...p, progress: 100, status: 'completed' } : p));
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.fileId !== fileId));
      }, 2000);
      toast({
        title: 'Upload concluído',
        description: `${file.name} foi enviado com sucesso!`,
      });
      return cloudFile;
    } catch (error) {
      setUploadProgress(prev => prev.map(p => p.fileId === fileId ? { ...p, status: 'error' } : p));
      toast({
        title: 'Erro no upload',
        description: `Falha ao enviar ${file.name}`,
        variant: 'destructive',
      });
      throw error;
    }
  }, []);

  // Delete file from backend
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/files/${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao deletar arquivo');
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast({
        title: 'Arquivo deletado',
        description: 'Arquivo removido com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro ao deletar',
        description: 'Falha ao remover o arquivo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Download file from backend
  const downloadFile = useCallback((file: CloudFile) => {
    const link = document.createElement('a');
    link.href = `${API_URL}/files/${encodeURIComponent(file.id)}`;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'Download iniciado',
      description: `Baixando ${file.name}...`,
    });
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