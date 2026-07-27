// GET /api/v1/artist/bookings — the artist-side booking inbox.
// The load-bearing assertions: the artist is resolved from the VERIFIED uid
// (never a client-supplied id), the response surfaces statusHistory (TAT-24),
// and server-side metadata (ip, client uid) never reaches the artist.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  verifyFirebaseTokenMock,
  getArtistByClaimedUidMock,
  ensureAdminAppMock,
  firestoreGetMock,
  whereMock,
} = vi.hoisted(() => ({
  verifyFirebaseTokenMock: vi.fn(),
  getArtistByClaimedUidMock: vi.fn(),
  ensureAdminAppMock: vi.fn(),
  firestoreGetMock: vi.fn(),
  whereMock: vi.fn(),
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

vi.mock('@/lib/firebase-admin', () => ({
  ensureAdminApp: ensureAdminAppMock,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      where: whereMock.mockReturnValue({ get: firestoreGetMock }),
    }),
  }),
}));

import { GET } from './route';

const UID = 'uid-artist-1';

function makeRequest() {
  return new NextRequest('http://localhost/api/v1/artist/bookings', {
    headers: { authorization: 'Bearer fake' },
  });
}

function doc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

const ARTIST = {
  id: 'artist_1',
  name: 'Nadia Ink',
  email: null,
  stripeAccountId: 'acct_123',
  chargesEnabled: true,
  claimedByUid: UID,
};

beforeEach(() => {
  vi.clearAllMocks();
  verifyFirebaseTokenMock.mockResolvedValue({ uid: UID });
  getArtistByClaimedUidMock.mockResolvedValue(ARTIST);
  ensureAdminAppMock.mockReturnValue('env');
  firestoreGetMock.mockResolvedValue({ docs: [] });
});

describe('GET /api/v1/artist/bookings', () => {
  it('queries by the artist id resolved from the verified uid — not from the request', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(getArtistByClaimedUidMock).toHaveBeenCalledWith(UID);
    expect(whereMock).toHaveBeenCalledWith('artistId', '==', 'artist_1');
  });

  it('surfaces statusHistory and strips ip and client uid', async () => {
    firestoreGetMock.mockResolvedValue({
      docs: [
        doc('BK-1', {
          bookingId: 'BK-1',
          artistId: 'artist_1',
          clientName: 'Sam C',
          status: 'deposit_paid',
          createdAt: '2026-07-01T00:00:00.000Z',
          ip: '10.0.0.1',
          uid: 'uid-client-9',
          statusHistory: [
            { status: 'deposit_paid', at: '2026-07-01T01:00:00.000Z', by: 'stripe-webhook' },
          ],
        }),
      ],
    });

    const body = await (await GET(makeRequest())).json();
    expect(body.bookings).toHaveLength(1);
    const booking = body.bookings[0];
    expect(booking.statusHistory).toEqual([
      { status: 'deposit_paid', at: '2026-07-01T01:00:00.000Z', by: 'stripe-webhook' },
    ]);
    expect(booking.ip).toBeUndefined();
    expect(booking.uid).toBeUndefined();
    // The client's contact details are the point of the booking — they stay.
    expect(booking.clientName).toBe('Sam C');
  });

  it('collapses uid actors in the history to "client" — the trail stays, the identifier does not', async () => {
    firestoreGetMock.mockResolvedValue({
      docs: [
        doc('BK-2', {
          bookingId: 'BK-2',
          artistId: 'artist_1',
          status: 'cancelled',
          statusHistory: [
            { status: 'pending', at: '2026-07-01T00:00:00.000Z', by: 'system' },
            { status: 'cancelled', at: '2026-07-02T00:00:00.000Z', by: 'uid-client-9' },
          ],
        }),
      ],
    });

    const body = await (await GET(makeRequest())).json();
    expect(body.bookings[0].statusHistory.map((e: { by: string }) => e.by)).toEqual([
      'system',
      'client',
    ]);
  });

  it('sorts newest first', async () => {
    firestoreGetMock.mockResolvedValue({
      docs: [
        doc('BK-old', { createdAt: '2026-06-01T00:00:00.000Z' }),
        doc('BK-new', { createdAt: '2026-07-01T00:00:00.000Z' }),
      ],
    });
    const body = await (await GET(makeRequest())).json();
    expect(body.bookings.map((b: { id: string }) => b.id)).toEqual(['BK-new', 'BK-old']);
  });

  it('403s with NO_CLAIMED_ARTIST for a signed-in user who is not an artist', async () => {
    getArtistByClaimedUidMock.mockResolvedValue(null);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.code).toBe('NO_CLAIMED_ARTIST');
    expect(firestoreGetMock).not.toHaveBeenCalled();
  });

  it('503s when the artist lookup itself fails — an outage is not "not an artist"', async () => {
    getArtistByClaimedUidMock.mockRejectedValue(new Error('neo4j down'));
    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
  });

  it('returns an honest empty list when Firebase Admin is unconfigured', async () => {
    ensureAdminAppMock.mockReturnValue(null);
    const body = await (await GET(makeRequest())).json();
    expect(body).toEqual({ success: true, bookings: [] });
    expect(firestoreGetMock).not.toHaveBeenCalled();
  });

  it('503s on a query failure — never a false empty inbox', async () => {
    firestoreGetMock.mockRejectedValue(new Error('firestore down'));
    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
  });

  it('401s when the token does not verify', async () => {
    verifyFirebaseTokenMock.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(getArtistByClaimedUidMock).not.toHaveBeenCalled();
  });
});
