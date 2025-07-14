import { X, Download, FileText, Volume2, Play, Pause } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CloudFile } from '@/types/file';
import { formatFileSize, formatDate, getFileCategory } from '@/lib/fileUtils';

interface FilePreviewProps {
  file: CloudFile | null;
  open: boolean;
  onClose: () => void;
  onDownload: (file: CloudFile) => void;
}

export const FilePreview = ({ file, open, onClose, onDownload }: FilePreviewProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!file) return null;

  const category = getFileCategory(file.type);

  const handleAudioToggle = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const renderPreview = () => {
    switch (category) {
      case 'images':
        return (
          <div className="flex items-center justify-center max-h-[60vh] overflow-hidden rounded-lg bg-black/5">
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        );

      case 'video':
        return (
          <div className="max-h-[60vh] overflow-hidden rounded-lg">
            <video
              ref={videoRef}
              controls
              className="w-full h-full"
              preload="metadata"
            >
              <source src={file.url} type={file.type} />
              Seu navegador não suporta o elemento de vídeo.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-24 h-24 rounded-full bg-gradient-cloud flex items-center justify-center">
              <Volume2 className="h-12 w-12 text-white" />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{file.name}</h3>
              <p className="text-muted-foreground">Arquivo de áudio</p>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="lg"
                onClick={handleAudioToggle}
                className="rounded-full w-16 h-16"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
            </div>

            <audio
              ref={audioRef}
              src={file.url}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full"
              controls
            />
          </div>
        );

      case 'documents':
        if (file.type === 'application/pdf') {
          return (
            <div className="h-[60vh] w-full">
              <iframe
                src={file.url}
                className="w-full h-full border rounded-lg"
                title={file.name}
              />
            </div>
          );
        }
        // Fall through to default for other document types

      default:
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{file.name}</h3>
              <p className="text-muted-foreground mb-4">
                Preview não disponível para este tipo de arquivo
              </p>
              <Button
                onClick={() => onDownload(file)}
                className="bg-gradient-cloud"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Arquivo
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex-1 min-w-0">
            <DialogTitle className="truncate text-lg">{file.name}</DialogTitle>
            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{formatDate(file.uploadDate)}</span>
              <Badge variant="secondary">
                {category}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(file)}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-auto">
          {file.description && (
            <div className="mb-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">{file.description}</p>
            </div>
          )}
          
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
};