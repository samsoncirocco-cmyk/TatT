import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSessionMock, getArtistStripeMock, bookingData } = vi.hoisted(() => ({
  createSessionMock: vi.fn(),
  getArtistStripeMock: vi.fn(),
  bookingData: { uid: 'owner-uid', status: 'deposit_paid', artistId: 'artist-1' },
}));

vi.mock('@/lib/api-auth', () => ({
  verifyApiAuth: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/auth-dal', () => ({
  verifyFirebaseToken: vi.fn().mockResolvedValue({ uid: 'owner-uid' }),
}));

vi.mock('@/lib/firebase-admin', () => ({
  ensureAdminApp: () => true,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: async () => ({
          exists: true,
          data: () => bookingData,
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: { checkout: { sessions: { create: createSessionMock } } },
  stripeConfigured: true,
  platformFeeCents: (amount: number) => amount / 10,
  CURRENCY: 'usd',
}));

vi.mock('@/lib/artist-stripe', () => ({
  getArtistStripe: getArtistStripeMock,
}));

import { POST } from './route';

const payload = {
  artistId: 'artist-1',
  artistName: 'Artist One',
  size: 'small',
  placement: 'arm',
  date: '2026-08-01',
  time: '12:00',
  budget: '$500',
  clientName: 'Client',
  clientEmail: 'client@example.com',
  bookingId: 'booking-1',
};

describe('POST /api/checkout', () => {
  beforeEach(() => {
    Object.assign(bookingData, { uid: 'owner-uid', status: 'pending', artistId: 'artist-1' });
    createSessionMock.mockReset();
    createSessionMock.mockResolvedValue({ url: 'https://checkout.stripe.test/session' });
    getArtistStripeMock.mockReset();
    getArtistStripeMock.mockResolvedValue({
      stripeAccountId: 'acct_artist',
      chargesEnabled: true,
    });
  });

  it('rejects another checkout after the booking deposit is paid', async () => {
    bookingData.status = 'deposit_paid';
    const request = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(request as any);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Booking is no longer awaiting a deposit.',
    });
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('returns not found when the booking belongs to another user', async () => {
    bookingData.uid = 'another-owner';
    const request = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(request as any);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Booking not found.' });
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('rejects checkout for an artist other than the booking artist', async () => {
    const request = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, artistId: 'artist-2' }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(request as any);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Booking artist does not match checkout artist.',
    });
    expect(getArtistStripeMock).not.toHaveBeenCalled();
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('uses one Stripe idempotency key for parallel requests to the same booking', async () => {
    const makeRequest = () =>
      new Request('http://localhost/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      POST(makeRequest() as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      POST(makeRequest() as any),
    ]);

    expect(createSessionMock).toHaveBeenCalledTimes(2);
    for (const call of createSessionMock.mock.calls) {
      expect(call[1]).toEqual({ idempotencyKey: 'booking-deposit:booking-1' });
    }
  });
});
