import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

// Initialize Firebase Admin (server-side only)
if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else if (projectId) {
    // Fallback: use Application Default Credentials (for local dev with gcloud auth)
    initializeApp({ projectId });
  } else {
    console.warn('[Auth DAL] No Firebase Admin credentials configured. Token verification will fail.');
  }
}

interface VerifiedUser {
  uid: string;
  email?: string;
}

/**
 * Verify Firebase ID token from Authorization header.
 * Returns the decoded user or null if invalid.
 */
export async function verifyFirebaseToken(req: NextRequest): Promise<VerifiedUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return { uid: decodedToken.uid, email: decodedToken.email };
  } catch (error) {
    console.error('[Auth DAL] Token verification failed:', error);
    return null;
  }
}

/**
 * Require authenticated user on API route.
 * Returns user if authenticated, or sends 401 response.
 */
export async function requireAuth(req: NextRequest): Promise<VerifiedUser | NextResponse> {
  const user = await verifyFirebaseToken(req);

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="TatT API"' } }
    );
  }

  return user;
}

/**
 * Check if result from requireAuth is an error response.
 */
export function isAuthError(result: VerifiedUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
