import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;
    
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Check for token in cookies (for web app)
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }
    
    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
    
  } catch (error) {
    if (error.message === 'Invalid access token' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed.',
      code: 'AUTH_ERROR'
    });
  }
};

export const requireAuth = authenticate;

export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Check for token in cookies
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    
    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Ignore token errors for optional auth
        console.log('Optional auth token error (ignored):', error.message);
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue without authentication
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
  };
};

export const requireAdmin = requireRole('admin');