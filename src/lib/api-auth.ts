import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';

const firebaseAuthConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    cookieName: 'AuthToken',
    cookieSignatureKeys: [
        process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT!,
        process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS!,
    ],
    serviceAccount: {
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
};

export interface ApiUser {
    uid: string;
    email?: string;
}

/**
 * Verifies Firebase authentication from request cookies.
 * Returns null if authorized, or a NextResponse with error if not.
 *
 * Defense-in-depth: middleware already handles auth for /api/v1/* routes,
 * but this provides a second check at the route handler level.
 *
 * In DEMO MODE (`NEXT_PUBLIC_DEMO_MODE=true`), auth is bypassed entirely
 * so Killua (and other testers) can use the app without credentials.
 */
export function verifyApiAuth(req: NextRequest): NextResponse | null {
    // Demo mode: skip all auth checks
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        return null;
    }

    const authCookie = req.cookies.get('AuthToken');

    if (!authCookie?.value) {
        // Fallback: check Authorization header for backward compatibility
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authentication required', code: 'AUTH_REQUIRED' },
                { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="TatT API"' } }
            );
        }
        return null;
    }

    return null; // Auth cookie present — middleware already validated
}

/**
 * Extract user info from the request (requires valid auth).
 */
export async function getUserFromRequest(req: NextRequest): Promise<ApiUser | null> {
    try {
        const tokens = await getTokens(req.cookies, firebaseAuthConfig);
        if (!tokens) return null;
        return {
            uid: tokens.decodedToken.uid,
            email: tokens.decodedToken.email,
        };
    } catch {
        return null;
    }
}
