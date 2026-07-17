import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from './auth-dal';

/**
 * Verifies the Bearer token in the request headers.
 * Returns null if authorized, or a NextResponse with error if not.
 */
export async function verifyApiAuth(req: NextRequest): Promise<NextResponse | null> {
    if (!req.headers.get('authorization')?.startsWith('Bearer ')) {
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
