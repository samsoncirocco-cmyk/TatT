// @vitest-environment jsdom
//
// Every state of the reclaim door, with the failure states treated as the
// product. The attack this door invites is impersonating a removed artist —
// the husk keeps a Stripe account id — so the copy must be plain about what
// is verified (control of the tombstoned Instagram handle) and why (the
// profile binds to an account and can receive money).
//
// What the door deliberately CANNOT show, and instead discloses in copy:
// whether the handle was ever removed (the API answers identically either
// way — the no-enumeration property), whether the husk is already claimed by
// someone else (a human refuses that out of band), and whether the published
// code checked out (a human reads Instagram; code cannot).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { authStateMock, loginWithGoogleMock, getIdTokenMock } = vi.hoisted(() => ({
  authStateMock: { value: {} as Record<string, unknown> },
  loginWithGoogleMock: vi.fn(),
  getIdTokenMock: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authStateMock.value,
}));

import ReinstateDoor from './ReinstateDoor';

function signedOut() {
  authStateMock.value = {
    user: null,
    isAuthenticated: false,
    loading: false,
    loginWithGoogle: loginWithGoogleMock,
    getIdToken: getIdTokenMock,
  };
}

function signedIn(email = 'nadia@example.com') {
  authStateMock.value = {
    user: { uid: 'uid_nadia', email },
    isAuthenticated: true,
    loading: false,
    loginWithGoogle: loginWithGoogleMock,
    getIdToken: getIdTokenMock.mockResolvedValue('firebase-token'),
  };
}

