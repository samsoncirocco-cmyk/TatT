// @vitest-environment jsdom
//
// What an artist actually SEES at each stage of Stripe onboarding.
//
// The bug this replaces: the page minted an AccountSession, threw the client
// secret away, and told the artist "you're claimed, your onboarding session is
// ready" — with no form anywhere. `charges_enabled` stayed false, held deposits
// never released, and every one of them auto-refunded after the hold window.
// So the load-bearing assertion in this file is the negative one: the page must
// NOT report readiness on anything short of charges_enabled.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Suspense, type ReactNode } from 'react';

const { getIdTokenMock, loginWithGoogleMock, authStateMock } = vi.hoisted(() => ({
  getIdTokenMock: vi.fn(),
  loginWithGoogleMock: vi.fn(),
  authStateMock: { value: {} as Record<string, unknown> },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authStateMock.value,
}));

// The shell pulls in localStorage-backed stores and next/navigation; the claim
// flow under test doesn't care about any of it.
vi.mock('@/components/studio/StudioShell', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import ClaimArtistPage from './page';

type StatusOverrides = Partial<{
  state: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
  heldDeposit: { count: number; amountCents: number };
  released: { count: number; amountCents: number };
}>;

function statusBody(overrides: StatusOverrides = {}) {
  return {
    state: 'not_started',
    accountId: 'acct_test',
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    requirementsDue: [],
    disabledReason: null,
    artistName: 'Nadia Ink',
    heldDeposit: { count: 1, amountCents: 15_000 },
    released: { count: 0, amountCents: 0 },
    ...overrides,
  };
}

/** Route the page's POSTs to canned responses, keyed by path fragment. */
function stubFetch(handlers: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string) => {
    const key = Object.keys(handlers).find((k) => url.includes(k));
    const body = key ? handlers[key] : {};
    if (body instanceof Error) {
      return { ok: false, status: 502, json: async () => ({ error: body.message }) } as Response;
    }
    return { ok: true, status: 200, json: async () => body } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function defaultHandlers(status: StatusOverrides = {}) {
  return {
    '/connect/claim': {
      claimed: true,
      verificationStatus: 'verified',
      artistId: 'artist_1',
      name: 'Nadia Ink',
      hasConnectedAccount: true,
      chargesEnabled: false,
      pendingDeposit: { count: 1, amountCents: 15_000 },
    },
    '/connect/accounts': { accountId: 'acct_test', created: false, chargesEnabled: false },
    '/connect/status': statusBody(status),
    '/connect/onboarding-link': { url: 'https://connect.stripe.com/setup/e/acct_test/abc' },
  };
}

/**
 * `params` is a promise unwrapped with React's `use()`, which suspends. Next
 * supplies the boundary in production; the test supplies its own and flushes
 * the suspension inside act, otherwise the tree never resumes.
 */
async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <ClaimArtistPage params={Promise.resolve({ artistId: 'artist_1' })} />
      </Suspense>
    );
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getIdTokenMock.mockResolvedValue('id-token');
  authStateMock.value = {
    user: { email: 'nadia@example.com' },
    isAuthenticated: true,
    loading: false,
    loginWithGoogle: loginWithGoogleMock,
    getIdToken: getIdTokenMock,
  };
  window.history.replaceState({}, '', '/claim/artist_1');
});

// One test swaps window.location for a stub to capture the redirect; put the
// real one back so later tests can still read ?onboarding= off the URL.
const REAL_LOCATION = window.location;

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'location', { value: REAL_LOCATION, writable: true, configurable: true });
});

