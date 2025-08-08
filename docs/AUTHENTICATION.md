# CloudStorage Authentication System

This document describes the comprehensive authentication system implemented in CloudStorage.

## Overview

The authentication system provides secure user management with multiple authentication methods:

- **JWT-based authentication** with access and refresh tokens
- **Google OAuth 2.0** integration for social login
- **Role-based access control** (RBAC)
- **Secure session management** with HTTP-only cookies
- **Rate limiting** and security middleware
- **Password security** with bcrypt hashing

## Architecture

### Backend Components

1. **User Model** (`backend/models/User.js`)
   - Comprehensive user schema with authentication fields
   - Built-in password hashing and comparison methods
   - Token generation and validation methods
   - User preferences and profile management

2. **JWT Utilities** (`backend/utils/jwt.js`)
   - Access token generation (15 minutes expiry)
   - Refresh token generation (7 days expiry)
   - Token verification and validation
   - Secure token pair management

3. **Authentication Middleware** (`backend/middleware/auth.js`)
   - JWT token verification
   - User authentication and authorization
   - Role-based access control
   - Optional authentication for public endpoints

4. **Authentication Routes** (`backend/routes/auth.js`)
   - User registration and login
   - Token refresh endpoint
   - Profile management
   - Password change functionality
   - Google OAuth integration

5. **Passport Configuration** (`backend/config/passport.js`)
   - JWT strategy for token validation
   - Google OAuth strategy
   - User serialization/deserialization

### Frontend Components

1. **Authentication Context** (`src/contexts/AuthContext.tsx`)
   - Global authentication state management
   - User session persistence
   - Authentication methods (login, register, logout)
   - OAuth redirect handling

2. **API Client** (`src/lib/api.ts`)
   - Axios instance with authentication interceptors
   - Automatic token refresh
   - Request/response error handling
   - Cookie and localStorage token management

3. **UI Components** (`src/components/auth/`)
   - LoginForm: Email/password authentication
   - RegisterForm: User registration
   - UserProfile: Profile management and settings
   - AuthModal: Modal wrapper for auth components
   - GoogleOAuthButton: Google sign-in integration
   - ProtectedRoute: Route protection component

## Authentication Flow

### Registration Flow

1. User provides email, password, and name
2. Backend validates input and checks for existing users
3. Password is hashed using bcrypt
4. User record is created in MongoDB
5. JWT tokens are generated and returned
6. Tokens are stored in HTTP-only cookies
7. User is automatically signed in

### Login Flow

1. User provides email and password
2. Backend validates credentials
3. Password is verified using bcrypt
4. JWT tokens are generated
5. User's last login is updated
6. Tokens are stored in cookies and returned
7. Frontend updates authentication state

### Google OAuth Flow

1. User clicks "Continue with Google" button
2. Redirect to Google OAuth consent screen
3. User grants permissions
4. Google redirects to backend callback
5. Backend receives OAuth tokens and user profile
6. User account is created or linked
7. JWT tokens are generated
8. User is redirected to frontend with success status
9. Frontend detects OAuth success and updates state

### Token Refresh Flow

1. API request fails with 401 Unauthorized
2. Axios interceptor catches the error
3. Refresh token is sent to backend
4. New access token is generated and returned
5. Original request is retried with new token
6. If refresh fails, user is logged out

## Security Features

### Password Security
- Minimum 6 characters with complexity requirements
- Bcrypt hashing with salt rounds
- Secure password change flow

### Token Security
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- HTTP-only cookies to prevent XSS
- Secure flag in production
- Token invalidation on logout

### Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- General API endpoints: 100 requests per 15 minutes (1000 in development)
- IP-based rate limiting

### Security Headers
- Helmet middleware for security headers
- Content Security Policy (CSP)
- CORS configuration with specific origins

### Session Security
- Automatic token refresh
- Session invalidation on security events
- Multiple device support

## Configuration

### Environment Variables

#### Backend (.env)
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d

