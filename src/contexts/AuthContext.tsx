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
      const token = Cookies.get('accessToken') || localStorage.getItem('accessToken');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await authAPI.getProfile();
      const userData = response.data.user;
      
      setUser(userData);
      setIsAuthenticated(true);
      
    } catch (error: any) {
      // Clear invalid tokens
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
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
        title: 'Welcome!',
        description: 'You have successfully signed in with Google.',
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      let errorMessage = 'Authentication failed';
      
      switch (error) {
        case 'oauth_failed':
          errorMessage = 'Google OAuth authentication failed';
          break;
        case 'oauth_callback_failed':
          errorMessage = 'OAuth callback processing failed';
          break;
        default:
          errorMessage = 'Authentication error occurred';
      }
      
      toast({
        title: 'Authentication Error',
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
      
      // Store tokens
      storeTokens(data.tokens);
      
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${data.user.name}`,
      });
      
    } catch (error: any) {
      const authError: AuthError = error.response?.data || { 
        error: 'Login failed',
        code: 'UNKNOWN_ERROR'
      };
      
      toast({
        title: 'Login failed',
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
      
      // Store tokens
      storeTokens(authData.tokens);
      
      toast({
        title: 'Account created!',
        description: `Welcome to CloudStorage, ${authData.user.name}!`,
      });
      
    } catch (error: any) {
      const authError: AuthError = error.response?.data || { 
        error: 'Registration failed',
        code: 'UNKNOWN_ERROR'
      };
      
      toast({
        title: 'Registration failed',
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
        title: 'Logged out',
        description: 'You have been successfully logged out.',
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
      
      // Store new tokens
      storeTokens(tokens);
      
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
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
      
    } catch (error: any) {
      const authError: AuthError = error.response?.data || { 
        error: 'Profile update failed',
        code: 'UNKNOWN_ERROR'
      };
      
      toast({
        title: 'Update failed',
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
        title: 'Password changed',
        description: 'Your password has been successfully updated.',
      });
      
    } catch (error: any) {
      const authError: AuthError = error.response?.data || { 
        error: 'Password change failed',
        code: 'UNKNOWN_ERROR'
      };
      
      toast({
        title: 'Password change failed',
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