describe('claim page — Stripe onboarding states', () => {
  it('signed out: offers login and never touches the API', async () => {
    authStateMock.value = { ...authStateMock.value, isAuthenticated: false, user: null };
    const fetchMock = stubFetch(defaultHandlers());
    await renderPage();

    expect(await screen.findByRole('button', { name: /log in with google/i })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pending identity review never creates a Connect account or checks payout status', async () => {
    const handlers = defaultHandlers();
    handlers['/connect/claim'] = {
      claimed: false,
      verificationStatus: 'pending_verification',
      requestId: 'CL-1234ABCD',
      artistId: 'artist_1',
      name: 'Nadia Ink',
      instagram: 'nadia.ink',
      verificationCode: 'TATT-ABCD1234',
      nextStep: 'Post the code on @nadia.ink.',
      pendingDeposit: { count: 1, amountCents: 15_000 },
    };
    const fetchMock = stubFetch(handlers);
    await renderPage();

    expect(await screen.findByText(/identity review required/i)).toBeTruthy();
    expect(screen.getByText('TATT-ABCD1234')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/connect/accounts'))).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/connect/status'))).toBe(false);
  });

  it('not yet onboarded: says payouts are OFF and offers the Stripe setup link', async () => {
    stubFetch(defaultHandlers({ state: 'not_started' }));
    await renderPage();

    expect(await screen.findByText(/payouts aren't on yet/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /set up payouts on stripe/i })).toBeTruthy();
    // The old bug's copy — "your onboarding session is ready" — must be gone.
    expect(screen.queryByText(/payouts are live/i)).toBeNull();
  });

  it('sends the artist to Stripe when they start setup', async () => {
    stubFetch(defaultHandlers({ state: 'not_started' }));
    // jsdom refuses real navigation; capture the assignment instead.
    const location = { href: '' };
    Object.defineProperty(window, 'location', { value: location, writable: true });

    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /set up payouts on stripe/i }));

    await waitFor(() =>
      expect(location.href).toBe('https://connect.stripe.com/setup/e/acct_test/abc')
    );
  });

  it('abandoned midway: names what Stripe still needs, in plain English', async () => {
    stubFetch(
      defaultHandlers({
        state: 'requirements_due',
        detailsSubmitted: true,
        requirementsDue: ['individual.verification.document', 'external_account'],
      })
    );
    await renderPage();

    expect(await screen.findByText(/stripe still needs a few things/i)).toBeTruthy();
    expect(screen.getByText(/photo id/i)).toBeTruthy();
    expect(screen.getByText(/bank account for payouts/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /finish setup on stripe/i })).toBeTruthy();
    expect(screen.queryByText(/payouts are live/i)).toBeNull();
  });

  it('returned from Stripe but still under review: does NOT claim success', async () => {
    // The return_url fires whether or not the artist finished. This is the
    // exact shape of the original bug, so it gets its own case.
    window.history.replaceState({}, '', '/claim/artist_1?onboarding=return');
    stubFetch(defaultHandlers({ state: 'pending_verification', detailsSubmitted: true }));
    await renderPage();

    expect(await screen.findByText(/stripe is reviewing you/i)).toBeTruthy();
    expect(screen.queryByText(/payouts are live/i)).toBeNull();
    expect(screen.getByRole('button', { name: /check again/i })).toBeTruthy();
  });

  it('expired setup link: explains the link was single-use instead of failing silently', async () => {
    window.history.replaceState({}, '', '/claim/artist_1?onboarding=refresh');
    stubFetch(defaultHandlers({ state: 'not_started' }));
    await renderPage();

    expect(await screen.findByText(/single-use/i)).toBeTruthy();
  });

  it('fully onboarded: reports payouts live and the released deposit', async () => {
    stubFetch(
      defaultHandlers({
        state: 'enabled',
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        heldDeposit: { count: 0, amountCents: 0 },
        released: { count: 1, amountCents: 15_000 },
      })
    );
    await renderPage();

    expect(await screen.findByText(/payouts are live/i)).toBeTruthy();
    expect(screen.getByText(/deposits released/i)).toBeTruthy();
    expect(screen.getByText('$150.00')).toBeTruthy();
  });

  it('charges on but payouts not yet: says so rather than implying money is moving', async () => {
    stubFetch(
      defaultHandlers({
        state: 'enabled',
        chargesEnabled: true,
        payoutsEnabled: false,
        detailsSubmitted: true,
      })
    );
    await renderPage();

    expect(await screen.findByText(/payouts are live/i)).toBeTruthy();
    expect(screen.getByText(/bank transfers are still switching on/i)).toBeTruthy();
  });

  it('shows the held amount while it is still held', async () => {
    stubFetch(defaultHandlers({ state: 'not_started' }));
    await renderPage();

    expect(await screen.findByText(/held deposit waiting/i)).toBeTruthy();
    expect(screen.getByText('$150.00')).toBeTruthy();
  });

  it('surfaces a failed claim instead of pretending it worked', async () => {
    stubFetch({ ...defaultHandlers(), '/connect/claim': new Error('Artist not found.') });
    await renderPage();

    expect(await screen.findByText(/couldn't claim/i)).toBeTruthy();
    expect(screen.getByText('Artist not found.')).toBeTruthy();
    expect(screen.queryByText(/payouts are live/i)).toBeNull();
  });
});
