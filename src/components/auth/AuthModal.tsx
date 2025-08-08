import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { UserProfile } from './UserProfile';
import { useAuth } from '@/contexts/AuthContext';

export type AuthModalMode = 'login' | 'register' | 'profile';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: AuthModalMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultMode = 'login' 
}) => {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<AuthModalMode>(defaultMode);

  // Reset mode when opening/closing
  React.useEffect(() => {
    if (isOpen) {
      if (isAuthenticated) {
        setMode('profile');
      } else {
        setMode(defaultMode);
      }
    }
  }, [isOpen, isAuthenticated, defaultMode]);

  const handleSuccess = () => {
    onClose();
  };

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Entrar';
      case 'register':
        return 'Criar Conta';
      case 'profile':
        return 'Seu Perfil';
      default:
        return 'Autenticação';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Title is now handled by individual components */}
        </DialogHeader>
        
        <div className="py-4">
          {mode === 'login' && (
            <LoginForm
              onSwitchToRegister={() => setMode('register')}
              onSuccess={handleSuccess}
            />
          )}
          
          {mode === 'register' && (
            <RegisterForm
              onSwitchToLogin={() => setMode('login')}
              onSuccess={handleSuccess}
            />
          )}
          
          {mode === 'profile' && (
            <UserProfile onClose={onClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};