/**
 * Simple Express proxy server for Replicate API
 * This allows the browser to call Replicate without CORS issues
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Replicate API configuration
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;
const REPLICATE_API_URL = 'https://api.replicate.com/v1';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Proxy server is running',
    hasToken: !!REPLICATE_API_TOKEN
  });
});

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

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  🚀 TatTester Proxy Server Running`);
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  API:     http://localhost:${PORT}/api`);
  console.log('');
  console.log(`  Token configured: ${REPLICATE_API_TOKEN ? '✓ Yes' : '✗ No - Add to .env'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});
