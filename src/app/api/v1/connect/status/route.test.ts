// The status route is both the honest-status source for the claim page AND a
// second trigger for releasing held deposits (the `account.updated` webhook is
// the first). These tests pin the two behaviours that make it worth having:
//   - it reports what Stripe ACTUALLY says, not what the redirect implied;
//   - it corrects the cached charges flag BEFORE attempting the release, so a
//     missing/late webhook can't strand an artist's money.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  retrieveAccountMock,
  getArtistStripeMock,
  setArtistChargesEnabledMock,
  listPendingByArtistMock,
  transferHeldDepositsMock,
  verifyFirebaseTokenMock,
} = vi.hoisted(() => ({
  retrieveAccountMock: vi.fn(),
  getArtistStripeMock: vi.fn(),
  setArtistChargesEnabledMock: vi.fn(),
  listPendingByArtistMock: vi.fn(),
  transferHeldDepositsMock: vi.fn(),
  verifyFirebaseTokenMock: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  verifyApiAuth: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/auth-dal', () => ({
  verifyFirebaseToken: verifyFirebaseTokenMock,
}));

vi.mock('@/lib/artist-stripe', () => ({
  getArtistStripe: getArtistStripeMock,
  setArtistChargesEnabled: setArtistChargesEnabledMock,
}));

vi.mock('@/lib/booking-relay', () => ({
  listPendingByArtist: listPendingByArtistMock,
  transferHeldDeposits: transferHeldDepositsMock,
}));

vi.mock('@/lib/stripe', async () => {
  const actual = await vi.importActual<typeof import('@/lib/stripe')>('@/lib/stripe');
  return {
    ...actual,
    stripeConfigured: true,
    stripe: { accounts: { retrieve: retrieveAccountMock } },
  };
});

import { POST } from './route';

const OWNER_UID = 'uid-artist-1';
const ACCT = 'acct_1TxCij2KLqoITkvS';

function artist(overrides: Record<string, unknown> = {}) {
  return {
    id: 'artist_1',
    name: 'Nadia Ink',
    email: 'nadia@example.com',
    stripeAccountId: ACCT,
    chargesEnabled: false,
    claimedByUid: OWNER_UID,
    claimVerified: true,
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown> = { artistId: 'artist_1' }) {
  return new Request('http://localhost/api/v1/connect/status', {
    method: 'POST',
    headers: { authorization: 'Bearer fake' },
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

/** One $150 deposit sitting in the hold. */
const HELD = [{ id: 'pi_1', amountCents: 15_000 }];

beforeEach(() => {
  vi.clearAllMocks();
  verifyFirebaseTokenMock.mockResolvedValue({ uid: OWNER_UID });
  getArtistStripeMock.mockResolvedValue(artist());
  setArtistChargesEnabledMock.mockResolvedValue(undefined);
  listPendingByArtistMock.mockResolvedValue(HELD);
  transferHeldDepositsMock.mockResolvedValue({ count: 0, totalTransferredCents: 0 });
});

describe('POST /api/v1/connect/status', () => {
  it('reports not_started for an artist who never opened the Stripe form', async () => {
    retrieveAccountMock.mockResolvedValue({
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      requirements: { currently_due: ['external_account'], disabled_reason: 'requirements.past_due' },
    });

    const res = await POST(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.state).toBe('not_started');
    expect(body.chargesEnabled).toBe(false);
    expect(body.heldDeposit).toEqual({ count: 1, amountCents: 15_000 });
    expect(transferHeldDepositsMock).not.toHaveBeenCalled();
  });

  it('reports requirements_due, with the outstanding keys, for an abandoned onboarding', async () => {
    retrieveAccountMock.mockResolvedValue({
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: true,
      requirements: {
        currently_due: ['individual.verification.document'],
        disabled_reason: 'requirements.currently_due',
      },
    });

    const body = await (await POST(makeRequest())).json();
    expect(body.state).toBe('requirements_due');
    expect(body.requirementsDue).toEqual(['individual.verification.document']);
    // No money moves while the artist is still blocked.
    expect(transferHeldDepositsMock).not.toHaveBeenCalled();
    expect(body.released).toEqual({ count: 0, amountCents: 0 });
  });

  it('does not claim success just because Stripe redirected the artist back', async () => {
    // The return_url fires whether or not the artist finished. Only the live
    // account decides.
    retrieveAccountMock.mockResolvedValue({
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: true,
      requirements: { currently_due: [], pending_verification: ['individual.verification.document'] },
    });

    const body = await (await POST(makeRequest())).json();
    expect(body.state).toBe('pending_verification');
    expect(body.chargesEnabled).toBe(false);
  });

  it('releases held deposits once charges are enabled', async () => {
    retrieveAccountMock.mockResolvedValue({
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      requirements: { currently_due: [] },
    });
    transferHeldDepositsMock.mockResolvedValue({ count: 1, totalTransferredCents: 15_000 });
    listPendingByArtistMock.mockResolvedValue([]); // flushed by the transfer

    const body = await (await POST(makeRequest())).json();
    expect(body.state).toBe('enabled');
    expect(transferHeldDepositsMock).toHaveBeenCalledWith('artist_1');
    expect(body.released).toEqual({ count: 1, amountCents: 15_000 });
    expect(body.heldDeposit).toEqual({ count: 0, amountCents: 0 });
  });

  it('caches the charges flag BEFORE transferring, so a late webhook cannot strand the money', async () => {
    // transferHeldDeposits re-reads the cached flag from the artist node; if we
    // released first the transfer would refuse on a stale `false`.
    const order: string[] = [];
    setArtistChargesEnabledMock.mockImplementation(async () => {
      order.push('cache');
    });
    transferHeldDepositsMock.mockImplementation(async () => {
      order.push('transfer');
      return { count: 1, totalTransferredCents: 15_000 };
    });
    retrieveAccountMock.mockResolvedValue({
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      requirements: {},
    });

    await POST(makeRequest());
    expect(setArtistChargesEnabledMock).toHaveBeenCalledWith(ACCT, true);
    expect(order).toEqual(['cache', 'transfer']);
  });

  it('still returns an honest status when the release throws', async () => {
    retrieveAccountMock.mockResolvedValue({
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      requirements: {},
    });
    transferHeldDepositsMock.mockRejectedValue(new Error('Stripe transfer failed'));

    const res = await POST(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.state).toBe('enabled');
    expect(body.released).toEqual({ count: 0, amountCents: 0 });
    // The deposit is still shown as held — not silently reported as paid out.
    expect(body.heldDeposit).toEqual({ count: 1, amountCents: 15_000 });
  });

  it('reports no_account without calling Stripe when the artist has no connected account', async () => {
    getArtistStripeMock.mockResolvedValue(artist({ stripeAccountId: null }));
    const body = await (await POST(makeRequest())).json();
    expect(body.state).toBe('no_account');
    expect(retrieveAccountMock).not.toHaveBeenCalled();
  });

  it('refuses to report on a profile claimed by someone else', async () => {
    getArtistStripeMock.mockResolvedValue(artist({ claimedByUid: 'uid-someone-else' }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    expect(retrieveAccountMock).not.toHaveBeenCalled();
  });

  it('502s when the connected account cannot be read', async () => {
    retrieveAccountMock.mockRejectedValue(new Error('No such account'));
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect(transferHeldDepositsMock).not.toHaveBeenCalled();
  });

  it('400s without an artistId', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
