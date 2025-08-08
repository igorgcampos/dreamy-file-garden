export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  lastLogin?: Date;
  isActive: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
}

export interface AuthError {
  error: string;
  code?: string;
  details?: Array<{
    field?: string;
    message: string;
  }>;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'preferences'>>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
  fallback?: React.ReactNode;
}

export interface FilePermission {
  permission: 'read' | 'write' | 'owner';
}

export interface FileAccessInfo extends FilePermission {
  canDownload: boolean;
  canDelete: boolean;
  canShare: boolean;
  canEdit: boolean;
}