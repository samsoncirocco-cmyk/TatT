import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS origin check (defense-in-depth; API Gateway may handle preflight).
  // Same-origin requests are always allowed — the browser sets Origin on
  // same-site POSTs too, and blocking them broke every custom domain
  // (tatttester.com etc.) the moment it was pointed at the app.
  const origin = request.headers.get('origin');
  const sameOrigin = origin === `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  if (
    origin &&
    !sameOrigin &&
    !ALLOWED_ORIGINS.includes(origin) &&
    !origin.endsWith('.vercel.app')
  ) {
    return NextResponse.json(
      { error: 'Origin not allowed', code: 'CORS_FORBIDDEN' },
      { status: 403 }
    );
  }

  // Authentication is enforced by each route using Firebase ID tokens,
  // Stripe signatures, or Cloud Tasks OIDC as appropriate.
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
