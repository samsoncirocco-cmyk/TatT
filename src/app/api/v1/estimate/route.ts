import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { estimateCost, quickEstimate } from '@/services/costEstimatorService';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createRequestLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 second timeout for vision analysis

/**
 * POST /api/v1/estimate
 * 
 * AI-powered tattoo cost estimation.
 * Accepts design image (base64) or description and returns detailed price breakdown.
 * 
 * Request body:
 * - imageDataUrl?: string - Base64 data URL of design image
 * - prompt?: string - Design description (used if no image)
 * - style?: string - Tattoo style (traditional, realism, etc.)
 * - bodyPart?: string - Target body location
 * - size?: 'tiny' | 'small' | 'medium' | 'large' | 'xlarge' | 'sleeve' | 'fullsleeve' | 'backpiece'
 * - quick?: boolean - Use quick estimate (no AI, faster)
 */
export async function POST(req: NextRequest) {
    const reqLogger = createRequestLogger('estimate');

    // Auth check
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    // Rate limiting (more restrictive - vision API is expensive)
    const rateResult = await checkRateLimit(req, 'estimate');
    if (!rateResult.allowed) {
        return rateLimitResponse(rateResult);
    }

    try {
        const body = await req.json();
        const { imageDataUrl, prompt, style, bodyPart, size, quick } = body;

        // Validation
        if (!imageDataUrl && !prompt) {
            return NextResponse.json({
                error: 'Either imageDataUrl or prompt is required',
                code: 'INVALID_REQUEST'
            }, { status: 400 });
        }

        reqLogger.start('estimate.started', {
            hasImage: !!imageDataUrl,
            hasPrompt: !!prompt,
            style: style || null,
            bodyPart: bodyPart || null,
            size: size || 'medium',
            quick: !!quick
        });

        const startTime = Date.now();
        let result;

        if (quick) {
            // Quick estimate without AI (for rate-limited users or fast response)
            result = quickEstimate(style, bodyPart, size || 'medium');
        } else {
            // Full AI analysis
            result = await estimateCost({
                imageDataUrl,
                prompt,
                style,
                bodyPart,
                size: size || 'medium'
            });
        }

        const duration = Date.now() - startTime;

        reqLogger.complete('estimate.completed', {
            priceRangeMid: result.priceRange.mid,
            confidence: result.confidence,
            duration_ms: duration
        });

        return NextResponse.json({
            ...result,
            performance: {
                duration_ms: duration
            }
        });

    } catch (error: any) {
        reqLogger.error('estimate.failed', error);

        // Fallback to quick estimate on error
        const { style, bodyPart, size } = await req.json().catch(() => ({}));
        const fallback = quickEstimate(style || 'custom', bodyPart || 'forearm', size || 'medium');

        return NextResponse.json({
            ...fallback,
            warning: 'AI analysis unavailable, using quick estimate',
            error: error.message
        }, { status: 200 }); // Still return 200 with fallback data
    }
}

/**
 * GET /api/v1/estimate
 * 
 * Get estimate info/health check
 */
export async function GET(req: NextRequest) {
    return NextResponse.json({
        service: 'cost-estimator',
        version: '1.0.0',
        description: 'AI-powered tattoo cost estimation',
        sizes: ['tiny', 'small', 'medium', 'large', 'xlarge', 'sleeve', 'fullsleeve', 'backpiece'],
        features: [
            'Vision-based design analysis',
            'Complexity breakdown (linework, shading, color, detail, coverage)',
            'Multi-tier pricing (apprentice to celebrity artist)',
            'Session planning with healing time',
            'Style-aware adjustments',
            'Industry-standard hourly rates'
        ],
        hourlyRates: {
            apprentice: '$50-80/hr',
            standard: '$100-175/hr',
            experienced: '$175-300/hr',
            renowned: '$300-500/hr'
        }
    });
}
