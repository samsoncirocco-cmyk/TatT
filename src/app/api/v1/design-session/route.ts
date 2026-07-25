import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { startSession } from '@/services/designSession';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkBudget } from '@/lib/budget-tracker';
import { createRequestLogger } from '@/lib/logger';
import {
    designSessionErrorResponse,
    invalidRequestResponse,
    recordImageSpend,
    REVEAL_IMAGE_COUNT,
} from './shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Four renders + council must survive Replicate's low-credit throttle
// (burst of 1 per ~10s window): 4 renders can need ~1min of retry waits
// plus generation. Fluid compute is enabled on this project, so 300s is
// legal on every plan tier.
export const maxDuration = 300;

// POST /api/v1/design-session — start a session: intake → council → the
// 4-variation reveal. Thin adapter over the designSession service; this route
// only does auth/rate/budget policy, validation, spend recording, and
// response-shape mapping.
//
// Demo mode (NEXT_PUBLIC_DEMO_MODE): the REAL service still runs — and
// persists the session, so the follow-up pick/refine/get routes work — but
// the orchestrator substitutes free stock images for the four renders. No
// cost, so rate/budget policy and spend recording are skipped; a short
// simulated latency keeps the /api/v1/generate demo feel.

export async function POST(req: NextRequest) {
    const reqLogger = createRequestLogger('design-session');

    // Auth check
    const authError = await verifyApiAuth(req);
    if (authError) return authError;

    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    if (!demoMode) {
        const rateResult = await rateLimit(req, 'generation');
        if (!rateResult.allowed) {
            return rateLimitResponse(rateResult);
        }

        const budgetResult = await checkBudget();
        if (!budgetResult.allowed) {
            return NextResponse.json(
                { error: 'Budget limit reached', spentCents: budgetResult.spentCents },
                { status: 402 }
            );
        }
    }

    const body = await req.json().catch(() => ({}));
    const { placementAnswer, meaningAnswer } = body;

    if (!placementAnswer || typeof placementAnswer !== 'string' || !placementAnswer.trim()) {
        return invalidRequestResponse('placementAnswer is required', 'INVALID_PLACEMENT_ANSWER');
    }
    if (!meaningAnswer || typeof meaningAnswer !== 'string' || !meaningAnswer.trim()) {
        return invalidRequestResponse('meaningAnswer is required', 'INVALID_MEANING_ANSWER');
    }

    try {
        if (demoMode) await new Promise(r => setTimeout(r, 1500));

        const session = await startSession({
            placementAnswer: placementAnswer.trim(),
            meaningAnswer: meaningAnswer.trim(),
        });

        // The reveal is always 4 images on the session's locked provider —
        // demo renders are free stock images, so nothing to record.
        if (!demoMode) await recordImageSpend(session.provider, REVEAL_IMAGE_COUNT);

        reqLogger.complete('design_session.start.success', {
            session_id: session.id,
            provider: session.provider,
            axis_mode: session.axisSelection.mode,
        });

        return NextResponse.json({ success: true, session });
    } catch (error) {
        reqLogger.error('design_session.start.failed', error as Error, {
            error_code: (error as { code?: string }).code || 'DESIGN_SESSION_FAILED',
        });
        return designSessionErrorResponse(error);
    }
}
