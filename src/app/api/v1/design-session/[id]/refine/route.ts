import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { refine } from '@/services/designSession';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkBudget } from '@/lib/budget-tracker';
import { createRequestLogger } from '@/lib/logger';
import {
    designSessionErrorResponse,
    invalidRequestResponse,
    recordImageSpend,
    REFINE_IMAGE_COUNT,
} from '../../shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Four renders + council must survive Replicate's low-credit throttle
// (burst of 1 per ~10s window): 4 renders can need ~1min of retry waits
// plus generation. Fluid compute is enabled on this project, so 300s is
// legal on every plan tier.
export const maxDuration = 300;

/**
 * POST /api/v1/design-session/[id]/refine — the one regeneration allowed per
 * session (ADR-0013 hard stop). A second attempt is a domain conflict the
 * service raises and this route maps to 409. Generates exactly 1 image on the
 * session's locked provider, so budget policy applies.
 *
 * Demo mode (NEXT_PUBLIC_DEMO_MODE): the real service still runs (the
 * orchestrator substitutes a free stock image for the regen, and the ADR-0013
 * hard stop stays enforced) — no cost, so rate/budget policy and spend
 * recording are skipped, matching the start route.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const reqLogger = createRequestLogger('design-session-refine');

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

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { answer } = body;

    if (!answer || typeof answer !== 'string' || !answer.trim()) {
        return invalidRequestResponse('answer is required', 'INVALID_ANSWER');
    }

    try {
        if (demoMode) await new Promise(r => setTimeout(r, 1500));

        const session = await refine(id, { answer: answer.trim() });

        // The refinement round regenerates exactly 1 image — free stock in
        // demo mode, so nothing to record.
        if (!demoMode) await recordImageSpend(session.provider, REFINE_IMAGE_COUNT);

        reqLogger.complete('design_session.refine.success', {
            session_id: session.id,
            provider: session.provider,
        });

        return NextResponse.json({
            success: true,
            refinedVariation: session.refinedVariation ?? null,
            brief: session.brief ?? null,
            session,
        });
    } catch (error) {
        reqLogger.error('design_session.refine.failed', error as Error, {
            session_id: id,
            error_code: (error as { code?: string }).code || 'DESIGN_SESSION_FAILED',
        });
        return designSessionErrorResponse(error);
    }
}
