import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRouteProps } from '@/types/auth';

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  fallback 
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return URL
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // If role is required, check user role
  if (requiredRole && user) {
    const userRoles = Array.isArray(user.role) ? user.role : [user.role];
    
    if (!userRoles.includes(requiredRole)) {
      return fallback || (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-muted-foreground">
              Required role: {requiredRole}
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

// Higher-order component version
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: 'user' | 'admin'
) => {
  const AuthenticatedComponent = (props: P) => (
    <ProtectedRoute requiredRole={requiredRole}>
      <Component {...props} />
    </ProtectedRoute>
  );

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return AuthenticatedComponent;
};