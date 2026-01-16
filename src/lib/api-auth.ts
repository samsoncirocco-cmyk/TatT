import { NextRequest, NextResponse } from 'next/server';

const FRONTEND_AUTH_TOKEN = process.env.FRONTEND_AUTH_TOKEN || 'dev-token-change-in-production';

/**
 * Verifies the Bearer token in the request headers.
 * Returns null if authorized, or a NextResponse with error if not.
 */
export function verifyApiAuth(req: NextRequest): NextResponse | null {
    // Skip auth for health check if needed, but usually we want it protected or public depending on route
    // For now, this function is called explicitly by protected routes

    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
        return NextResponse.json(
            { error: 'Authorization header required', code: 'AUTH_REQUIRED' },
            { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="Manama API"' } }
        );
    }

    const token = authHeader.replace('Bearer ', '');

    if (token !== FRONTEND_AUTH_TOKEN) {
        return NextResponse.json(
            { error: 'Invalid authorization token', code: 'AUTH_INVALID' },
            { status: 403, headers: { 'WWW-Authenticate': 'Bearer realm="Manama API"' } }
        );
    }

    return null; // Auth success
}
