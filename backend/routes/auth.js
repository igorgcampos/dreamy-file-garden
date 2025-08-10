import express from 'express';
import { body, validationResult } from 'express-validator';
import passport from '../config/passport.js';
import User from '../models/User.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Helper function to set auth cookies
const setAuthCookies = (res, accessToken, refreshToken) => {
  // Use secure cookies only on HTTPS (not just production)
  const isSecure = process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true';
  
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// Helper function to clear auth cookies
const clearAuthCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

// Register
router.post('/register', validateRegistration, async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /auth/register from ${req.ip}`);
  
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn(`[${new Date().toISOString()}] Registration validation failed:`, errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }
    
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn(`[${new Date().toISOString()}] Registration failed: User already exists for ${email}`);
      return res.status(409).json({
        error: 'User with this email already exists',
        code: 'USER_EXISTS',
      });
    }
    
    // Create new user
    const user = new User({
      email,
      password,
      name,
    });
    
    // Generate email verification token
    user.generateEmailVerificationToken();
    
    await user.save();
    
    // Generate JWT tokens
    const tokens = generateTokenPair(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();
    
    // Set cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    
    console.log(`[${new Date().toISOString()}] User registered successfully: ${user.email}`);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      tokens,
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Registration error:`, error);
    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR',
    });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /auth/login from ${req.ip}`);
  
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn(`[${new Date().toISOString()}] Login validation failed:`, errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }
    
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.warn(`[${new Date().toISOString()}] Login failed: User not found for ${email}`);
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      console.warn(`[${new Date().toISOString()}] Login failed: Account deactivated for ${email}`);
      return res.status(401).json({
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.warn(`[${new Date().toISOString()}] Login failed: Invalid password for ${email}`);
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }
    
    // Generate JWT tokens
    const tokens = generateTokenPair(user._id);
    user.refreshToken = tokens.refreshToken;
    user.updateLastLogin();
    await user.save();
    
    // Set cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    
    console.log(`[${new Date().toISOString()}] User logged in successfully: ${user.email}`);
    
    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      tokens,
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Login error:`, error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR',
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /auth/refresh from ${req.ip}`);
  
  try {
    let refreshToken = null;
    
    // Check for refresh token in body or cookies
    if (req.body.refreshToken) {
      refreshToken = req.body.refreshToken;
    } else if (req.cookies && req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    }
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN',
      });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user and validate stored refresh token
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      console.warn(`[${new Date().toISOString()}] Refresh failed: Invalid token for user ${decoded.userId}`);
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }
    
    // Generate new tokens
    const tokens = generateTokenPair(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();
    
    // Set new cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    
    console.log(`[${new Date().toISOString()}] Tokens refreshed for user: ${user.email}`);
    
    res.json({
      message: 'Tokens refreshed successfully',
      tokens,
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Refresh token error:`, error);
    
    if (error.message === 'Invalid refresh token') {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }
    
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR',
    });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /auth/logout from ${req.ip}, user: ${req.user.email}`);
  
  try {
    // Clear refresh token from database
    req.user.refreshToken = null;
    await req.user.save();
    
    // Clear cookies
    clearAuthCookies(res);
    
    console.log(`[${new Date().toISOString()}] User logged out successfully: ${req.user.email}`);
    
    res.json({
      message: 'Logout successful',
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Logout error:`, error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR',
    });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json({
      user: req.user.toJSON(),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Get profile error:`, error);
    res.status(500).json({
      error: 'Failed to get profile',
      code: 'PROFILE_ERROR',
    });
  }
});

// Update user profile
router.put('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('preferences.theme').optional().isIn(['light', 'dark', 'system']).withMessage('Invalid theme'),
  body('preferences.language').optional().isString().withMessage('Invalid language'),
], async (req, res) => {
  console.log(`[${new Date().toISOString()}] PUT /auth/profile from ${req.ip}, user: ${req.user.email}`);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }
    
    const allowedUpdates = ['name', 'preferences'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    Object.assign(req.user, updates);
    await req.user.save();
    
    console.log(`[${new Date().toISOString()}] Profile updated for user: ${req.user.email}`);
    
    res.json({
      message: 'Profile updated successfully',
      user: req.user.toJSON(),
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Update profile error:`, error);
    res.status(500).json({
      error: 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR',
    });
  }
});

// Change password
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
], async (req, res) => {
  console.log(`[${new Date().toISOString()}] PUT /auth/change-password from ${req.ip}, user: ${req.user.email}`);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Verify current password
    const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
      });
    }
    
    // Update password
    req.user.password = newPassword;
    req.user.refreshToken = null; // Invalidate refresh token
    await req.user.save();
    
    console.log(`[${new Date().toISOString()}] Password changed for user: ${req.user.email}`);
    
    res.json({
      message: 'Password changed successfully',
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Change password error:`, error);
    res.status(500).json({
      error: 'Failed to change password',
      code: 'PASSWORD_CHANGE_ERROR',
    });
  }
});

// Google OAuth routes
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Initiate Google OAuth
  router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  }));

  // Google OAuth callback
  router.get('/google/callback', 
    passport.authenticate('google', { 
      session: false,
      failureRedirect: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL.split(',')[0]}?error=oauth_failed` : '/?error=oauth_failed'
    }),
    async (req, res) => {
      console.log(`[${new Date().toISOString()}] Google OAuth callback for user: ${req.user.email}`);
      
      try {
        // Generate JWT tokens
        const tokens = generateTokenPair(req.user._id);
        req.user.refreshToken = tokens.refreshToken;
        await req.user.save();
        
        // Set cookies
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        
        // Redirect to frontend with success
        const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0] : 'http://localhost';
        res.redirect(`${frontendUrl}?auth=success`);
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Google OAuth callback error:`, error);
        const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0] : 'http://localhost';
        res.redirect(`${frontendUrl}?error=oauth_callback_failed`);
      }
    }
  );
} else {
  // Placeholder routes when Google OAuth is not configured
  router.get('/google', (req, res) => {
    res.status(501).json({
      error: 'Google OAuth not configured',
      code: 'OAUTH_NOT_CONFIGURED'
    });
  });
  
  router.get('/google/callback', (req, res) => {
    res.status(501).json({
      error: 'Google OAuth not configured',
      code: 'OAUTH_NOT_CONFIGURED'
    });
  });
}

export default router;