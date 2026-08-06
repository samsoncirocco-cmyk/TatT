import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken, type VerifiedUser } from './auth-dal';

/**
 * Verifies the Bearer token in the request headers and hands back the user
 * it decoded, so a route that needs the uid (e.g. to stand a credit meter
 * behind a charged turn) never verifies the same token twice. Two
 * independent verifyIdToken round-trips on one request is a race: the gate
 * passes, the second decode transiently fails, and a legitimately signed-in
 * customer is silently treated as anonymous.
 *
 * Returns { error: null, user } when authorized, or { error } with the
 * exact refusal responses verifyApiAuth has always sent.
 */
export async function verifyApiAuthWithUser(
    req: NextRequest
): Promise<{ error: NextResponse; user?: undefined } | { error: null; user: VerifiedUser }> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return {
            error: NextResponse.json(
                { error: 'Authorization header required', code: 'AUTH_REQUIRED' },
                { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="TattTester API"' } }
            ),
        };
    }

    const user = await verifyFirebaseToken(req);
    if (!user) {
        return {
            error: NextResponse.json(
                { error: 'Invalid authorization token', code: 'AUTH_INVALID' },
                { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="TattTester API"' } }
            ),
        };
    }

    return { error: null, user };
}

/**
 * Verifies the Bearer token in the request headers.
 * Returns null if authorized, or a NextResponse with an error if not.
 *
 * Authorization is Firebase-only. There is deliberately NO shared static-token
 * path: a shared secret paired with NEXT_PUBLIC_FRONTEND_AUTH_TOKEN would be
 * baked into the browser bundle and let anyone call protected (incl. paid)
 * routes. Every caller must present a per-user Firebase ID token.
 *
 * Thin over verifyApiAuthWithUser — ONE implementation, one decode — for
 * the routes that only need the yes/no.
 */
export async function verifyApiAuth(req: NextRequest): Promise<NextResponse | null> {
    const { error } = await verifyApiAuthWithUser(req);
    return error;
}
