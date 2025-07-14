import { useState, useCallback } from 'react';
import { CloudFile, UploadProgress } from '@/types/file';
import { generateThumbnail } from '@/lib/fileUtils';
import { toast } from '@/hooks/use-toast';

export const useFileStorage = () => {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [loading, setLoading] = useState(false);

  // Simulated file storage - in production this would connect to real cloud storage API
  const uploadFile = useCallback(async (file: File, description?: string): Promise<CloudFile> => {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to upload progress
    setUploadProgress(prev => [...prev, {
      fileId,
      progress: 0,
      status: 'uploading'
    }]);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(prev => prev.map(p => 
          p.fileId === fileId ? { ...p, progress: i } : p
        ));
      }

      // Generate thumbnail for images
      const thumbnail = await generateThumbnail(file);
      
      // Create file URL (in production this would be the cloud storage URL)
      const url = URL.createObjectURL(file);

      const cloudFile: CloudFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date(),
        url,
        description,
        thumbnail: thumbnail || undefined
      };

      // Mark as completed
      setUploadProgress(prev => prev.map(p => 
        p.fileId === fileId ? { ...p, status: 'completed' } : p
      ));

      // Add to files list
      setFiles(prev => [cloudFile, ...prev]);

      // Remove from progress after delay
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.fileId !== fileId));
      }, 2000);

      toast({
        title: "Upload concluído",
        description: `${file.name} foi enviado com sucesso!`,
      });

      return cloudFile;
    } catch (error) {
      setUploadProgress(prev => prev.map(p => 
        p.fileId === fileId ? { ...p, status: 'error' } : p
      ));
      
      toast({
        title: "Erro no upload",
        description: `Falha ao enviar ${file.name}`,
        variant: "destructive",
      });
      
      throw error;
    }
  }, []);

  const deleteFile = useCallback(async (fileId: string) => {
    try {
      setLoading(true);
      
      // Find file to get its URL for cleanup
      const file = files.find(f => f.id === fileId);
      if (file?.url) {
        URL.revokeObjectURL(file.url);
      }

      // Remove from files list
      setFiles(prev => prev.filter(f => f.id !== fileId));
      
      toast({
        title: "Arquivo deletado",
        description: "Arquivo removido com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro ao deletar",
        description: "Falha ao remover o arquivo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [files]);

  const downloadFile = useCallback((file: CloudFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download iniciado",
      description: `Baixando ${file.name}...`,
    });
  }, []);

  return {
    files,
    uploadProgress,
    loading,
    uploadFile,
    deleteFile,
    downloadFile
  };
};