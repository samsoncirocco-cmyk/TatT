// POST /api/v1/artists/reinstate — the request half of the one door through
// the takedown wall. See docs/adr/0026.
//
// The properties under test are all about what this route CANNOT do. It is the
// publicly reachable half of an operation that ends in someone owning a profile
// that can receive real money, so it must be inert, must not leak, and must not
// claim success it did not achieve.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyApiAuthMock, verifyFirebaseTokenMock, recordMock, notifyMock } = vi.hoisted(() => ({
  verifyApiAuthMock: vi.fn(),
  verifyFirebaseTokenMock: vi.fn(),
  recordMock: vi.fn(),
  notifyMock: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/auth-dal', () => ({ verifyFirebaseToken: verifyFirebaseTokenMock }));
vi.mock('@/lib/reinstatement-graph', () => ({ recordReinstatementRequest: recordMock }));
vi.mock('@/lib/notify', () => ({ notifyOpsOfReinstatementRequest: notifyMock }));

import { POST } from './route';

/** A fresh uid per call so the per-uid rate limiter never bleeds across tests. */
let uidSeq = 0;
function nextUid() {
  return `uid_${++uidSeq}`;
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/artists/reinstate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  });
}

const goodBody = { instagram: '@tattoosbyging', contactEmail: 'ging@example.com' };

beforeEach(() => {
  vi.clearAllMocks();
  verifyApiAuthMock.mockResolvedValue(null);
  verifyFirebaseTokenMock.mockResolvedValue({ uid: nextUid() });
  recordMock.mockResolvedValue(true);
  notifyMock.mockResolvedValue({ delivered: true });
});

describe('authentication', () => {
  it('REFUSES an anonymous caller', async () => {
    // Deliberately the opposite of the takedown route, which requires nothing.
    verifyFirebaseTokenMock.mockResolvedValue(null);

    const res = await POST(makeRequest(goodBody));

    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('AUTH_REQUIRED');
    expect(recordMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('binds the request to the verified uid, ignoring any uid in the body', async () => {
    verifyFirebaseTokenMock.mockResolvedValue({ uid: 'uid_real' });

    await POST(makeRequest({ ...goodBody, uid: 'uid_attacker' }));

    expect(recordMock.mock.calls[0][0]).toMatchObject({ uid: 'uid_real' });
  });
});

describe('the route changes nothing', () => {
  it('only records a request and notifies — no unsuppression, no binding', async () => {
    const res = await POST(makeRequest(goodBody));
    const json = await res.json();

    expect(res.status).toBe(202);
    // Said out loud to the artist: this is not an undo button.
    expect(json.reinstated).toBe(false);
    expect(json.status).toMatch(/awaiting review by a person/i);
    expect(recordMock).toHaveBeenCalledTimes(1);
  });

  it('tells the artist plainly that nothing deleted comes back', async () => {
    const json = await (await POST(makeRequest(goodBody))).json();

    expect(json.restores).toMatch(/nothing that was deleted comes back/i);
    // And that the scrape block is permanent regardless of the outcome.
    expect(json.restores).toMatch(/permanently blocked/i);
  });
});

describe('verification code', () => {
  it('issues an unpredictable, publishable code and tells them where to put it', async () => {
    const json = await (await POST(makeRequest(goodBody))).json();

    expect(json.verificationCode).toMatch(/^TATT-[0-9A-F]{8}$/);
    expect(json.nextStep).toMatch(/@tattoosbyging/);
  });

  it('issues a different code on every request', async () => {
    const a = await (await POST(makeRequest(goodBody))).json();
    verifyFirebaseTokenMock.mockResolvedValue({ uid: nextUid() });
    const b = await (await POST(makeRequest(goodBody))).json();

    expect(a.verificationCode).not.toBe(b.verificationCode);
  });

  it('hands the same code to ops that it gave the artist', async () => {
    const json = await (await POST(makeRequest(goodBody))).json();

    expect(notifyMock.mock.calls[0][2]).toBe(json.verificationCode);
  });
});

describe('does not leak who has been taken down', () => {
  it('answers identically for a handle with no tombstone', async () => {
    // The route never looks a tombstone up, so it cannot be an oracle for
    // "who exercised a removal right?". Only the operator's dry run knows.
    const res = await POST(makeRequest({ ...goodBody, instagram: 'never_removed_at_all' }));
    const json = await res.json();

    expect(res.status).toBe(202);
    expect(json.received).toBe(true);
    expect(json.verificationCode).toMatch(/^TATT-/);
  });
});

describe('honest degradation', () => {
  it('returns 502 rather than a false confirmation when ops cannot be reached', async () => {
    // An artist told "we got it" who is then never reviewed is worse off than
    // one who is told to email us.
    notifyMock.mockResolvedValue({ delivered: false, reason: 'smtp down' });

    const res = await POST(makeRequest(goodBody));
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.received).toBe(false);
    expect(json.requestId).toMatch(/^RI-/);
    expect(json.fallbackEmail).toBeTruthy();
  });

  it('treats a thrown notifier as undelivered, not as success', async () => {
    notifyMock.mockRejectedValue(new Error('boom'));

    expect((await POST(makeRequest(goodBody))).status).toBe(502);
  });

  it('reports the graph write truthfully rather than assuming it', async () => {
    recordMock.mockResolvedValue(false);

    const json = await (await POST(makeRequest(goodBody))).json();

    expect(json.logged).toBe(false);
    // A graph failure must not block the notification — the email is the
    // contract, and it carries the whole payload.
    expect(notifyMock).toHaveBeenCalled();
  });

  it('still notifies when the graph write throws', async () => {
    recordMock.mockRejectedValue(new Error('neo4j down'));

    const res = await POST(makeRequest(goodBody));

    expect(res.status).toBe(202);
    expect(notifyMock).toHaveBeenCalled();
  });
});

describe('validation', () => {
  it.each([
    ['a missing handle', { contactEmail: 'a@b.co' }],
    ['a malformed handle', { ...goodBody, instagram: 'not a handle!' }],
    ['a missing email', { instagram: 'ging' }],
  ])('rejects %s without notifying anyone', async (_label, body) => {
    const res = await POST(makeRequest(body));

    expect(res.status).toBe(400);
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed body', async () => {
    const req = new NextRequest('http://localhost/api/v1/artists/reinstate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' },
      body: 'not json',
    });

    expect((await POST(req)).status).toBe(400);
  });
});

describe('rate limiting', () => {
  it('bounds requests per account', async () => {
    // Keyed on the uid, not the IP: this route requires an account, so the
    // account is the meaningful unit of abuse.
    verifyFirebaseTokenMock.mockResolvedValue({ uid: 'uid_flooder' });

    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await POST(makeRequest(goodBody))).status);
    }

    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});
