/**
 * Secure Express proxy server for Replicate API
 * Implements auth, rate limiting, and CORS restrictions
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

// Security configuration
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const FRONTEND_AUTH_TOKEN = process.env.FRONTEND_AUTH_TOKEN || 'dev-token-change-in-production';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

// Add Vercel production URL if not already included
const VERCEL_URL = process.env.VERCEL_URL || 'https://tat-t-3x8t.vercel.app';
if (!ALLOWED_ORIGINS.includes(VERCEL_URL)) {
  ALLOWED_ORIGINS.push(VERCEL_URL);
}

// CORS middleware with whitelist and proper preflight handling
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('[CORS] Request with no origin - allowing');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      console.log(`[CORS] Origin ${origin} allowed (exact match)`);
      return callback(null, true);
    }
    
    // Allow Vercel preview URLs (pattern: *.vercel.app)
    // This covers both production and preview deployments
    if (origin.endsWith('.vercel.app')) {
      console.log(`[CORS] Origin ${origin} allowed (Vercel domain)`);
      return callback(null, true);
    }
    
    // Origin not allowed
    console.error(`[CORS] Origin ${origin} not allowed. Allowed origins: ${ALLOWED_ORIGINS.join(', ')}, or any *.vercel.app`);
    const msg = `CORS policy: Origin ${origin} is not in the allowed origins list`;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
  maxAge: 86400 // 24 hours
}));

app.use(express.json({ limit: '10mb' }));

// Note: CORS middleware automatically handles OPTIONS preflight requests
// No explicit OPTIONS handler needed - cors middleware covers it

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Bearer auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Authorization header required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  if (token !== FRONTEND_AUTH_TOKEN) {
    return res.status(403).json({ 
      error: 'Invalid authorization token',
      code: 'AUTH_INVALID'
    });
  }
  
  next();
};

// Public health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Proxy server is running',
    hasToken: !!REPLICATE_API_TOKEN,
    authRequired: true
  });
});

// Apply rate limiting and auth to all prediction endpoints
app.use('/api/predictions', apiLimiter);
app.use('/api/predictions', authMiddleware);

// Create prediction endpoint
app.post('/api/predictions', async (req, res) => {
  try {
    if (!REPLICATE_API_TOKEN) {
      return res.status(500).json({
        error: 'REPLICATE_API_TOKEN not configured in .env file'
      });
    }

    console.log('[Proxy] Creating prediction...');

    const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Proxy] Replicate error:', data);
      return res.status(response.status).json(data);
    }

    console.log('[Proxy] Prediction created:', data.id);
    res.json(data);

  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(500).json({
      error: 'Failed to create prediction',
      details: error.message
    });
  }
});

// Get prediction status endpoint
app.get('/api/predictions/:id', async (req, res) => {
  try {
    if (!REPLICATE_API_TOKEN) {
      return res.status(500).json({
        error: 'REPLICATE_API_TOKEN not configured in .env file'
      });
    }

    const { id } = req.params;

    const response = await fetch(`${REPLICATE_API_URL}/predictions/${id}`, {
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Proxy] Replicate error:', data);
      return res.status(response.status).json(data);
    }

    res.json(data);

  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(500).json({
      error: 'Failed to get prediction status',
      details: error.message
    });
  }
});

// Global error handler for CORS and other errors
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.message.includes('CORS policy')) {
    return res.status(403).json({ 
      error: 'Origin not allowed',
      code: 'CORS_ERROR'
    });
  }
  
  console.error('[Server Error]', err);
  res.status(500).json({ 
    error: 'Internal server error',
    code: 'SERVER_ERROR'
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  🔒 TatTester Secure Proxy Server`);
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Port:           ${PORT}`);
  console.log(`  Host:           ${HOST}`);
  console.log(`  API:            /api`);
  console.log(`  Auth:           ${FRONTEND_AUTH_TOKEN === 'dev-token-change-in-production' ? '⚠️  Using dev token' : '✓ Configured'}`);
  console.log(`  Rate Limit:     30 req/min per IP`);
  console.log(`  Allowed Origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`  Vercel URL:     ${VERCEL_URL}`);
  console.log(`  Vercel Previews: *.vercel.app (auto-allowed)`);
  console.log('');
  console.log(`  Replicate Token: ${REPLICATE_API_TOKEN ? '✓ Yes' : '✗ No - Add to .env'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});
