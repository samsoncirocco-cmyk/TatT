// Shared policy helpers for the design-session route adapters.
//
// These routes are thin adapters (same shape as /api/v1/generate): auth,
// rate limiting, budget policy, input validation, and response mapping live
// here — every domain decision (phase transitions, axis selection, the
// ADR-0013 hard stop) lives inside the designSession service, consumed only
// via its public entry point '@/services/designSession'.
//
// Service surface (public entry '@/services/designSession'):
//   startSession(request: StartSessionRequest): Promise<DesignSession>
//   recordPick(sessionId: string, request: PickRequest): Promise<DesignSession>
//   refine(sessionId: string, request: RefineRequest): Promise<DesignSession>
//   getSession(sessionId: string): Promise<DesignSession>  // throws when absent
// Domain errors (DesignSessionError) carry a stable `code` and a `status`;
// the mapper below translates them to HTTP.

import { NextResponse } from 'next/server';
import { recordSpend, VERTEX_IMAGEN_COST_CENTS } from '@/lib/budget-tracker';

/** A reveal always renders exactly 4 variations (ADR-0012). */
export const REVEAL_IMAGE_COUNT = 4;
/** The refinement round regenerates exactly 1 image (ADR-0013). */
export const REFINE_IMAGE_COUNT = 1;

// Spend on a replicate result (~1 cent flat), matching the generate route's
// fallback cost. The session's provider is locked per ADR-0016, so a single
// check covers all of a request's images.
export const REPLICATE_COST_CENTS = 1;

/**
 * Record image spend for a session step using the same cost constants as
 * /api/v1/generate: per-image Vertex cents on the primary provider, flat
 * ~1 cent when the session's locked provider is Replicate.
 */
export async function recordImageSpend(provider: string, imageCount: number): Promise<void> {
    if (provider === 'replicate') {
        await recordSpend(REPLICATE_COST_CENTS);
        return;
    }
    await recordSpend(VERTEX_IMAGEN_COST_CENTS * imageCount);
}

// Domain error codes → HTTP status. The service owns the vocabulary; the
// route only translates. Unknown codes fall through to 500.
const NOT_FOUND_CODES = new Set(['SESSION_NOT_FOUND']);
// One-way phase machine violations (ADR-0013 hard stop included) are
// conflicts with current resource state → 409.
const CONFLICT_CODES = new Set(['INVALID_PHASE', 'REFINEMENT_CLOSED']);
// Request referenced something that can't apply (e.g. a pickId that isn't
// one of the session's variations) → 400.
const BAD_REQUEST_CODES = new Set(['INVALID_VARIATION']);

/** Map a designSession service error to the route's HTTP response. */
export function designSessionErrorResponse(error: unknown): NextResponse {
    const err = (error ?? {}) as { code?: string; message?: string; status?: number };
    const code = err.code || 'DESIGN_SESSION_FAILED';

    if (NOT_FOUND_CODES.has(code) || err.status === 404) {
        return NextResponse.json(
            { error: 'Session not found', code: 'SESSION_NOT_FOUND' },
            { status: 404 }
        );
    }

    if (CONFLICT_CODES.has(code) || err.status === 409) {
        return NextResponse.json(
            { error: err.message || 'Session phase conflict', code },
            { status: 409 }
        );
    }

    if (BAD_REQUEST_CODES.has(code) || err.status === 400) {
        return NextResponse.json(
            { error: err.message || 'Invalid request', code },
            { status: 400 }
        );
    }

    return NextResponse.json(
        { error: 'Design session request failed', code, message: err.message },
        { status: 500 }
    );
}

/** Uniform 400 for input validation failures. */
export function invalidRequestResponse(message: string, code: string): NextResponse {
    return NextResponse.json({ error: message, code }, { status: 400 });
}
