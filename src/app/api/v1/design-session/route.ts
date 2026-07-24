import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { startSession } from '@/services/designSession';
import type { DesignSession } from '@/services/designSession/types';
import type { VariationAxis } from '@/services/intake/types';
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

// POST /api/v1/design-session — start a session: intake → council → the
// 4-variation reveal. Thin adapter over the designSession service; this route
// only does auth/rate/budget policy, validation, spend recording, and
// response-shape mapping.

// Demo-mode mock images (Unsplash tattoo photos, no API cost) — same set the
// /api/v1/generate route serves in demo mode.
const DEMO_MOCK_IMAGES = [
    'https://images.unsplash.com/photo-1565058379802-bbe93b2f703f?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1590246814883-57c511e76729?w=1024&h=1024&fit=crop',
];

const DEMO_AXES: VariationAxis[] = ['bold-fine', 'color-blackwork'];

function buildDemoSession(body: { placementAnswer?: unknown; meaningAnswer?: unknown }): DesignSession {
    const now = new Date().toISOString();
    const placement = typeof body.placementAnswer === 'string' && body.placementAnswer.trim()
        ? body.placementAnswer.trim()
        : 'forearm';
    const meaning = typeof body.meaningAnswer === 'string' && body.meaningAnswer.trim()
        ? body.meaningAnswer.trim()
        : 'demo session';

    // 4 variations covering the 2×2 pole combinations of the demo axes.
    const variations = DEMO_MOCK_IMAGES.map((imageUrl, i) => ({
        id: `demo-variation-${i + 1}`,
        axisPosition: {
            'bold-fine': i < 2 ? 'bold' : 'fine',
            'color-blackwork': i % 2 === 0 ? 'color' : 'blackwork',
        },
        prompt: `demo tattoo design ${i + 1} — ${placement}`,
        imageUrl,
    }));

    return {
        id: `demo-${Date.now()}`,
        phase: 'revealed',
        intake: {
            placement,
            styleTags: [],
            meaning,
            references: [],
            ambiguousAxes: DEMO_AXES,
        },
        axisSelection: {
            mode: 'questionnaire',
            axes: DEMO_AXES,
            rationale: 'Demo mode: fixed axes, no Council call.',
        },
        provider: 'demo',
        variations,
        createdAt: now,
        updatedAt: now,
    };
}

export async function POST(req: NextRequest) {
    const reqLogger = createRequestLogger('design-session');

    // Auth check
    const authError = await verifyApiAuth(req);
    if (authError) return authError;

    // ─── DEMO MODE ─────────────────────────────────────────────────────────
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        const body = await req.json().catch(() => ({}));
        await new Promise(r => setTimeout(r, 1500));
        return NextResponse.json({ success: true, session: buildDemoSession(body) });
    }

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

    const body = await req.json().catch(() => ({}));
    const { placementAnswer, meaningAnswer } = body;

    if (!placementAnswer || typeof placementAnswer !== 'string' || !placementAnswer.trim()) {
        return invalidRequestResponse('placementAnswer is required', 'INVALID_PLACEMENT_ANSWER');
    }
    if (!meaningAnswer || typeof meaningAnswer !== 'string' || !meaningAnswer.trim()) {
        return invalidRequestResponse('meaningAnswer is required', 'INVALID_MEANING_ANSWER');
    }

    try {
        const session = await startSession({
            placementAnswer: placementAnswer.trim(),
            meaningAnswer: meaningAnswer.trim(),
        });

        // The reveal is always 4 images on the session's locked provider.
        await recordImageSpend(session.provider, REVEAL_IMAGE_COUNT);

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
