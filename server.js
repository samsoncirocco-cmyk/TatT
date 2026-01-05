/**
 * Secure Express proxy server for Replicate API and Vector DB
 * Implements auth, rate limiting, and CORS restrictions
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import neo4j from 'neo4j-driver';

// API v1 Routes
import semanticMatchRouter from './src/api/routes/semanticMatch.js';
import arVisualizationRouter from './src/api/routes/arVisualization.js';
import councilEnhancementRouter from './src/api/routes/councilEnhancement.js';
import stencilExportRouter from './src/api/routes/stencilExport.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

// Security configuration
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
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
  origin: function (origin, callback) {
    if (!origin) {
      console.log('[CORS] Request with no origin - allowing');
      return callback(null, true);
    }

    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      console.log(`[CORS] Origin ${origin} allowed (exact match)`);
      return callback(null, true);
    }

    if (origin.endsWith('.vercel.app')) {
      console.log(`[CORS] Origin ${origin} allowed (Vercel domain)`);
      return callback(null, true);
    }

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

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Endpoint-specific rate limiters (per hour)
const semanticMatchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: {
    error: 'Semantic match rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
    hint: 'Maximum 100 requests per hour. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const councilEnhanceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    error: 'Council enhancement rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
    hint: 'Maximum 20 requests per hour. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const arVisualizeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: {
    error: 'AR visualization rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
    hint: 'Maximum 50 requests per hour. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const stencilExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: {
    error: 'Stencil export rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
    hint: 'Maximum 30 requests per hour. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Bearer auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Bearer realm="TatTester API"');
    return res.status(401).json({
      error: 'Authorization header required',
      code: 'AUTH_REQUIRED'
    });
  }

  const token = authHeader.replace('Bearer ', '');

  if (token !== FRONTEND_AUTH_TOKEN) {
    res.setHeader('WWW-Authenticate', 'Bearer realm="TatTester API"');
    return res.status(403).json({
      error: 'Invalid authorization token',
      code: 'AUTH_INVALID'
    });
  }

  next();
};

// Public health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Proxy server is running',
    hasReplicateToken: !!REPLICATE_API_TOKEN,
    hasNeo4jConfig: !!(NEO4J_URI && NEO4J_USER && NEO4J_PASSWORD),
    authRequired: true,
    api_version: 'v1',
    endpoints: {
      v1: {
        semantic_match: '/api/v1/match/semantic (100 req/hr)',
        ar_visualization: '/api/v1/ar/visualize (50 req/hr)',
        council_enhancement: '/api/v1/council/enhance (20 req/hr)',
        stencil_export: '/api/v1/stencil/export (30 req/hr)'
      },
      legacy: {
        predictions: '/api/predictions',
        neo4j: '/api/neo4j/query',
        semantic_match: '/api/match/semantic (deprecated)'
      }
    }
  });
});

// Apply rate limiting and auth to all protected endpoints
app.use(['/api/predictions', '/api/neo4j', '/api/match'], apiLimiter);
app.use(['/api/predictions', '/api/neo4j', '/api/match'], authMiddleware);

// --- Replicate Prediction Endpoints ---

app.post('/api/predictions', async (req, res) => {
  try {
    if (!REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });
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
    if (!response.ok) return res.status(response.status).json(data);

    console.log('[Proxy] Prediction created:', data.id);
    res.json(data);
  } catch (error) {
    console.error('[Proxy] Prediction error:', error);
    res.status(500).json({ error: 'Failed to create prediction', details: error.message });
  }
});

app.get('/api/predictions/:id', async (req, res) => {
  try {
    if (!REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });
    }

    const { id } = req.params;
    const response = await fetch(`${REPLICATE_API_URL}/predictions/${id}`, {
      headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` }
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    res.json(data);
  } catch (error) {
    console.error('[Proxy] Prediction status error:', error);
    res.status(500).json({ error: 'Failed to get prediction status', details: error.message });
  }
});

// --- API v1 Routes ---

// Mount API v1 routes with authentication and endpoint-specific rate limiting
app.use('/api/v1/match/semantic', authMiddleware, semanticMatchLimiter, semanticMatchRouter);
app.use('/api/v1/ar/visualize', authMiddleware, arVisualizeLimiter, arVisualizationRouter);
app.use('/api/v1/council/enhance', authMiddleware, councilEnhanceLimiter, councilEnhancementRouter);
app.use('/api/v1/stencil/export', authMiddleware, stencilExportLimiter, stencilExportRouter);

// --- Legacy Semantic Matching Endpoint (deprecated, use /api/v1/match/semantic) ---


app.post('/api/match/semantic', async (req, res) => {
  try {
    const { query, location, style_preferences, max_results = 10 } = req.body;

    // Input validation
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query is required and must be a string',
        code: 'INVALID_QUERY'
      });
    }

    if (query.length > 500) {
      return res.status(400).json({
        error: 'Query must be 500 characters or less',
        code: 'QUERY_TOO_LONG'
      });
    }

    if (max_results && (max_results < 1 || max_results > 50)) {
      return res.status(400).json({
        error: 'max_results must be between 1 and 50',
        code: 'INVALID_MAX_RESULTS'
      });
    }

    console.log('[Proxy] Semantic match request:', { query, location, style_preferences });

    // Import hybrid match service (dynamic import for server-side)
    const { findMatchingArtists } = await import('./src/services/hybridMatchService.js');

    // Build preferences object
    const preferences = {
      location: location || null,
      styles: style_preferences || [],
      budget: req.body.budget || null,
      distance: req.body.radius || 25
    };

    // Execute hybrid matching
    const result = await findMatchingArtists(query, preferences, max_results);

    res.json({
      success: true,
      matches: result.matches,
      total_candidates: result.totalCandidates,
      query_info: result.queryInfo
    });

  } catch (error) {
    console.error('[Proxy] Semantic match error:', error);
    res.status(500).json({
      error: 'Semantic matching failed',
      details: error.message,
      code: 'MATCH_ERROR'
    });
  }
});

// --- Neo4j Proxy Endpoint ---

let neo4jDriver;
try {
  if (NEO4J_URI && NEO4J_USER && NEO4J_PASSWORD) {
    neo4jDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    console.log('[Server] Neo4j driver initialized');
  }
} catch (err) {
  console.error('[Server] Failed to initialize Neo4j driver:', err.message);
}

app.post('/api/neo4j/query', async (req, res) => {
  if (!neo4jDriver) {
    return res.status(500).json({ error: 'Neo4j driver not initialized' });
  }

  const { query, params } = req.body;
  const session = neo4jDriver.session();

  try {
    const result = await session.run(query, params);
    const records = result.records.map(record => record.toObject());
    res.json({ records });
  } catch (error) {
    console.error('[Proxy] Neo4j query error:', error);
    res.status(500).json({ error: 'Neo4j query failed', details: error.message });
  } finally {
    await session.close();
  }
});

// Global error handler
app.use((err, req, res, next) => {
  if (err.message.includes('CORS policy')) {
    return res.status(403).json({ error: 'Origin not allowed', code: 'CORS_ERROR' });
  }

  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
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
  console.log(`  Allowed Origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log('');
  console.log(`  Replicate Token: ${REPLICATE_API_TOKEN ? '✓ Yes' : '✗ No'}`);
  console.log(`  Neo4j Config:    ${NEO4J_URI && NEO4J_USER && NEO4J_PASSWORD ? '✓ Yes' : '✗ No'}`);
  console.log('═══════════════════════════════════════════════════');
});
