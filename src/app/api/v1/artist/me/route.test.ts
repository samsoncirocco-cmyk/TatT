// GET /api/v1/artist/me — the console's "which artist am I?" resolver.
// The load-bearing distinctions: identity comes ONLY from the verified uid,
// "no claimed profile" is an honest null (200), and an infra failure is a 503
// (never a null that would misdirect a real artist into the claim flow).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyFirebaseTokenMock, getArtistByClaimedUidMock } = vi.hoisted(() => ({
  verifyFirebaseTokenMock: vi.fn(),
  getArtistByClaimedUidMock: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  verifyApiAuth: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/auth-dal', () => ({
  verifyFirebaseToken: verifyFirebaseTokenMock,
}));

vi.mock('@/lib/artist-stripe', () => ({
  getArtistByClaimedUid: getArtistByClaimedUidMock,
}));

import { GET } from './route';

const UID = 'uid-artist-1';

function makeRequest() {
  return new NextRequest('http://localhost/api/v1/artist/me', {
    headers: { authorization: 'Bearer fake' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyFirebaseTokenMock.mockResolvedValue({ uid: UID });
});

describe('GET /api/v1/artist/me', () => {
  it('returns the claimed artist, resolved from the verified uid', async () => {
    getArtistByClaimedUidMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: 'nadia@example.com',
      stripeAccountId: 'acct_123',
      chargesEnabled: true,
      claimedByUid: UID,
    });

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.artist).toEqual({
      id: 'artist_1',
      name: 'Nadia Ink',
      hasConnectedAccount: true,
      chargesEnabled: true,
    });
    expect(getArtistByClaimedUidMock).toHaveBeenCalledWith(UID);
  });

  it('never echoes internal fields (email, uid, account id) to the client', async () => {
    getArtistByClaimedUidMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: 'nadia@example.com',
      stripeAccountId: 'acct_123',
      chargesEnabled: false,
      claimedByUid: UID,
    });

    const body = await (await GET(makeRequest())).json();
    expect(body.artist.email).toBeUndefined();
    expect(body.artist.stripeAccountId).toBeUndefined();
    expect(body.artist.claimedByUid).toBeUndefined();
  });

  it('returns artist: null for a signed-in user with no claimed profile', async () => {
    getArtistByClaimedUidMock.mockResolvedValue(null);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.artist).toBeNull();
  });

  it('401s when the token does not verify', async () => {
    verifyFirebaseTokenMock.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(getArtistByClaimedUidMock).not.toHaveBeenCalled();
  });

  it('503s on a lookup failure — never a null that misdirects an artist to /claim', async () => {
    getArtistByClaimedUidMock.mockRejectedValue(new Error('neo4j down'));
    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
  });
});
