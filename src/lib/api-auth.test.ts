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

  it('allows verified Firebase users', async () => {
    verifyFirebaseToken.mockResolvedValue({ uid: 'user-123' });
    const request = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    await expect(verifyApiAuth(request)).resolves.toBeNull();
  });
});
