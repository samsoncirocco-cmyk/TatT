import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSessionMock, bookingData } = vi.hoisted(() => ({
  createSessionMock: vi.fn(),
  bookingData: { uid: 'owner-uid', status: 'deposit_paid' },
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
  getArtistStripe: vi.fn(),
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
    createSessionMock.mockClear();
  });

  it('rejects another checkout after the booking deposit is paid', async () => {
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
});
