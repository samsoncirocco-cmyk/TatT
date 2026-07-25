import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { getSession } from '@/services/designSession';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { designSessionErrorResponse } from '../shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/design-session/[id] — fetch a session in whatever phase it's
 * in. Read-only: no rate-limited generation, no spend.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = await verifyApiAuth(req);
    if (authError) return authError;

    const rateResult = await rateLimit(req, 'default');
    if (!rateResult.allowed) {
        return rateLimitResponse(rateResult);
    }

    const { id } = await params;

    try {
        const session = await getSession(id);
        if (!session) {
            return NextResponse.json(
                { error: 'Session not found', code: 'SESSION_NOT_FOUND' },
                { status: 404 }
            );
        }
        return NextResponse.json({ success: true, session });
    } catch (error) {
        return designSessionErrorResponse(error);
    }
}
