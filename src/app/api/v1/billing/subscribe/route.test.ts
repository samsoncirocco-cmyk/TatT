// POST /api/v1/billing/subscribe stamped a client-supplied artistId straight
// into the Checkout Session's metadata.tattArtistId with no ownership check.
// The webhook (checkout.session.completed) reads that metadata and writes
// subscriptionStatus: 'active' onto whichever Artist node it names — so any
// signed-in user paying for their own subscription could tag the resulting
// active-subscription status onto an artist profile they never claimed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyApiAuthMock, verifyFirebaseTokenMock, getArtistStripeMock, createCheckoutSessionMock } = vi.hoisted(() => ({
  verifyApiAuthMock: vi.fn(),
  verifyFirebaseTokenMock: vi.fn(),
  getArtistStripeMock: vi.fn(),
  createCheckoutSessionMock: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/auth-dal', () => ({ verifyFirebaseToken: verifyFirebaseTokenMock }));
vi.mock('@/lib/artist-stripe', () => ({ getArtistStripe: getArtistStripeMock }));
vi.mock('@/lib/stripe', () => ({
  stripe: { checkout: { sessions: { create: createCheckoutSessionMock } } },
  stripeConfigured: true,
  STRIPE_NOT_CONFIGURED: { error: 'Stripe not configured.' },
}));

import { POST } from './route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/v1/billing/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyApiAuthMock.mockResolvedValue(null);
  verifyFirebaseTokenMock.mockResolvedValue({ uid: 'uid_caller', email: 'caller@example.com' });
  createCheckoutSessionMock.mockResolvedValue({ url: 'https://checkout.stripe.com/session/xyz' });
});

describe('POST /api/v1/billing/subscribe — ownership', () => {
  it('refuses to tag a subscription onto an artist the caller has not claimed', async () => {
    getArtistStripeMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: null,
      stripeAccountId: null,
      chargesEnabled: false,
      claimedByUid: 'uid_actual_owner',
    });

    const response = await POST(makeRequest({ priceId: 'price_123', artistId: 'artist_1' }));

    expect(response.status).toBe(403);
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it('allows the artist who claimed the profile to start their own subscription', async () => {
    getArtistStripeMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: null,
      stripeAccountId: null,
      chargesEnabled: false,
      claimedByUid: 'uid_caller',
      claimVerified: true,
    });

    const response = await POST(makeRequest({ priceId: 'price_123', artistId: 'artist_1' }));

    expect(response.status).toBe(200);
    expect(createCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ tattArtistId: 'artist_1' }) })
    );
  });

  it('allows subscribing without naming an artist at all (no ownership to check)', async () => {
    const response = await POST(makeRequest({ priceId: 'price_123' }));

    expect(response.status).toBe(200);
    expect(getArtistStripeMock).not.toHaveBeenCalled();
    expect(createCheckoutSessionMock).toHaveBeenCalled();
  });
});