# Database
MONGODB_URI=mongodb://localhost:27017/cloudstorage

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# CORS
FRONTEND_URL=http://localhost:8080,http://localhost:3000
```

#### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3001
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | User registration | No |
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/logout` | User logout | Yes |
| POST | `/api/auth/refresh` | Refresh tokens | No |
| GET | `/api/auth/profile` | Get user profile | Yes |
| PUT | `/api/auth/profile` | Update profile | Yes |
| PUT | `/api/auth/change-password` | Change password | Yes |
| GET | `/api/auth/google` | Google OAuth start | No |
| GET | `/api/auth/google/callback` | Google OAuth callback | No |

### Protected File Endpoints

All file operations require authentication:

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/files` | List user files | User |
| POST | `/api/files/upload` | Upload file | User |
| GET | `/api/files/:id/download` | Download file | Read access |
| DELETE | `/api/files/:id` | Delete file | Owner/Admin |
| PUT | `/api/files/:id` | Update file metadata | Owner/Admin |

## Usage Examples

### Frontend Authentication

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password123' });
      // User is now authenticated
    } catch (error) {
      // Handle login error
    }
  };

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return <div>Welcome, {user.name}!</div>;
}
```

### Protected Routes

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin">
          <AdminPanel />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
```

### API Requests

```typescript
import { api } from '@/lib/api';

// Authenticated requests automatically include tokens
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/files/upload', formData);
  return response.data;
};
```

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, optional for OAuth users),
  name: String (required),
  avatar: String (optional),
  role: String (enum: ['user', 'admin'], default: 'user'),
  googleId: String (unique, sparse, optional),
  isEmailVerified: Boolean (default: false),
  emailVerificationToken: String (optional),
  passwordResetToken: String (optional),
  passwordResetExpires: Date (optional),
  refreshToken: String (optional),
  lastLogin: Date (optional),
  isActive: Boolean (default: true),
  preferences: {
    theme: String (enum: ['light', 'dark', 'system'], default: 'system'),
    language: String (default: 'en')
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Error Handling

### Common Error Codes

- `NO_TOKEN`: No authentication token provided
- `INVALID_TOKEN`: Token is invalid or malformed
- `TOKEN_EXPIRED`: Access token has expired
- `USER_NOT_FOUND`: User account doesn't exist
- `INVALID_CREDENTIALS`: Wrong email/password
- `USER_EXISTS`: Email already registered
- `ACCOUNT_DEACTIVATED`: User account is disabled
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Development Setup

1. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
npm install
```

2. Set up environment variables (copy from .env.example)

3. Start MongoDB:
```bash
# Using Docker
docker-compose -f docker-compose.dev.yml up mongodb

# Or local MongoDB
mongod
```

4. Start development servers:
```bash
# Backend
cd backend
npm start

# Frontend
npm run dev
```

## Production Deployment

1. Set secure environment variables
2. Configure MongoDB with authentication
3. Set up SSL certificates
4. Configure reverse proxy (nginx)
5. Use Docker Compose for orchestration

```bash
# Production deployment
docker-compose --profile production up -d
```

## Security Considerations

1. **Use strong JWT secrets** in production
2. **Enable MongoDB authentication**
3. **Configure proper CORS origins**
4. **Use HTTPS** in production
5. **Set secure cookie flags**
6. **Regularly rotate secrets**
7. **Monitor authentication logs**
8. **Implement account lockout** for brute force protection
9. **Use environment-specific configurations**
10. **Regular security audits**

## Troubleshooting

### Common Issues

1. **JWT Secret Mismatch**: Ensure JWT secrets match between services
2. **CORS Errors**: Check FRONTEND_URL configuration
3. **MongoDB Connection**: Verify connection string and credentials
4. **Google OAuth**: Ensure redirect URIs match exactly
5. **Token Refresh Loop**: Check for token validation issues

### Debug Commands

```bash
# Check MongoDB connection
docker exec -it cloudstorage-mongodb-dev mongosh

# View application logs
docker logs cloudstorage-backend-dev

# Test API endpoints
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```