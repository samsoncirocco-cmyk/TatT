import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from './auth-dal';

/**
 * Shared frontend token check. When FRONTEND_AUTH_TOKEN is configured
 * (paired with NEXT_PUBLIC_FRONTEND_AUTH_TOKEN on the client), a bearer
 * token equal to it authorizes public read-style endpoints (e.g. artist
 * matching) without a Firebase session.
 */
function matchesFrontendToken(bearerToken: string): boolean {
    const expected = process.env.FRONTEND_AUTH_TOKEN;
    if (!expected) return false;

    const a = Buffer.from(bearerToken);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verifies the Bearer token in the request headers.
 * Returns null if authorized, or a NextResponse with error if not.
 */
export async function verifyApiAuth(req: NextRequest): Promise<NextResponse | null> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
            { error: 'Authorization header required', code: 'AUTH_REQUIRED' },
            { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="TatT API"' } }
        );
    }

    if (matchesFrontendToken(authHeader.slice(7))) {
        return null;
    }

    const user = await verifyFirebaseToken(req);
    if (!user) {
        return NextResponse.json(
            { error: 'Invalid authorization token', code: 'AUTH_INVALID' },
            { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="TatT API"' } }
        );
    }

    return null;
}
