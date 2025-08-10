import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { 
  User, 
  AuthContextType, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse,
  AuthError 
} from '@/types/auth';
import { authAPI } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on mount
  const checkAuth = useCallback(async () => {
    try {
      // Always try API call since cookies are httpOnly
      const response = await authAPI.getProfile();
      const userData = response.data.user;
      
      setUser(userData);
      setIsAuthenticated(true);
      
    } catch (error: any) {
      // Clear any localStorage tokens (cookies are httpOnly and cleared by server)
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle OAuth redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const error = urlParams.get('error');
    
    if (authStatus === 'success') {
      // OAuth success - check auth status
      checkAuth();
      
      toast({
        title: 'Bem-vindo!',
        description: 'Você fez login com sucesso usando o Google.',
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      let errorMessage = 'Falha na autenticação';
      
      switch (error) {
        case 'oauth_failed':
          errorMessage = 'Falha na autenticação Google OAuth';
          break;
        case 'oauth_callback_failed':
          errorMessage = 'Falha no processamento do callback OAuth';
          break;
        default:
          errorMessage = 'Ocorreu um erro de autenticação';
      }
      
      toast({
        title: 'Erro de Autenticação',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [checkAuth]);

  // Listen for logout events from other tabs or API interceptor
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear tokens
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    };

    window.addEventListener('auth:logout', handleLogout);
    
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  // Store tokens helper
  const storeTokens = (tokens: { accessToken: string; refreshToken: string }) => {
    // Prefer cookies for security, but also store in localStorage as fallback
    if (tokens.accessToken) {
      localStorage.setItem('accessToken', tokens.accessToken);
    }
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      
      const response = await authAPI.login(credentials);
      const data: AuthResponse = response.data;
      
      setUser(data.user);
      setIsAuthenticated(true);
      
      // Tokens are stored as httpOnly cookies by the server
      
      toast({
        title: 'Bem-vindo de volta!',
        description: `Logado como ${data.user.name}`,
      });
      
    } catch (error: any) {
      const authError: AuthError = error.response?.data || { 
        error: 'Falha no login',
        code: 'UNKNOWN_ERROR'
      };
      
      toast({
        title: 'Falha no login',
        description: authError.error,
        variant: 'destructive',
      });
      
      throw authError;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      
      const response = await authAPI.register(data);
      const authData: AuthResponse = response.data;
      
      setUser(authData.user);
      setIsAuthenticated(true);
      
      // Tokens are stored as httpOnly cookies by the server
      
      toast({
        title: 'Conta criada!',
        description: `Bem-vindo ao CloudStorage, ${authData.user.name}!`,
      });
      
    } catch (error: any) {
      const authError: AuthError = error.response?.data || { 
        error: 'Falha no cadastro',
        code: 'UNKNOWN_ERROR'
      };
      
      toast({
        title: 'Falha no cadastro',
        description: authError.error,
        variant: 'destructive',
      });
      
      throw authError;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Even if logout fails on server, clear local state
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear local state
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear tokens
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      toast({
        title: 'Deslogado',
        description: 'Você foi deslogado com sucesso.',
      });
    }
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = Cookies.get('refreshToken') || localStorage.getItem('refreshToken');
      
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await authAPI.refreshToken(refreshTokenValue);
      const { tokens } = response.data;
      
      // New tokens are stored as httpOnly cookies by the server
      
    } catch (error) {
      // Refresh failed, logout user
      await logout();
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Pick<User, 'name' | 'preferences'>>) => {
    try {
      const response = await authAPI.updateProfile(updates);
      const updatedUser = response.data.user;
      
      setUser(updatedUser);
      
      toast({
        title: 'Perfil atualizado',
        description: 'Seu perfil foi atualizado com sucesso.',
      });
      
    } catch (error: any) {
      const authError: AuthError = error.response?.data || { 
        error: 'Falha na atualização do perfil',
        code: 'UNKNOWN_ERROR'
      };
      
      toast({
        title: 'Falha na atualização',
        description: authError.error,
        variant: 'destructive',
      });
      
      throw authError;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      
      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi atualizada com sucesso.',
      });
      
    } catch (error: any) {
      const authError: AuthError = error.response?.data || { 
        error: 'Falha na alteração da senha',
        code: 'UNKNOWN_ERROR'
      };
      
      toast({
        title: 'Falha na alteração da senha',
        description: authError.error,
        variant: 'destructive',
      });
      
      throw authError;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};