import { useState } from 'react';
import { Cloud, Upload as UploadIcon, Files, User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileUpload } from '@/components/FileUpload';
import { FileList } from '@/components/FileList';
import { FilePreview } from '@/components/FilePreview';
import { AuthModal, AuthModalMode } from '@/components/auth/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { useFileStorage } from '@/hooks/useFileStorage';
import { CloudFile } from '@/types/file';

const Index = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { files, uploadProgress, loading, uploadFile, deleteFile, downloadFile, batchDeleteFiles, batchDownloadFiles } = useFileStorage();
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  const handleUpload = async (file: File, description?: string) => {
    await uploadFile(file, description);
    // Switch to files tab after upload
    if (activeTab === 'upload') {
      setActiveTab('files');
    }
  };

  const handlePreview = (file: CloudFile) => {
    setPreviewFile(file);
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const handleAuthClick = (mode: AuthModalMode) => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-cloud flex items-center justify-center">
                <Cloud className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-cloud-secondary bg-clip-text text-transparent">
                  CloudStorage
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie seus arquivos na nuvem
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{files.length} arquivos</p>
                <p className="text-xs text-muted-foreground">
                  {files.reduce((total, file) => total + file.size, 0) > 0 
                    ? `${(files.reduce((total, file) => total + file.size, 0) / (1024 * 1024)).toFixed(1)} MB utilizados`
                    : 'Nenhum arquivo'
                  }
                </p>
              </div>
              
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback>
                          {user ? getInitials(user.name) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAuthClick('profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleAuthClick('login')}
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => handleAuthClick('register')}
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          {files.length === 0 && (
            <div className="text-center mb-12 animate-fade-in">
              <div className="w-24 h-24 rounded-full bg-gradient-cloud mx-auto mb-6 flex items-center justify-center">
                <Cloud className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">
                {isAuthenticated 
                  ? `Bem-vindo, ${user?.name}!` 
                  : 'Bem-vindo ao CloudStorage'
                }
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                {isAuthenticated 
                  ? 'Faça upload, organize e acesse seus arquivos de qualquer lugar'
                  : 'Entre em sua conta para começar a gerenciar seus arquivos na nuvem'
                }
              </p>
              {!isAuthenticated && (
                <div className="flex justify-center space-x-4">
                  <Button 
                    size="lg"
                    onClick={() => handleAuthClick('login')}
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Entrar
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={() => handleAuthClick('register')}
                  >
                    <User className="mr-2 h-5 w-5" />
                    Criar Conta
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Show content only if authenticated */}
          {isAuthenticated ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
                <TabsTrigger value="upload" className="flex items-center space-x-2">
                  <UploadIcon className="h-4 w-4" />
                  <span>Upload</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center space-x-2">
                  <Files className="h-4 w-4" />
                  <span>Arquivos ({files.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="animate-fade-in">
                <FileUpload 
                  onUpload={handleUpload}
                  uploadProgress={uploadProgress}
                />
              </TabsContent>

              <TabsContent value="files" className="animate-fade-in">
                <FileList
                  files={files}
                  loading={loading}
                  onDownload={downloadFile}
                  onDelete={deleteFile}
                  onPreview={handlePreview}
                  onBatchDelete={batchDeleteFiles}
                  onBatchDownload={batchDownloadFiles}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground mb-8">
                Entre em sua conta para acessar seus arquivos
              </p>
            </div>
          )}
        </div>
      </main>

      {/* File Preview Modal */}
      <FilePreview
        file={previewFile}
        open={!!previewFile}
        onClose={closePreview}
        onDownload={downloadFile}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />

      {/* Footer */}
      <footer className="border-t bg-card/30 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>CloudStorage - Sua solução completa para armazenamento em nuvem</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
