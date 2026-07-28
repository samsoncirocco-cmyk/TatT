// Ownership guard for POST /api/v1/connect/login-link.
//
// A login link drops the bearer straight into the artist's Express dashboard
// (balance, payout history, bank details). Without an ownership check, any
// signed-in user could mint one for an artist they never claimed and read
// (or on some Express permission sets, edit) someone else's payout account.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyApiAuthMock, verifyFirebaseTokenMock, getArtistStripeMock, createLoginLinkMock } = vi.hoisted(() => ({
  verifyApiAuthMock: vi.fn(),
  verifyFirebaseTokenMock: vi.fn(),
  getArtistStripeMock: vi.fn(),
  createLoginLinkMock: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/auth-dal', () => ({ verifyFirebaseToken: verifyFirebaseTokenMock }));
vi.mock('@/lib/artist-stripe', () => ({ getArtistStripe: getArtistStripeMock }));
vi.mock('@/lib/stripe', () => ({
  stripe: { accounts: { createLoginLink: createLoginLinkMock } },
  stripeConfigured: true,
  STRIPE_NOT_CONFIGURED: { error: 'Stripe not configured.' },
}));

import { POST } from './route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/v1/connect/login-link', {
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

describe('POST /api/v1/connect/login-link — ownership guard', () => {
  it('refuses to mint a dashboard login link for an artist the caller has not claimed', async () => {
    getArtistStripeMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: null,
      stripeAccountId: 'acct_victim',
      chargesEnabled: true,
      claimedByUid: 'uid_actual_owner',
    });

    const response = await POST(makeRequest({ artistId: 'artist_1' }));

    expect(response.status).toBe(403);
    expect(createLoginLinkMock).not.toHaveBeenCalled();
  });

  it('allows the artist who claimed the profile to mint their own login link', async () => {
    getArtistStripeMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: null,
      stripeAccountId: 'acct_owned',
      chargesEnabled: true,
      claimedByUid: 'uid_caller',
      claimVerified: true,
    });
    createLoginLinkMock.mockResolvedValue({ url: 'https://connect.stripe.com/express/link' });

    const response = await POST(makeRequest({ artistId: 'artist_1' }));

    expect(response.status).toBe(200);
    expect(createLoginLinkMock).toHaveBeenCalledWith('acct_owned');
  });
});
