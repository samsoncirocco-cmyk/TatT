import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { critique } from '@/services/designSession';
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
// One render, but on the same throttle-prone providers as the reveal — a
// low-credit Replicate window can outlast a short budget. Matches /refine.
export const maxDuration = 300;

/**
 * POST /api/v1/design-session/[id]/critique — one post-reveal critique turn
 * (ADR-0039). The chat no longer dies at the reveal: plain criticism re-cuts
 * the design on the session's pinned provider (ADR-0016), bounded by the same
 * env-tunable fix allowance as the Studio (ADR-0038).
 *
 * At most 1 image per turn, so the same rate/budget policy as /refine applies
 * — but spend is recorded only when the service says a render actually ran.
 * A chatter turn, an unresolvable target, and a spent allowance all reply in
 * voice without touching a provider, and must not be billed as if they had.
 *
 * Demo mode (NEXT_PUBLIC_DEMO_MODE): the real service still runs and still
 * decrements the allowance, but the re-cut is a free stock image, so policy
 * and spend recording are skipped — matching /confirm and /refine.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const reqLogger = createRequestLogger('design-session-critique');
    // Seeded before the try so a setup failure — including one thrown by
    // `await params` itself — still logs a session_id.
    let sessionId = 'unknown';

    try {
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

        ({ id: sessionId } = await params);
        const body = await req.json().catch(() => ({}));
        const { message } = body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            return invalidRequestResponse('message is required', 'INVALID_MESSAGE');
        }

        const result = await critique(sessionId, { message: message.trim() });

        // Only a turn that actually rendered costs anything.
        if (!demoMode && result.generated) {
            await recordImageSpend(result.session.provider, REFINE_IMAGE_COUNT);
        }

        reqLogger.complete('design_session.critique.success', {
            session_id: result.session.id,
            provider: result.session.provider,
            generated: result.generated,
            fixes_remaining: result.fixesRemaining,
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        reqLogger.error('design_session.critique.failed', error as Error, {
            session_id: sessionId,
            error_code: (error as { code?: string }).code || 'DESIGN_SESSION_FAILED',
        });
        return designSessionErrorResponse(error);
    }
}
