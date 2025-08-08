import { useState, useMemo, memo, useCallback } from 'react';
import { Search, Grid3X3, List, Download, Eye, Trash2, Filter, Check, X, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CloudFile, FileFilter, ViewMode } from '@/types/file';
import { formatFileSize, formatDate, getFileCategory, getFileIcon } from '@/lib/fileUtils';
import { FileListSkeleton } from '@/components/FileListSkeleton';
import { LazyImage } from '@/components/LazyImage';

interface FileListProps {
  files: CloudFile[];
  onDownload: (file: CloudFile) => void;
  onDelete: (fileId: string) => void;
  onPreview: (file: CloudFile) => void;
  loading?: boolean;
  onBatchDelete?: (fileIds: string[]) => void;
  onBatchDownload?: (files: CloudFile[]) => void;
}

export const FileList = memo(({ files, onDownload, onDelete, onPreview, loading = false, onBatchDelete, onBatchDownload }: FileListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FileFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Memoize filtered files to prevent unnecessary recalculations
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           file.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterType === 'all' || getFileCategory(file.type) === filterType;
      
      return matchesSearch && matchesFilter;
    });
  }, [files, searchTerm, filterType]);

  // Memoize filter counts to prevent recalculation on every render
  const filterCounts = useMemo(() => {
    const counts = {
      all: files.length,
      images: 0,
      documents: 0,
      audio: 0,
      video: 0,
      other: 0
    };
    
    files.forEach(file => {
      const category = getFileCategory(file.type);
      if (category !== 'all') {
        counts[category as keyof typeof counts]++;
      }
    });
    
    return counts;
  }, [files]);

  const getFilterCount = useCallback((type: FileFilter): number => {
    return filterCounts[type];
  }, [filterCounts]);

  // Selection handlers
  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);

  const selectAllFiles = useCallback(() => {
    setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
  }, [filteredFiles]);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
    setIsSelectionMode(false);
  }, []);

  // Batch operations
  const handleBatchDelete = useCallback(() => {
    if (selectedFiles.size > 0 && onBatchDelete) {
      onBatchDelete(Array.from(selectedFiles));
      clearSelection();
    }
  }, [selectedFiles, onBatchDelete, clearSelection]);

  const handleBatchDownload = useCallback(() => {
    if (selectedFiles.size > 0 && onBatchDownload) {
      const selectedFileObjects = files.filter(f => selectedFiles.has(f.id));
      onBatchDownload(selectedFileObjects);
      clearSelection();
    }
  }, [selectedFiles, onBatchDownload, files, clearSelection]);

  // Show skeleton loading state
  if (loading) {
    return <FileListSkeleton viewMode={viewMode} count={12} />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <Card>
        <CardContent className="p-6">
          {/* Batch Operations Bar */}
          {isSelectionMode && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium">
                    {selectedFiles.size} arquivo(s) selecionado(s)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllFiles}
                    disabled={selectedFiles.size === filteredFiles.length}
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Selecionar Todos
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  {onBatchDownload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBatchDownload}
                      disabled={selectedFiles.size === 0}
                      className="hover:bg-success/10 hover:text-success"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Baixar Selecionados
                    </Button>
                  )}
                  
                  {onBatchDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={selectedFiles.size === 0}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir Selecionados
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir {selectedFiles.size} arquivo(s) selecionado(s)? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleBatchDelete}>
                            Excluir {selectedFiles.size} arquivo(s)
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar arquivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Buscar arquivos por nome ou descrição"
                role="searchbox"
              />
            </div>

            {/* Filters and View Toggle */}
            <div className="flex items-center space-x-3">
              <Select value={filterType} onValueChange={(value: FileFilter) => setFilterType(value)}>
                <SelectTrigger className="w-[180px]" aria-label="Filtrar arquivos por tipo">
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

              <div className="flex items-center space-x-2">
                {!isSelectionMode && (onBatchDelete || onBatchDownload) && filteredFiles.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSelectionMode(true)}
                    aria-label="Ativar modo de seleção"
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Selecionar
                  </Button>
                )}
                
                <div className="flex items-center border rounded-lg" role="group" aria-label="Modo de visualização">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                    aria-label="Visualização em grade"
                    aria-pressed={viewMode === 'grid'}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                    aria-label="Visualização em lista"
                    aria-pressed={viewMode === 'list'}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
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
        <div 
          className={`
            ${viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
              : 'space-y-3'
            }
          `}
          role="region"
          aria-label={`${filteredFiles.length} arquivos encontrados`}
        >
          {filteredFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              viewMode={viewMode}
              onDownload={onDownload}
              onDelete={onDelete}
              onPreview={onPreview}
              isSelectionMode={isSelectionMode}
              isSelected={selectedFiles.has(file.id)}
              onToggleSelection={toggleFileSelection}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
FileList.displayName = 'FileList';

interface FileCardProps {
  file: CloudFile;
  viewMode: ViewMode;
  onDownload: (file: CloudFile) => void;
  onDelete: (fileId: string) => void;
  onPreview: (file: CloudFile) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (fileId: string) => void;
}

const FileCard = memo(({ file, viewMode, onDownload, onDelete, onPreview, isSelectionMode = false, isSelected = false, onToggleSelection }: FileCardProps) => {
  // Memoize expensive calculations
  const category = useMemo(() => getFileCategory(file.type), [file.type]);
  const icon = useMemo(() => getFileIcon(file.type), [file.type]);
  
  // Memoize callback functions to prevent child re-renders
  const handleDownload = useCallback(() => onDownload(file), [onDownload, file]);
  const handleDelete = useCallback(() => onDelete(file.id), [onDelete, file.id]);
  const handlePreview = useCallback(() => onPreview(file), [onPreview, file]);
  const handleToggleSelection = useCallback(() => onToggleSelection?.(file.id), [onToggleSelection, file.id]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isSelectionMode) {
        handleToggleSelection();
      } else {
        handlePreview();
      }
    }
  }, [isSelectionMode, handleToggleSelection, handlePreview]);

  // Handle card click
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      handleToggleSelection();
    }
  }, [isSelectionMode, handleToggleSelection]);

  if (viewMode === 'list') {
    return (
      <Card 
        className={`hover:shadow-card-hover transition-all duration-200 animate-fade-in focus-within:ring-2 focus-within:ring-primary ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={handleCardClick}
        role="button"
        aria-label={`Arquivo ${file.name}, ${category}, ${formatFileSize(file.size)}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* Selection Checkbox */}
            {isSelectionMode && (
              <div className="flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSelection();
                  }}
                  className="p-0 h-6 w-6"
                  aria-label={`${isSelected ? 'Desmarcar' : 'Marcar'} ${file.name}`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
            
            {/* File Icon/Thumbnail */}
            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {file.thumbnail ? (
                <LazyImage 
                  src={file.thumbnail} 
                  alt={file.name} 
                  className="w-full h-full"
                  fallback={<span className="text-2xl">{icon}</span>}
                />
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
                onClick={handlePreview}
                className="hover:bg-info/10 hover:text-info"
                aria-label={`Visualizar ${file.name}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="hover:bg-success/10 hover:text-success"
                aria-label={`Baixar ${file.name}`}
              >
                <Download className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Excluir ${file.name}`}
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
                    <AlertDialogAction onClick={handleDelete}>
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
    <Card 
      className={`group hover:shadow-cloud transition-all duration-300 hover:-translate-y-1 animate-scale-in focus-within:ring-2 focus-within:ring-primary ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleCardClick}
      role="button"
      aria-label={`Arquivo ${file.name}, ${category}, ${formatFileSize(file.size)}`}
    >
      <CardContent className="p-4">
        {/* File Preview */}
        <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-gradient-card border relative">
          {/* Selection Checkbox */}
          {isSelectionMode && (
            <div className="absolute top-2 right-2 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSelection();
                }}
                className="p-1 h-6 w-6 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                aria-label={`${isSelected ? 'Desmarcar' : 'Marcar'} ${file.name}`}
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          {file.thumbnail ? (
            <LazyImage 
              src={file.thumbnail} 
              alt={file.name}
              className="w-full h-full transition-transform duration-300 group-hover:scale-105"
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-4xl">{icon}</span>
                </div>
              }
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
            onClick={handlePreview}
            className="flex-1 mr-1 hover:bg-info/10 hover:text-info"
            aria-label={`Visualizar ${file.name}`}
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="flex-1 mx-1 hover:bg-success/10 hover:text-success"
            aria-label={`Baixar ${file.name}`}
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
                aria-label={`Excluir ${file.name}`}
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
                <AlertDialogAction onClick={handleDelete}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
});

// Add display name for debugging
FileCard.displayName = 'FileCard';