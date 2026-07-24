import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { confirmProposal } from '@/services/designSession';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkBudget } from '@/lib/budget-tracker';
import { createRequestLogger } from '@/lib/logger';
import {
    designSessionErrorResponse,
    recordImageSpend,
    REVEAL_IMAGE_COUNT,
} from '../../shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Four renders + council can wait out a throttled provider (429 retry_after)
// — give the render routes headroom beyond the platform default.
export const maxDuration = 60;

/**
 * POST /api/v1/design-session/[id]/confirm — the user's yes to the
 * conversation's proposal (ADR-0020). Fires the existing reveal pipeline
 * (4 renders on one pinned provider), so the full budget policy + 4-image
 * spend recording of the start route applies. A 'no' or correction is just
 * another converse message, never this endpoint. The ConfirmRequest body is
 * reserved-empty in the frozen contract, so no body validation exists yet.
 *
 * Demo mode (NEXT_PUBLIC_DEMO_MODE): the real service still runs — and
 * persists the revealed session — but the renders are free stock images, so
 * rate/budget policy and spend recording are skipped, matching the start
 * route (including its simulated latency).
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const reqLogger = createRequestLogger('design-session-confirm');

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

    try {
        if (demoMode) await new Promise(r => setTimeout(r, 1500));

        const session = await confirmProposal(id);

        // The confirmed reveal is always 4 images on the session's locked
        // provider — demo renders are free stock images, nothing to record.
        if (!demoMode) await recordImageSpend(session.provider, REVEAL_IMAGE_COUNT);

        reqLogger.complete('design_session.confirm.success', {
            session_id: session.id,
            provider: session.provider,
            axis_mode: session.axisSelection.mode,
        });

        return NextResponse.json({ success: true, session });
    } catch (error) {
        reqLogger.error('design_session.confirm.failed', error as Error, {
            session_id: id,
            error_code: (error as { code?: string }).code || 'DESIGN_SESSION_FAILED',
        });
        return designSessionErrorResponse(error);
    }
}
