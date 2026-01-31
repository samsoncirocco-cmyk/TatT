/**
 * AI Council Enhancement API Route
 * 
 * POST /api/v1/council/enhance
 * Provides AI Council prompt enhancement with model routing
 */

import { Router } from 'express';
import { validateCouncilEnhanceRequest } from '../middleware/validation.js';

const router = Router();

/**
 * POST /api/v1/council/enhance
 * 
 * Enhance user prompt using AI Council with multi-model routing
 * Rate limit: 20 requests/hour per IP
 * 
 * Request body:
 * - user_prompt: string (required, 3-1000 chars)
 * - style: string (required, one of: anime, traditional, fine-line, tribal, watercolor, blackwork, realism, geometric, japanese, minimalist)
 * - body_part: string (optional)
 * - complexity: string (optional, one of: simple, medium, complex)
 * 
 * Response:
 * - 200: { success: true, enhanced_prompts: [...], model_selections: {...}, metadata: {...} }
 * - 400: { error: string, code: string, details: [...] }
 * - 404: { error: string, code: string }
 * - 500: { error: string, code: string }
 */
router.post('/', validateCouncilEnhanceRequest, async (req, res) => {
    try {
        const { user_prompt, style, body_part, complexity = 'medium' } = req.body;

        console.log('[API] Council enhancement request:', {
            prompt_length: user_prompt.length,
            style,
            body_part,
            complexity
        });

        // Import council service
        const { enhancePrompt } = await import('../../../services/councilService.ts');

        // Execute enhancement with model routing
        const startTime = Date.now();
        const result = await enhancePrompt({
            userIdea: user_prompt,
            style,
            bodyPart: body_part,
            complexity
        });
        const duration = Date.now() - startTime;

        console.log(`[API] Council enhancement completed in ${duration}ms`);

        // Format response
        const response = {
            success: true,
            enhanced_prompts: [
                result?.prompts?.simple,
                result?.prompts?.detailed,
                result?.prompts?.ultra
            ].filter(Boolean),
            model_selections: result.modelSelection || {
                primary: result?.metadata?.model || 'council',
                reasoning: 'Council enhancement'
            },
            metadata: {
                original_prompt: user_prompt,
                style,
                body_part,
                complexity,
                council_members: result?.metadata?.councilMembers || ['creative', 'technical', 'style'],
                enhancement_version: result?.metadata?.councilVersion || '3.0',
                generated_at: new Date().toISOString()
            },
            performance: {
                duration_ms: duration
            }
        };

        res.json(response);

    } catch (error) {
        console.error('[API] Council enhancement error:', error);

        // Handle specific error types
        if (error.message.includes('character not found') || error.message.includes('style not found')) {
            return res.status(404).json({
                error: 'Resource not found',
                code: 'CHARACTER_NOT_FOUND',
                message: error.message,
                hint: 'Please check that the style and character names are correct'
            });
        }

        if (error.message.includes('invalid style')) {
            return res.status(400).json({
                error: 'Invalid style',
                code: 'INVALID_STYLE',
                message: error.message,
                hint: 'Please use one of the supported styles'
            });
        }

        if (error.message.includes('rate limit') || error.message.includes('quota')) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                code: 'RATE_LIMIT_EXCEEDED',
                message: error.message,
                hint: 'Please wait before making another request'
            });
        }

        // Generic error response
        res.status(500).json({
            error: 'Enhancement failed',
            code: 'ENHANCEMENT_FAILED',
            message: error.message,
            hint: 'Please try again or simplify your prompt'
        });
    }
});

export default router;
