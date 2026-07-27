import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  verifyFirebaseTokenMock,
  requestArtistClaimMock,
  notifyOpsOfArtistClaimMock,
  listPendingByArtistMock,
  rateLimitMock,
} = vi.hoisted(() => ({
  verifyFirebaseTokenMock: vi.fn(),
  requestArtistClaimMock: vi.fn(),
  notifyOpsOfArtistClaimMock: vi.fn(),
  listPendingByArtistMock: vi.fn(),
  rateLimitMock: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/auth-dal', () => ({ verifyFirebaseToken: verifyFirebaseTokenMock }));
vi.mock('@/lib/artist-claim-graph', () => ({ requestArtistClaim: requestArtistClaimMock }));
vi.mock('@/lib/notify', () => ({ notifyOpsOfArtistClaim: notifyOpsOfArtistClaimMock }));
vi.mock('@/lib/booking-relay', () => ({ listPendingByArtist: listPendingByArtistMock }));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
  rateLimitResponse: vi.fn(() => new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 })),
}));

import { POST } from './route';

function request() {
  return new NextRequest('http://localhost/api/v1/connect/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
    body: JSON.stringify({ artistId: 'artist_1' }),
  });
}

const artist = {
  id: 'artist_1',
  name: 'Nadia Ink',
  instagram: '@nadia.ink',
  claimedByUid: null,
  claimVerificationStatus: null,
  stripeAccountId: null,
  chargesEnabled: false,
};
const pending = {
  id: 'CL-1234ABCD',
  artistId: 'artist_1',
  uid: 'uid_1',
  contactEmail: 'nadia@example.com',
  instagram: '@nadia.ink',
  verificationCode: 'TATT-ABCD1234',
  status: 'pending_verification',
  issuedAtEpochMs: Date.now(),
};

beforeEach(() => {
  vi.clearAllMocks();
  verifyFirebaseTokenMock.mockResolvedValue({ uid: `uid_${Math.random()}`, email: 'nadia@example.com' });
  requestArtistClaimMock.mockResolvedValue({ artist, request: pending });
  notifyOpsOfArtistClaimMock.mockResolvedValue({ delivered: true });
  listPendingByArtistMock.mockResolvedValue([
    { amountCents: 12_500 },
    { amountCents: 7_500 },
  ]);
  rateLimitMock.mockResolvedValue({ allowed: true, limit: 5, remaining: 4, reset: 0 });
});

describe('POST /api/v1/connect/claim', () => {
  it('records a pending request without certifying ownership', async () => {
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      claimed: false,
      verificationStatus: 'pending_verification',
      requestId: 'CL-1234ABCD',
      verificationCode: 'TATT-ABCD1234',
      pendingDeposit: { count: 2, amountCents: 20_000 },
    });
    expect(notifyOpsOfArtistClaimMock).toHaveBeenCalledTimes(1);
  });

  it('does not pretend the request is actionable when ops delivery fails', async () => {
    notifyOpsOfArtistClaimMock.mockResolvedValue({ delivered: false, reason: 'no inbox' });
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      claimed: false,
      verificationStatus: 'pending_verification',
    });
  });

  it('is idempotent for the same already-verified owner', async () => {
    verifyFirebaseTokenMock.mockResolvedValue({ uid: 'uid_owner', email: 'nadia@example.com' });
    requestArtistClaimMock.mockResolvedValue({
      artist: {
        ...artist,
        claimedByUid: 'uid_owner',
        claimVerificationStatus: 'verified',
        stripeAccountId: 'acct_1',
        chargesEnabled: true,
      },
      request: null,
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      claimed: true,
      verificationStatus: 'verified',
      hasConnectedAccount: true,
      chargesEnabled: true,
    });
    expect(notifyOpsOfArtistClaimMock).not.toHaveBeenCalled();
  });

  it('never replaces another verified owner', async () => {
    requestArtistClaimMock.mockResolvedValue({
      artist: {
        ...artist,
        claimedByUid: 'uid_other',
        claimVerificationStatus: 'verified',
      },
      request: pending,
    });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('ALREADY_CLAIMED');
  });
});
