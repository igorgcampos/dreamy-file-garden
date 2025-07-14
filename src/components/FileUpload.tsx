import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Image, Music, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UploadProgress } from '@/types/file';
import { formatFileSize, getFileCategory } from '@/lib/fileUtils';

interface FileUploadProps {
  onUpload: (file: File, description?: string) => Promise<void>;
  uploadProgress: UploadProgress[];
}

const getFileIcon = (type: string) => {
  const category = getFileCategory(type);
  switch (category) {
    case 'images': return <Image className="h-6 w-6" />;
    case 'audio': return <Music className="h-6 w-6" />;
    case 'video': return <Video className="h-6 w-6" />;
    case 'documents': return <FileText className="h-6 w-6" />;
    default: return <File className="h-6 w-6" />;
  }
};

export const FileUpload = ({ onUpload, uploadProgress }: FileUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 500 * 1024 * 1024, // 500MB
    multiple: true
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const description = descriptions[file.name] || '';
        await onUpload(file, description);
      }
      
      // Clear files after successful upload
      setSelectedFiles([]);
      setDescriptions({});
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const updateDescription = (fileName: string, description: string) => {
    setDescriptions(prev => ({ ...prev, [fileName]: description }));
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-2 border-dashed border-muted transition-all duration-300 hover:border-primary/50">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`
              relative cursor-pointer transition-all duration-300 rounded-lg p-8 text-center
              ${isDragActive 
                ? 'bg-gradient-upload border-2 border-primary/50 animate-upload-bounce' 
                : 'hover:bg-gradient-upload'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className={`
                p-4 rounded-full bg-primary/10 transition-transform duration-300
                ${isDragActive ? 'scale-110' : 'hover:scale-105'}
              `}>
                <Upload className="h-8 w-8 text-primary" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {isDragActive ? 'Solte os arquivos aqui' : 'Envie seus arquivos'}
                </h3>
                <p className="text-muted-foreground">
                  Arraste e solte ou clique para selecionar arquivos
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Máximo: 500MB por arquivo
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Arquivos Selecionados ({selectedFiles.length})
              </h3>
              <Button 
                onClick={handleUpload}
                disabled={uploading}
                className="bg-gradient-cloud hover:opacity-90"
              >
                {uploading ? 'Enviando...' : 'Enviar Todos'}
              </Button>
            </div>

            <div className="space-y-4">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
                    {getFileIcon(file.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium truncate">{file.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {formatFileSize(file.size)} • {file.type}
                    </p>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`desc-${index}`} className="text-sm">
                        Descrição (opcional)
                      </Label>
                      <Textarea
                        id={`desc-${index}`}
                        placeholder="Adicione uma descrição para este arquivo..."
                        value={descriptions[file.name] || ''}
                        onChange={(e) => updateDescription(file.name, e.target.value)}
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Progresso do Upload</h3>
            <div className="space-y-3">
              {uploadProgress.map((progress) => (
                <div key={progress.fileId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Upload em andamento...</span>
                    <span className="text-muted-foreground">{progress.progress}%</span>
                  </div>
                  <Progress 
                    value={progress.progress} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};