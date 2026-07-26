// Ownership guard for POST /api/v1/connect/accounts.
//
// Any signed-in Firebase user passed verifyApiAuth (it only checks the token
// is valid, not whose artist the caller is acting on). Without an ownership
// check, any authenticated user could mint a Stripe Connect account for an
// artist they never claimed — attaching their own email as the account
// contact on someone else's payout profile.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyApiAuthMock, verifyFirebaseTokenMock, getArtistStripeMock, setArtistStripeAccountMock, accountsCreateMock } =
  vi.hoisted(() => ({
    verifyApiAuthMock: vi.fn(),
    verifyFirebaseTokenMock: vi.fn(),
    getArtistStripeMock: vi.fn(),
    setArtistStripeAccountMock: vi.fn(),
    accountsCreateMock: vi.fn(),
  }));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/auth-dal', () => ({ verifyFirebaseToken: verifyFirebaseTokenMock }));
vi.mock('@/lib/artist-stripe', () => ({
  getArtistStripe: getArtistStripeMock,
  setArtistStripeAccount: setArtistStripeAccountMock,
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { accounts: { create: accountsCreateMock } },
  stripeConfigured: true,
  STRIPE_NOT_CONFIGURED: { error: 'Stripe not configured.' },
}));

import { POST } from './route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/v1/connect/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyApiAuthMock.mockResolvedValue(null); // token is valid
  verifyFirebaseTokenMock.mockResolvedValue({ uid: 'uid_caller', email: 'caller@example.com' });
});

describe('POST /api/v1/connect/accounts — ownership guard', () => {
  it('refuses to create a Connect account for an artist the caller has not claimed', async () => {
    getArtistStripeMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: null,
      stripeAccountId: null,
      chargesEnabled: false,
      claimedByUid: 'uid_actual_owner',
    });

    const response = await POST(makeRequest({ artistId: 'artist_1' }));

    expect(response.status).toBe(403);
    expect(accountsCreateMock).not.toHaveBeenCalled();
    expect(setArtistStripeAccountMock).not.toHaveBeenCalled();
  });

  it('refuses when the artist has not been claimed by anyone yet', async () => {
    getArtistStripeMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: null,
      stripeAccountId: null,
      chargesEnabled: false,
      claimedByUid: null,
    });

    const response = await POST(makeRequest({ artistId: 'artist_1' }));

    expect(response.status).toBe(403);
    expect(accountsCreateMock).not.toHaveBeenCalled();
  });

  it('allows the artist who claimed the profile to create their own Connect account', async () => {
    getArtistStripeMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: null,
      stripeAccountId: null,
      chargesEnabled: false,
      claimedByUid: 'uid_caller',
    });
    accountsCreateMock.mockResolvedValue({ id: 'acct_new' });

    const response = await POST(makeRequest({ artistId: 'artist_1' }));

    expect(response.status).toBe(201);
    expect(setArtistStripeAccountMock).toHaveBeenCalledWith('artist_1', 'acct_new');
  });
});