function stubFetch(status: number, body: Record<string, unknown>) {
  const fetchMock = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Open the door and fill the form far enough to submit. */
async function openAndFill() {
  fireEvent.click(screen.getByRole('button', { name: /reclaim/i }));
  fireEvent.change(screen.getByLabelText(/instagram handle/i), {
    target: { value: '@nadia.ink' },
  });
  const email = screen.getByLabelText(/email/i) as HTMLInputElement;
  if (!email.value) fireEvent.change(email, { target: { value: 'nadia@example.com' } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('collapsed state', () => {
  it('starts as one quiet line — no form until asked', () => {
    signedOut();
    render(<ReinstateDoor />);
    expect(screen.getByRole('button', { name: /reclaim/i })).toBeTruthy();
    expect(screen.queryByLabelText(/instagram handle/i)).toBeNull();
  });
});

describe('signed out', () => {
  it('gates the flow behind sign-in and says why the account is required', () => {
    signedOut();
    render(<ReinstateDoor />);
    fireEvent.click(screen.getByRole('button', { name: /reclaim/i }));
    expect(screen.queryByLabelText(/instagram handle/i)).toBeNull();
    const login = screen.getByRole('button', { name: /log in with google/i });
    expect(login).toBeTruthy();
    // The why: the profile binds to the account and can receive money.
    expect(document.body.textContent).toMatch(/bind|belongs to/i);
    fireEvent.click(login);
    expect(loginWithGoogleMock).toHaveBeenCalled();
  });
});

describe('signed in — the form', () => {
  it('shows the form, prefills the reply email, and explains the verification up front', () => {
    signedIn('nadia@example.com');
    render(<ReinstateDoor />);
    fireEvent.click(screen.getByRole('button', { name: /reclaim/i }));
    expect(screen.getByLabelText(/instagram handle/i)).toBeTruthy();
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('nadia@example.com');
    // What is verified and why, stated before anything is sent.
    expect(document.body.textContent).toMatch(/one-time code/i);
    expect(document.body.textContent).toMatch(/instagram/i);
    expect(document.body.textContent).toMatch(/a person/i);
  });

  it('sends the Firebase token as a Bearer header', async () => {
    signedIn();
    const fetchMock = stubFetch(202, {
      received: true,
      reinstated: false,
      requestId: 'RI-AAAA1111',
      verificationCode: 'TATT-ABCD1234',
      expiresInDays: 7,
    });
    render(<ReinstateDoor />);
    await openAndFill();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/artists/reinstate');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer firebase-token');
    const body = JSON.parse(String(init.body));
    expect(body.instagram).toBe('@nadia.ink');
    expect(body.contactEmail).toBe('nadia@example.com');
  });
});

describe('happy path — code issued', () => {
  it('shows the code, where to post it, the expiry, and the reference', async () => {
    signedIn();
    stubFetch(202, {
      received: true,
      reinstated: false,
      requestId: 'RI-AAAA1111',
      verificationCode: 'TATT-ABCD1234',
      expiresInDays: 7,
    });
    render(<ReinstateDoor />);
    await openAndFill();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText('TATT-ABCD1234');
    expect(document.body.textContent).toContain('RI-AAAA1111');
    expect(document.body.textContent).toContain('@nadia.ink');
    expect(document.body.textContent).toMatch(/7 days/);
  });

  it('never claims reinstatement happened — a person decides, nothing is back yet', async () => {
    signedIn();
    stubFetch(202, {
      received: true,
      reinstated: false,
      requestId: 'RI-AAAA1111',
      verificationCode: 'TATT-ABCD1234',
      expiresInDays: 7,
    });
    render(<ReinstateDoor />);
    await openAndFill();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText('TATT-ABCD1234');
    const text = document.body.textContent ?? '';
    // Honest about restoration: the deleted content cannot come back.
    expect(text).toMatch(/nothing .* comes back|empty profile/i);
    // Honest about the states this page refuses to detect:
    expect(text).toMatch(/never removed/i); // handle not on file
    expect(text).toMatch(/already claimed/i); // husk claimed by another account
    expect(text).toMatch(/expires? before/i); // code expiry → resubmit
  });
});

describe('failure states', () => {
  it('400 — shows the validation error and keeps the form editable for a retry', async () => {
    signedIn();
    const fetchMock = stubFetch(400, {
      received: false,
      error: 'instagram does not look like an Instagram handle.',
    });
    render(<ReinstateDoor />);
    await openAndFill();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/does not look like an Instagram handle/i);
    // Not a dead end: the form is still there, fix and resend.
    expect(screen.getByLabelText(/instagram handle/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /send/i })).toBeTruthy();
    // And resubmitting actually fires again.
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('401 — sign-in expired mid-flight gets a re-login path, not jargon', async () => {
    signedIn();
    stubFetch(401, { received: false, error: 'Invalid authorization token.', code: 'AUTH_INVALID' });
    render(<ReinstateDoor />);
    await openAndFill();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findAllByText(/sign.?in expired/i);
    expect(screen.getByRole('button', { name: /log in with google/i })).toBeTruthy();
  });

  it('429 — rate limited points at a human mailbox instead of a wall', async () => {
    signedIn();
    stubFetch(429, {
      received: false,
      error: 'Too many reinstatement requests from this account. Please email us directly.',
      fallbackEmail: 'support@tatttester.com',
    });
    render(<ReinstateDoor />);
    await openAndFill();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/too many reinstatement requests/i);
    const mailto = document.querySelector('a[href="mailto:support@tatttester.com"]');
    expect(mailto).toBeTruthy();
  });

  it('502 — undelivered is said plainly, with the reference to quote by email', async () => {
    signedIn();
    stubFetch(502, {
      received: false,
      reinstated: false,
      requestId: 'RI-BBBB2222',
      error:
        'We could not deliver your request to our team, so we will not pretend it went through.',
      fallbackEmail: 'support@tatttester.com',
    });
    render(<ReinstateDoor />);
    await openAndFill();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/will not pretend it went through/i);
    expect(document.body.textContent).toContain('RI-BBBB2222');
    expect(document.querySelector('a[href="mailto:support@tatttester.com"]')).toBeTruthy();
  });

  it('network failure — no spinner that never resolves; an honest error and a retry', async () => {
    signedIn();
    const fetchMock = vi.fn(async () => {
      throw new Error('Network request failed');
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<ReinstateDoor />);
    await openAndFill();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/network request failed/i);
    expect(screen.queryByText(/sending/i)).toBeNull();
    // Try again returns to the form with what was typed still in place.
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect((screen.getByLabelText(/instagram handle/i) as HTMLInputElement).value).toBe(
      '@nadia.ink',
    );
  });
});
