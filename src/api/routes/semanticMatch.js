/**
 * Semantic Match API Route
 * 
 * POST /api/v1/match/semantic
 * Provides semantic artist matching using hybrid vector-graph approach
 */

import { Router } from 'express';
import { validateSemanticMatchRequest } from '../middleware/validation.js';

const router = Router();

/**
 * POST /api/v1/match/semantic
 * 
 * Semantic artist matching with composite scoring
 * Rate limit: 100 requests/hour per IP
 * 
 * Request body:
 * - query: string (required, 1-500 chars)
 * - location: string (optional)
 * - style_preferences: string[] (optional, max 20)
 * - budget: number (optional, positive)
 * - radius: number (optional, 1-500 miles)
 * - max_results: number (optional, 1-50)
 * 
 * Response:
 * - 200: { success: true, matches: [...], total_candidates: number }
 * - 400: { error: string, code: string, details: [...] }
 * - 500: { error: string, code: string }
 */
router.post('/', validateSemanticMatchRequest, async (req, res) => {
    try {
        const {
            query,
            location,
            style_preferences = [],
            budget,
            radius = 25,
            max_results = 10
        } = req.body;

        console.log('[API] Semantic match request:', { query, location, style_preferences });

        // Import hybrid match service
        const { findMatchingArtists } = await import('../../../services/hybridMatchService.js');

        // Build preferences object
        const preferences = {
            location: location || null,
            styles: style_preferences,
            budget: budget || null,
            distance: radius
        };

        // Execute hybrid matching
        const startTime = Date.now();
        const result = await findMatchingArtists(query, preferences, max_results);
        const duration = Date.now() - startTime;

        console.log(`[API] Semantic match completed in ${duration}ms, found ${result.matches.length} matches`);

        // Return successful response
        res.json({
            success: true,
            matches: result.matches,
            total_candidates: result.totalCandidates,
            query_info: result.queryInfo,
            performance: {
                duration_ms: duration
            }
        });

    } catch (error) {
        console.error('[API] Semantic match error:', error);

        // Handle specific error types
        if (error.message.includes('not found')) {
            return res.status(404).json({
                error: 'Resource not found',
                code: 'NOT_FOUND',
                message: error.message
            });
        }

        if (error.message.includes('invalid')) {
            return res.status(400).json({
                error: 'Invalid request',
                code: 'INVALID_REQUEST',
                message: error.message
            });
        }

        // Generic error response
        res.status(500).json({
            error: 'Semantic matching failed',
            code: 'SERVICE_UNAVAILABLE',
            message: error.message,
            hint: 'Please try again later or contact support if the issue persists'
        });
    }
});

export default router;
