// Ownership guard for POST /api/v1/connect/claim-complete.
//
// This route triggers a real money movement (transferHeldDeposits). Any
// signed-in user passed verifyApiAuth regardless of whose artist profile they
// named — without an ownership check, anyone could force an early release of
// deposits held for an artist they never claimed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyApiAuthMock, verifyFirebaseTokenMock, getArtistStripeMock, transferHeldDepositsMock } = vi.hoisted(() => ({
  verifyApiAuthMock: vi.fn(),
  verifyFirebaseTokenMock: vi.fn(),
  getArtistStripeMock: vi.fn(),
  transferHeldDepositsMock: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/auth-dal', () => ({ verifyFirebaseToken: verifyFirebaseTokenMock }));
vi.mock('@/lib/artist-stripe', () => ({ getArtistStripe: getArtistStripeMock }));
vi.mock('@/lib/booking-relay', () => ({ transferHeldDeposits: transferHeldDepositsMock }));
vi.mock('@/lib/stripe', () => ({
  stripeConfigured: true,
  STRIPE_NOT_CONFIGURED: { error: 'Stripe not configured.' },
}));

import { POST } from './route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/v1/connect/claim-complete', {
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

describe('POST /api/v1/connect/claim-complete — ownership guard', () => {
  it('refuses to release held deposits for an artist the caller has not claimed', async () => {
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
    expect(transferHeldDepositsMock).not.toHaveBeenCalled();
  });

  it('404s for an unknown artist rather than attempting the transfer', async () => {
    getArtistStripeMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ artistId: 'nope' }));

    expect(response.status).toBe(404);
    expect(transferHeldDepositsMock).not.toHaveBeenCalled();
  });

  it('allows the artist who claimed the profile to release their own held deposits', async () => {
    getArtistStripeMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: null,
      stripeAccountId: 'acct_owned',
      chargesEnabled: true,
      claimedByUid: 'uid_caller',
      claimVerified: true,
    });
    transferHeldDepositsMock.mockResolvedValue({ count: 2, totalTransferredCents: 22_500 });

    const response = await POST(makeRequest({ artistId: 'artist_1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ transferred: 2, total: 22_500 });
    expect(transferHeldDepositsMock).toHaveBeenCalledWith('artist_1');
  });
});
