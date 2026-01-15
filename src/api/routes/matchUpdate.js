/**
 * Match Pulse Update API Route
 *
 * POST /api/v1/match/update
 */

import { Router } from 'express';
import { getHybridArtistMatches } from '../../services/matchService.js';
import { updateMatches } from '../../services/firebase-match-service.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const {
      userId,
      designId,
      prompt,
      style,
      bodyPart,
      location,
      budget,
      embeddingVector
    } = req.body || {};

    if (!userId || !designId) {
      return res.status(400).json({
        error: 'Missing required fields: userId, designId'
      });
    }

    const context = {
      style,
      bodyPart,
      location,
      budget,
      layerCount: 0,
      embeddingVector
    };

    const matchResults = await getHybridArtistMatches(context, {
      embeddingVector,
      limit: 20
    });

    const payload = {
      designId,
      artists: matchResults.matches || []
    };

    await updateMatches(userId, payload);

    return res.json({
      matchId: designId,
      artists: matchResults.matches || [],
      firebasePath: `/matches/${userId}/current`,
      processingTime: matchResults.processingTime || null
    });
  } catch (error) {
    console.error('[MatchUpdate] Failed:', error);
    return res.status(500).json({
      error: 'Match update failed',
      message: error.message
    });
  }
});

export default router;
