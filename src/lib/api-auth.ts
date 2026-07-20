import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from './auth-dal';

/**
 * Verifies the Bearer token in the request headers.
 * Returns null if authorized, or a NextResponse with an error if not.
 *
 * Authorization is Firebase-only. There is deliberately NO shared static-token
 * path: a shared secret paired with NEXT_PUBLIC_FRONTEND_AUTH_TOKEN would be
 * baked into the browser bundle and let anyone call protected (incl. paid)
 * routes. Every caller must present a per-user Firebase ID token.
 */
export async function verifyApiAuth(req: NextRequest): Promise<NextResponse | null> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
            { error: 'Authorization header required', code: 'AUTH_REQUIRED' },
            { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="TatT API"' } }
        );
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
