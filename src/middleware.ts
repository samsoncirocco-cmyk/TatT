import { authMiddleware } from 'next-firebase-auth-edge/lib/next/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'];

const commonOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  cookieName: 'AuthToken',
  cookieSignatureKeys: [
    process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT!,
    process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS!,
  ],
  cookieSerializeOptions: {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 12 * 60 * 60 * 24, // 12 days
  },
  serviceAccount: {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cloud Tasks callbacks authenticate via OIDC and aren't user cookie based.
  // Bypass next-firebase-auth-edge middleware for this endpoint.
  if (pathname === '/api/v1/tasks/generate') {
    return NextResponse.next();
  }

  // CORS origin check (defense-in-depth; API Gateway may handle preflight).
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !origin.endsWith('.vercel.app')) {
    return NextResponse.json(
      { error: 'Origin not allowed', code: 'CORS_FORBIDDEN' },
      { status: 403 }
    );
  }

  // If auth middleware isn't configured (common in Cloud Run where secrets are injected later),
  // don't fail requests with a 500. API Gateway can still enforce Firebase auth.
  const hasAuthConfig =
    !!commonOptions.apiKey &&
    !!commonOptions.cookieSignatureKeys?.[0] &&
    !!commonOptions.cookieSignatureKeys?.[1] &&
    !!commonOptions.serviceAccount?.projectId &&
    !!commonOptions.serviceAccount?.clientEmail &&
    !!commonOptions.serviceAccount?.privateKey;

  if (!hasAuthConfig) {
    return NextResponse.next();
  }

  return authMiddleware(request, {
    loginPath: '/api/login',
    logoutPath: '/api/logout',
    ...commonOptions,
    handleValidToken: async ({ token, decodedToken }) => {
      return NextResponse.next();
    },
    handleInvalidToken: async (reason) => {
      // API routes: return 401 JSON
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="TatT API"' } }
        );
      }

      // Page routes: redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    },
    handleError: async (error) => {
      console.error('[Middleware] Auth error:', error);
      const { pathname } = request.nextUrl;

      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication error', code: 'AUTH_ERROR' },
          { status: 401 }
        );
      }

      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    },
  });
}

export const config = {
  matcher: [
    '/api/v1/:path*',
    '/api/login',
    '/api/logout',
    '/dashboard/:path*',
    '/generate/:path*',
    '/smart-match/:path*',
    '/visualize/:path*',
  ],
};
