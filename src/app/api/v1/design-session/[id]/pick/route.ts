import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { recordPick } from '@/services/designSession';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createRequestLogger } from '@/lib/logger';
import { designSessionErrorResponse, invalidRequestResponse } from '../../shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/design-session/[id]/pick — record the pick + most-not-you tap
 * and surface the single refinement question (ADR-0013). No image generation
 * happens here, so no budget policy — just auth, rate, validation, mapping.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const reqLogger = createRequestLogger('design-session-pick');

    const authError = await verifyApiAuth(req);
    if (authError) return authError;

    const rateResult = await rateLimit(req, 'default');
    if (!rateResult.allowed) {
        return rateLimitResponse(rateResult);
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { pickId, mostNotYouId } = body;

    if (!pickId || typeof pickId !== 'string' || !pickId.trim()) {
        return invalidRequestResponse('pickId is required', 'INVALID_PICK_ID');
    }
    if (!mostNotYouId || typeof mostNotYouId !== 'string' || !mostNotYouId.trim()) {
        return invalidRequestResponse('mostNotYouId is required', 'INVALID_MOST_NOT_YOU_ID');
    }
    if (pickId.trim() === mostNotYouId.trim()) {
        return invalidRequestResponse(
            'pickId and mostNotYouId must be different variations',
            'PICK_IDS_IDENTICAL'
        );
    }

    try {
        const session = await recordPick(id, {
            pickId: pickId.trim(),
            mostNotYouId: mostNotYouId.trim(),
        });

        reqLogger.complete('design_session.pick.success', {
            session_id: session.id,
            pick_id: session.pickId,
        });

        return NextResponse.json({
            success: true,
            refinementQuestion: session.refinementQuestion ?? null,
            session,
        });
    } catch (error) {
        reqLogger.error('design_session.pick.failed', error as Error, {
            session_id: id,
            error_code: (error as { code?: string }).code || 'DESIGN_SESSION_FAILED',
        });
        return designSessionErrorResponse(error);
    }
}
