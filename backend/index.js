import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import passport from './config/passport.js';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';

// Config
dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

// Trust proxy for nginx/docker setup - set before rate limiting
app.set('trust proxy', 1); // Trust first proxy (nginx)

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting configuration (trust proxy set globally)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for OAuth callback to avoid blocking Google redirects
    return req.path === '/api/auth/google/callback';
  }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to 10 for OAuth flows
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', strictLimiter);
app.use('/api', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || ['http://localhost', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// HTTP request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Legacy routes for backward compatibility (redirect to new API routes)
app.get('/files', (req, res) => {
  res.redirect(301, '/api/files');
});

app.post('/upload', (req, res) => {
  res.redirect(307, '/api/files/upload');
});

app.get('/files/:id', (req, res) => {
  res.redirect(301, `/api/files/${req.params.id}/download`);
});

app.delete('/files/:id', (req, res) => {
  res.redirect(307, `/api/files/${req.params.id}`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'File too large',
      code: 'FILE_TOO_LARGE'
    });
  }
  
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

app.listen(port, () => {
  console.log(`🚀 CloudStorage API listening on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${port}/health`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 Auth API: http://localhost:${port}/api/auth`);
    console.log(`📁 Files API: http://localhost:${port}/api/files`);
  }
}); 