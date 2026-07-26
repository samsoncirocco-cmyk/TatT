// POST /api/v1/artists/takedown — the public "this is my work, take it down" path.
//
// Two properties matter more than the happy path:
//
//  1. It is PUBLIC. An artist who never opted into being scraped must not have
//     to create a TatT account before they can ask TatT to stop using their
//     photographs. Requiring auth here would be backwards.
//
//  2. It NEVER reports success unless a human was actually reached. A takedown
//     request that silently fails is worse than no takedown button, because the
//     artist walks away believing it was received. See docs/adr/0024.
//
// It also, by construction, removes nothing — it records and notifies.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { notifyOpsOfTakedownRequestMock, recordTakedownRequestMock, verifyApiAuthMock } = vi.hoisted(
  () => ({
    notifyOpsOfTakedownRequestMock: vi.fn(),
    recordTakedownRequestMock: vi.fn(),
    verifyApiAuthMock: vi.fn(),
  }),
);

vi.mock('@/lib/notify', () => ({ notifyOpsOfTakedownRequest: notifyOpsOfTakedownRequestMock }));
vi.mock('@/lib/takedown-graph', () => ({ recordTakedownRequest: recordTakedownRequestMock }));
vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));

import { POST } from './route';

const GOOD_BODY = {
  artistId: 'artist_tattoosbyging',
  contactEmail: 'ging@example.com',
  relationship: 'artist',
  scope: 'all',
  message: 'These are my photos, please remove them.',
};

let ipCounter = 0;
function makeRequest(body: unknown, ip?: string) {
  // Each test gets a distinct IP so the rate limiter (module-level state)
  // doesn't leak between cases.
  const forwarded = ip ?? `10.0.0.${++ipCounter}`;
  return new NextRequest('http://localhost/api/v1/artists/takedown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': forwarded },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  notifyOpsOfTakedownRequestMock.mockResolvedValue({ delivered: true });
  recordTakedownRequestMock.mockResolvedValue(true);
});

describe('POST /api/v1/artists/takedown — access', () => {
  it('does not require an account — a scraped artist has no TatT login', async () => {
    const response = await POST(makeRequest(GOOD_BODY));

    expect(response.status).toBe(202);
    expect(verifyApiAuthMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/artists/takedown — happy path', () => {
  it('accepts the request, notifies ops, and returns a request id', async () => {
    const response = await POST(makeRequest(GOOD_BODY));
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.received).toBe(true);
    expect(data.requestId).toMatch(/^TD-[A-Z0-9]{8}$/);
    expect(notifyOpsOfTakedownRequestMock).toHaveBeenCalledTimes(1);
    expect(notifyOpsOfTakedownRequestMock.mock.calls[0][0]).toMatchObject({
      artistId: 'artist_tattoosbyging',
      contactEmail: 'ging@example.com',
      scope: 'all',
    });
  });

  it('states plainly that nothing has been removed yet', async () => {
    const response = await POST(makeRequest(GOOD_BODY));
    const data = await response.json();

    // The artist must not believe their work is already gone.
    expect(data.removed).toBe(false);
    expect(String(data.status)).toMatch(/review/i);
  });

  it('records the request to the graph before notifying, so a failed email still leaves a trace', async () => {
    const order: string[] = [];
    recordTakedownRequestMock.mockImplementation(async () => {
      order.push('record');
      return true;
    });
    notifyOpsOfTakedownRequestMock.mockImplementation(async () => {
      order.push('notify');
      return { delivered: true };
    });

    await POST(makeRequest(GOOD_BODY));

    expect(order).toEqual(['record', 'notify']);
  });

  it('passes the same request id to both the graph record and the notification', async () => {
    const response = await POST(makeRequest(GOOD_BODY));
    const { requestId } = await response.json();

    expect(recordTakedownRequestMock.mock.calls[0][1]).toBe(requestId);
    expect(notifyOpsOfTakedownRequestMock.mock.calls[0][1]).toBe(requestId);
  });
});

describe('POST /api/v1/artists/takedown — honest degradation', () => {
  it('reports FAILURE when ops could not be notified — never a silent success', async () => {
    notifyOpsOfTakedownRequestMock.mockResolvedValue({
      delivered: false,
      reason: 'OPS_NOTIFY_EMAIL is not configured',
    });

    const response = await POST(makeRequest(GOOD_BODY));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.received).toBe(false);
    // The artist needs somewhere else to go, not a dead end.
    expect(data.error).toMatch(/could not|not.*deliver|failed/i);
    expect(data.fallbackEmail).toBeTruthy();
  });

  it('reports FAILURE when the notification path throws outright', async () => {
    notifyOpsOfTakedownRequestMock.mockRejectedValue(new Error('boom'));

    const response = await POST(makeRequest(GOOD_BODY));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.received).toBe(false);
  });

  it('still succeeds when the graph record fails, but says so rather than claiming it logged', async () => {
    // The email carries the whole request, so a human is still reached. That is
    // the contract — but we must not claim a durable record we do not have.
    recordTakedownRequestMock.mockResolvedValue(false);

    const response = await POST(makeRequest(GOOD_BODY));
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.received).toBe(true);
    expect(data.logged).toBe(false);
  });

  it('does not let a throwing graph record block the notification', async () => {
    recordTakedownRequestMock.mockRejectedValue(new Error('neo4j down'));

    const response = await POST(makeRequest(GOOD_BODY));
    const data = await response.json();

    expect(notifyOpsOfTakedownRequestMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(202);
    expect(data.logged).toBe(false);
  });
});

describe('POST /api/v1/artists/takedown — validation', () => {
  it.each([
    ['missing artistId', { ...GOOD_BODY, artistId: undefined }],
    ['bad email', { ...GOOD_BODY, contactEmail: 'nope' }],
    ['unknown relationship', { ...GOOD_BODY, relationship: 'wizard' }],
  ])('rejects %s with 400 and notifies nobody', async (_label, body) => {
    const response = await POST(makeRequest(body));

    expect(response.status).toBe(400);
    expect(notifyOpsOfTakedownRequestMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed JSON body with 400', async () => {
    const response = await POST(makeRequest('{not json'));

    expect(response.status).toBe(400);
    expect(notifyOpsOfTakedownRequestMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/artists/takedown — abuse control', () => {
  it('rate-limits a single IP, since the route is unauthenticated', async () => {
    const ip = '203.0.113.99';
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await POST(makeRequest(GOOD_BODY, ip));
      statuses.push(res.status);
    }

    expect(statuses).toContain(429);
    // A rate limit must not be so tight it blocks a genuine first request.
    expect(statuses[0]).toBe(202);
  });
});
