// @vitest-environment jsdom
//
// What each kind of visitor SEES at /console.
//
// The route decision under test: /console is the artist home, /dashboard stays
// the consumer redirect. So the page must (a) send non-artists to /claim with
// a clear pointer, never a dead end; (b) show a claimed artist their bookings
// WITH status history (TAT-24's orphaned audit trail), availability link, and
// payout state; (c) never call any API while signed out.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';

const { getIdTokenMock, loginWithGoogleMock, authStateMock } = vi.hoisted(() => ({
  getIdTokenMock: vi.fn(),
  loginWithGoogleMock: vi.fn(),
  authStateMock: { value: {} as Record<string, unknown> },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authStateMock.value,
}));

// The shell pulls in localStorage-backed stores and next/navigation; the
// console flow under test doesn't care about any of it.
vi.mock('@/components/studio/StudioShell', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import ConsolePage from './page';

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

const ARTIST_ME = {
  success: true,
  artist: { id: 'artist_1', name: 'Nadia Ink', hasConnectedAccount: true, chargesEnabled: true },
};

const BOOKINGS = {
  success: true,
  bookings: [
    {
      id: 'BK-1',
      bookingId: 'BK-1',
      clientName: 'Sam C',
      budget: '300-600',
      description: 'Fine line fern on the forearm',
      status: 'deposit_paid',
      createdAt: '2026-07-01T00:00:00.000Z',
      requestedSlots: [{ date: '2026-08-01', time: 'Afternoon' }],
      statusHistory: [
        { status: 'pending', at: '2026-06-30T00:00:00.000Z', by: 'system' },
        { status: 'deposit_paid', at: '2026-07-01T00:00:00.000Z', by: 'stripe-webhook' },
      ],
    },
  ],
};

const PAYOUT_ENABLED = {
  state: 'enabled',
  chargesEnabled: true,
  payoutsEnabled: true,
  heldDeposit: { count: 0, amountCents: 0 },
};

function defaultHandlers(overrides: Record<string, unknown> = {}) {
  return {
    '/artist/me': ARTIST_ME,
    '/artist/bookings': BOOKINGS,
    '/connect/status': PAYOUT_ENABLED,
    '/connect/login-link': { url: 'https://connect.stripe.com/express/login/abc' },
    ...overrides,
  };
}

async function renderPage() {
  await act(async () => {
    render(<ConsolePage />);
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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('console page', () => {
  it('signed out: offers login and never touches the API', async () => {
    authStateMock.value = { ...authStateMock.value, isAuthenticated: false, user: null };
    const fetchMock = stubFetch(defaultHandlers());
    await renderPage();

    expect(await screen.findByRole('button', { name: /log in with google/i })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signed in without a claimed profile: points to /claim, not a dead end', async () => {
    stubFetch(defaultHandlers({ '/artist/me': { success: true, artist: null } }));
    await renderPage();

    const claimLink = await screen.findByRole('link', { name: /claim your profile/i });
    expect(claimLink.getAttribute('href')).toBe('/claim');
  });

  it('claimed artist: shows bookings with status and expandable status history', async () => {
    stubFetch(defaultHandlers());
    await renderPage();

    expect(await screen.findByText('Sam C')).toBeTruthy();
    // Appears as the status pill and again inside the history entry.
    expect(screen.getAllByText(/deposit paid/i).length).toBeGreaterThan(0);

    // The orphaned audit trail (TAT-24), finally on a page.
    const historyToggle = screen.getByText(/status history/i);
    fireEvent.click(historyToggle);
    expect(screen.getByText(/by stripe-webhook/i)).toBeTruthy();
    expect(screen.getByText(/by system/i)).toBeTruthy();
  });

  it('claimed artist: links to the availability editor for the resolved artist', async () => {
    stubFetch(defaultHandlers());
    await renderPage();

    const link = await screen.findByRole('link', { name: /edit availability/i });
    expect(link.getAttribute('href')).toBe('/artist/artist_1/availability');
  });

  it('payouts enabled: offers the Stripe Express dashboard via login-link', async () => {
    const fetchMock = stubFetch(defaultHandlers());
    await renderPage();

    expect(await screen.findByText(/payouts are live/i)).toBeTruthy();
    const manage = screen.getByRole('button', { name: /manage payouts/i });

    // Capture the redirect instead of navigating jsdom.
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
    await act(async () => {
      fireEvent.click(manage);
    });

    const loginLinkCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/connect/login-link'),
    );
    expect(loginLinkCall).toBeTruthy();
    expect(window.location.href).toBe('https://connect.stripe.com/express/login/abc');
  });

  it('payouts not set up: sends the artist to finish setup on the claim page', async () => {
    stubFetch(
      defaultHandlers({
        '/connect/status': { ...PAYOUT_ENABLED, state: 'not_started', chargesEnabled: false },
      }),
    );
    await renderPage();

    const link = await screen.findByRole('link', { name: /finish payout setup/i });
    expect(link.getAttribute('href')).toBe('/claim/artist_1');
    expect(screen.queryByRole('button', { name: /manage payouts/i })).toBeNull();
  });

  it('a bookings failure does not blank the payout panel (and vice versa)', async () => {
    stubFetch(defaultHandlers({ '/artist/bookings': new Error('Booking lookup failed.') }));
    await renderPage();

    expect(await screen.findByText(/payouts are live/i)).toBeTruthy();
    expect(screen.getByText(/booking lookup failed/i)).toBeTruthy();
  });

  it('empty inbox: says so honestly', async () => {
    stubFetch(defaultHandlers({ '/artist/bookings': { success: true, bookings: [] } }));
    await renderPage();

    expect(await screen.findByText(/no booking requests yet/i)).toBeTruthy();
  });
});
