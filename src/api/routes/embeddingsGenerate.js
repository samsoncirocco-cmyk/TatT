/**
 * Embeddings Generation API Route
 *
 * POST /api/v1/embeddings/generate
 */

import { Router } from 'express';
import { generateEmbedding } from '../../services/vertex-ai-service.js';
import { storeEmbedding } from '../../services/vectorDbService.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { artistId, imageUrls } = req.body || {};

    if (!artistId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: artistId, imageUrls[]'
      });
    }

    const embedding = await generateEmbedding(imageUrls);
    const stored = await storeEmbedding(artistId, embedding, {
      source_images: imageUrls,
      model_version: 'vertex-multimodal-v1'
    });

    return res.json({
      success: true,
      artistId,
      embeddingLength: embedding.length,
      record: stored
    });
  } catch (error) {
    console.error('[Embeddings] Failed:', error);
    return res.status(500).json({
      error: 'Embedding generation failed',
      message: error.message
    });
  }
});

export default router;
