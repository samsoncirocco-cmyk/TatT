// The Account Link route is the only door an artist has into Stripe KYC.
// If it hands out a link for the wrong account, an attacker attaches their own
// identity and bank details to another artist's payouts — so ownership is
// asserted here alongside the happy path.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createLinkMock, getArtistStripeMock, verifyFirebaseTokenMock } = vi.hoisted(() => ({
  createLinkMock: vi.fn(),
  getArtistStripeMock: vi.fn(),
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
}));

vi.mock('@/lib/stripe', async () => {
  const actual = await vi.importActual<typeof import('@/lib/stripe')>('@/lib/stripe');
  return {
    ...actual,
    stripeConfigured: true,
    stripe: { accountLinks: { create: createLinkMock } },
  };
});

import { POST } from './route';

const OWNER_UID = 'uid-artist-1';

function artist(overrides: Record<string, unknown> = {}) {
  return {
    id: 'artist_1',
    name: 'Nadia Ink',
    email: 'nadia@example.com',
    stripeAccountId: 'acct_1TxCij2KLqoITkvS',
    chargesEnabled: false,
    claimedByUid: OWNER_UID,
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown> = { artistId: 'artist_1' }) {
  return new Request('http://localhost/api/v1/connect/onboarding-link', {
    method: 'POST',
    headers: { authorization: 'Bearer fake', origin: 'https://tatt.example' },
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_APP_URL;
  verifyFirebaseTokenMock.mockResolvedValue({ uid: OWNER_UID });
  getArtistStripeMock.mockResolvedValue(artist());
  createLinkMock.mockResolvedValue({
    url: 'https://connect.stripe.com/setup/e/acct_1TxCij2KLqoITkvS/abc123',
    expires_at: 1785099999,
  });
});

describe('POST /api/v1/connect/onboarding-link', () => {
  it('returns a Stripe-hosted onboarding URL for the owning artist', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      url: 'https://connect.stripe.com/setup/e/acct_1TxCij2KLqoITkvS/abc123',
    });
  });

  it('points Stripe back at the claim page with distinct return and refresh markers', async () => {
    await POST(makeRequest());
    const args = createLinkMock.mock.calls[0][0];
    expect(args.account).toBe('acct_1TxCij2KLqoITkvS');
    expect(args.type).toBe('account_onboarding');
    expect(args.return_url).toBe('https://tatt.example/claim/artist_1?onboarding=return');
    expect(args.refresh_url).toBe('https://tatt.example/claim/artist_1?onboarding=refresh');
  });

  it('collects eventually-due fields so the artist is not bounced back mid-hold', async () => {
    await POST(makeRequest());
    expect(createLinkMock.mock.calls[0][0].collection_options).toEqual({ fields: 'eventually_due' });
  });

  it('refuses to mint a link for a profile claimed by someone else', async () => {
    getArtistStripeMock.mockResolvedValue(artist({ claimedByUid: 'uid-someone-else' }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    expect(createLinkMock).not.toHaveBeenCalled();
  });

  it('refuses when the profile is unclaimed', async () => {
    getArtistStripeMock.mockResolvedValue(artist({ claimedByUid: null }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    expect(createLinkMock).not.toHaveBeenCalled();
  });

  it('409s when the artist has no connected account to onboard', async () => {
    getArtistStripeMock.mockResolvedValue(artist({ stripeAccountId: null }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(409);
    expect(createLinkMock).not.toHaveBeenCalled();
  });

  it('404s for an unknown artist', async () => {
    getArtistStripeMock.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
  });

  it('400s without an artistId', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('surfaces a Stripe failure as 502 rather than a broken link', async () => {
    createLinkMock.mockRejectedValue(new Error('Account cannot be onboarded via Account Links.'));
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({
      error: 'Account cannot be onboarded via Account Links.',
    });
  });
});
