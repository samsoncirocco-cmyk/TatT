// POST /api/v1/billing/portal used to trust a client-supplied Stripe
// customerId with no ownership check at all — any signed-in user could open
// a Billing Portal session (view invoices, change payment method, cancel a
// subscription) for an arbitrary Stripe customer id. The fix derives the
// customer id server-side from the caller's own claimed artist profile —
// the route no longer reads a customerId from the request body at all, so
// there's no client-supplied value to spoof.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyApiAuthMock, verifyFirebaseTokenMock, getArtistStripeCustomerIdMock, createPortalSessionMock } =
  vi.hoisted(() => ({
    verifyApiAuthMock: vi.fn(),
    verifyFirebaseTokenMock: vi.fn(),
    getArtistStripeCustomerIdMock: vi.fn(),
    createPortalSessionMock: vi.fn(),
  }));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/auth-dal', () => ({ verifyFirebaseToken: verifyFirebaseTokenMock }));
vi.mock('@/lib/artist-stripe', () => ({ getArtistStripeCustomerId: getArtistStripeCustomerIdMock }));
vi.mock('@/lib/stripe', () => ({
  stripe: { billingPortal: { sessions: { create: createPortalSessionMock } } },
  stripeConfigured: true,
  STRIPE_NOT_CONFIGURED: { error: 'Stripe not configured.' },
}));

import { POST } from './route';

function makeRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/v1/billing/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyApiAuthMock.mockResolvedValue(null);
  verifyFirebaseTokenMock.mockResolvedValue({ uid: 'uid_caller', email: 'caller@example.com' });
});

describe('POST /api/v1/billing/portal — ownership', () => {
  it('ignores a client-supplied customerId and derives it from the caller instead', async () => {
    getArtistStripeCustomerIdMock.mockResolvedValue('cus_caller_own');
    createPortalSessionMock.mockResolvedValue({ url: 'https://billing.stripe.com/session/xyz' });

    // A client-supplied id for someone else's customer must never reach Stripe.
    const response = await POST(makeRequest({ customerId: 'cus_someone_elses_account' }));

    expect(response.status).toBe(200);
    expect(createPortalSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_caller_own' })
    );
    expect(getArtistStripeCustomerIdMock).toHaveBeenCalledWith('uid_caller');
  });

  it('refuses when the caller has no billing customer on file', async () => {
    getArtistStripeCustomerIdMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ customerId: 'cus_someone_elses_account' }));

    expect(response.status).toBe(404);
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });
});
