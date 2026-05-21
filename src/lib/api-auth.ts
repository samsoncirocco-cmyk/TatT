import { NextRequest, NextResponse } from 'next/server';

// Audit fix (2026-05-19): removed insecure default 'dev-token-change-in-production'.
// If FRONTEND_AUTH_TOKEN is missing or blank, every request is rejected with 503
// rather than silently accepting the literal default-string as a valid token.
const FRONTEND_AUTH_TOKEN = process.env.FRONTEND_AUTH_TOKEN;
const AUTH_CONFIGURED = typeof FRONTEND_AUTH_TOKEN === 'string' && FRONTEND_AUTH_TOKEN.trim().length > 0;

/**
 * Verifies the Bearer token in the request headers.
 * Returns null if authorized, or a NextResponse with error if not.
 */
export function verifyApiAuth(req: NextRequest): NextResponse | null {
    // Fail-closed if the server is misconfigured. Better to 503 than to accept
    // a hardcoded default token.
    if (!AUTH_CONFIGURED) {
        return NextResponse.json(
            {
                error: 'Server auth not configured. Set FRONTEND_AUTH_TOKEN env var.',
                code: 'AUTH_NOT_CONFIGURED',
            },
            { status: 503 }
        );
    }

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
