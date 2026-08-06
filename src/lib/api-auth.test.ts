import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyFirebaseToken } = vi.hoisted(() => ({
  verifyFirebaseToken: vi.fn(),
}));

vi.mock('./auth-dal', () => ({ verifyFirebaseToken }));

import { verifyApiAuth, verifyApiAuthWithUser } from './api-auth';

describe('verifyApiAuth', () => {
  beforeEach(() => verifyFirebaseToken.mockReset());

  it('rejects requests without a bearer token', async () => {
    const response = await verifyApiAuth(new NextRequest('http://localhost/api/test'));

    expect(response?.status).toBe(401);
    expect(verifyFirebaseToken).not.toHaveBeenCalled();
  });

  it('rejects invalid Firebase ID tokens', async () => {
    verifyFirebaseToken.mockResolvedValue(null);
    const request = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    });

    const response = await verifyApiAuth(request);

    expect(response?.status).toBe(401);
    expect(verifyFirebaseToken).toHaveBeenCalledWith(request);
  });

  // Regression guard (was reintroduced by PR #46 and exploitable in prod):
  // a shared static token equal to FRONTEND_AUTH_TOKEN must NOT authorize.
  // Such a token, paired with NEXT_PUBLIC_FRONTEND_AUTH_TOKEN, ships in the
  // browser bundle and would let anyone call protected/paid routes.
  it('rejects a bearer token equal to FRONTEND_AUTH_TOKEN (no static bypass)', async () => {
    vi.stubEnv('FRONTEND_AUTH_TOKEN', 'shared-frontend-token');
    try {
      verifyFirebaseToken.mockResolvedValue(null); // not a valid Firebase token
      const request = new NextRequest('http://localhost/api/test', {
        headers: { Authorization: 'Bearer shared-frontend-token' },
      });

      const response = await verifyApiAuth(request);

      // Must fall through to Firebase and be rejected — never short-circuit to null.
      expect(response?.status).toBe(401);
      expect(verifyFirebaseToken).toHaveBeenCalledWith(request);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('allows verified Firebase users', async () => {
    verifyFirebaseToken.mockResolvedValue({ uid: 'user-123' });
    const request = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    await expect(verifyApiAuth(request)).resolves.toBeNull();
  });

  it('verifies the token exactly ONCE even through the yes/no wrapper', async () => {
    // The wrapper delegates to verifyApiAuthWithUser — one implementation,
    // one decode. A second verifyIdToken round-trip on the same request is
    // the race the critique route hit: gate passes, re-decode transiently
    // fails, signed-in customer silently treated as anonymous.
    verifyFirebaseToken.mockResolvedValue({ uid: 'user-123' });
    const request = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    await verifyApiAuth(request);

    expect(verifyFirebaseToken).toHaveBeenCalledTimes(1);
  });
});

describe('verifyApiAuthWithUser', () => {
  beforeEach(() => verifyFirebaseToken.mockReset());

  it('hands back the decoded user from the SAME verification that authorized', async () => {
    verifyFirebaseToken.mockResolvedValue({ uid: 'user-123', email: 'u@example.com' });
    const request = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const result = await verifyApiAuthWithUser(request);

    expect(result.error).toBeNull();
    expect(result.user).toEqual({ uid: 'user-123', email: 'u@example.com' });
    // The pin: one token verification per request, never two.
    expect(verifyFirebaseToken).toHaveBeenCalledTimes(1);
  });

  it('refuses a missing bearer with the exact response verifyApiAuth sends', async () => {
    const result = await verifyApiAuthWithUser(new NextRequest('http://localhost/api/test'));

    expect(result.error?.status).toBe(401);
    expect(result.user).toBeUndefined();
    expect(verifyFirebaseToken).not.toHaveBeenCalled();
  });

  it('refuses an invalid token with 401 and no user', async () => {
    verifyFirebaseToken.mockResolvedValue(null);
    const request = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    });

    const result = await verifyApiAuthWithUser(request);

    expect(result.error?.status).toBe(401);
    expect(result.user).toBeUndefined();
    expect(verifyFirebaseToken).toHaveBeenCalledTimes(1);
  });
});
