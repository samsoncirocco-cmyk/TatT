import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyFirebaseToken } = vi.hoisted(() => ({
  verifyFirebaseToken: vi.fn(),
}));

vi.mock('./auth-dal', () => ({ verifyFirebaseToken }));

import { verifyApiAuth } from './api-auth';

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
});
