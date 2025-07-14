import { useState } from 'react';
import { Search, Grid3X3, List, Download, Eye, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CloudFile, FileFilter, ViewMode } from '@/types/file';
import { formatFileSize, formatDate, getFileCategory, getFileIcon } from '@/lib/fileUtils';

interface FileListProps {
  files: CloudFile[];
  onDownload: (file: CloudFile) => void;
  onDelete: (fileId: string) => void;
  onPreview: (file: CloudFile) => void;
}

export const FileList = ({ files, onDownload, onDelete, onPreview }: FileListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FileFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter files based on search and type
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || getFileCategory(file.type) === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getFilterCount = (type: FileFilter): number => {
    if (type === 'all') return files.length;
    return files.filter(file => getFileCategory(file.type) === type).length;
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar arquivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters and View Toggle */}
            <div className="flex items-center space-x-3">
              <Select value={filterType} onValueChange={(value: FileFilter) => setFilterType(value)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos ({getFilterCount('all')})
                  </SelectItem>
                  <SelectItem value="images">
                    Imagens ({getFilterCount('images')})
                  </SelectItem>
                  <SelectItem value="documents">
                    Documentos ({getFilterCount('documents')})
                  </SelectItem>
                  <SelectItem value="audio">
                    Áudio ({getFilterCount('audio')})
                  </SelectItem>
                  <SelectItem value="video">
                    Vídeo ({getFilterCount('video')})
                  </SelectItem>
                  <SelectItem value="other">
                    Outros ({getFilterCount('other')})
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-semibold mb-2">
              {files.length === 0 ? 'Nenhum arquivo encontrado' : 'Nenhum resultado'}
            </h3>
            <p className="text-muted-foreground">
              {files.length === 0 
                ? 'Faça upload de seus primeiros arquivos para começar'
                : 'Tente ajustar os filtros de busca'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={`
          ${viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-3'
          }
        `}>
          {filteredFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              viewMode={viewMode}
              onDownload={onDownload}
              onDelete={onDelete}
              onPreview={onPreview}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileCardProps {
  file: CloudFile;
  viewMode: ViewMode;
  onDownload: (file: CloudFile) => void;
  onDelete: (fileId: string) => void;
  onPreview: (file: CloudFile) => void;
}

const FileCard = ({ file, viewMode, onDownload, onDelete, onPreview }: FileCardProps) => {
  const category = getFileCategory(file.type);
  const icon = getFileIcon(file.type);

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-card-hover transition-all duration-200 animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* File Icon/Thumbnail */}
            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {file.thumbnail ? (
                <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{icon}</span>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{file.name}</h3>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{formatDate(file.uploadDate)}</span>
                <Badge variant="secondary" className="text-xs">
                  {category}
                </Badge>
              </div>
              {file.description && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {file.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPreview(file)}
                className="hover:bg-info/10 hover:text-info"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(file)}
                className="hover:bg-success/10 hover:text-success"
              >
                <Download className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir "{file.name}"? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(file.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-cloud transition-all duration-300 hover:-translate-y-1 animate-scale-in">
      <CardContent className="p-4">
        {/* File Preview */}
        <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-gradient-card border">
          {file.thumbnail ? (
            <img 
              src={file.thumbnail} 
              alt={file.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-4xl">{icon}</span>
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm truncate" title={file.name}>
            {file.name}
          </h3>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            <Badge variant="secondary" className="text-xs">
              {category}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            {formatDate(file.uploadDate)}
          </p>

          {file.description && (
            <p className="text-xs text-muted-foreground line-clamp-2" title={file.description}>
              {file.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPreview(file)}
            className="flex-1 mr-1 hover:bg-info/10 hover:text-info"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload(file)}
            className="flex-1 mx-1 hover:bg-success/10 hover:text-success"
          >
            <Download className="h-4 w-4 mr-1" />
            Baixar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 ml-1 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir "{file.name}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(file.id)}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};