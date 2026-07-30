/**
 * Vote route tests (TAT-52). The store and rate limiter are mocked at their
 * module boundaries; the assertions pin the contract: a vote is only ever
 * reported as counted when the store actually recorded it, the endpoint
 * accepts exactly three values, and the IP rate limit answers 429 before
 * anything else runs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { rateLimitMock, resolveStoreMock, recordVoteMock } = vi.hoisted(() => ({
  rateLimitMock: vi.fn(),
  resolveStoreMock: vi.fn(),
  recordVoteMock: vi.fn(),
}));

vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rate-limit')>();
  return { ...actual, rateLimit: rateLimitMock };
});
vi.mock('@/lib/shared-design-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/shared-design-store')>();
  return { ...actual, resolveSharedDesignStore: resolveStoreMock };
});

import { POST } from '../[shareId]/vote/route';

const store = {
  save: vi.fn(),
  getAndCountView: vi.fn(),
  get: vi.fn(),
  recordVote: recordVoteMock,
};

const ALLOWED = { allowed: true, limit: 60, remaining: 59, reset: 1_800_000_000 };
const TALLY = { get_it: 7, sleep_on_it: 2, absolutely_not: 1 };

function voteRequest(body: unknown, shareId = 'abc1234567') {
  return {
    request: new NextRequest(`http://localhost/api/v1/designs/share/${shareId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    params: Promise.resolve({ shareId }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue(ALLOWED);
  resolveStoreMock.mockReturnValue(store);
  recordVoteMock.mockResolvedValue(TALLY);
});

describe('POST /api/v1/designs/share/[shareId]/vote', () => {
  it('counts a valid vote and returns the updated tally', async () => {
    const { request, params } = voteRequest({ vote: 'get_it' });
    const res = await POST(request, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, votes: TALLY });
    expect(recordVoteMock).toHaveBeenCalledWith('abc1234567', 'get_it');
  });

  it.each(['sleep_on_it', 'absolutely_not'] as const)('accepts %s', async (vote) => {
    const { request, params } = voteRequest({ vote });
    const res = await POST(request, { params });

    expect(res.status).toBe(200);
    expect(recordVoteMock).toHaveBeenCalledWith('abc1234567', vote);
  });

  it.each([
    ['a value outside the vocabulary', { vote: 'maybe' }],
    ['a missing vote field', {}],
    ['a non-string vote', { vote: 7 }],
  ])('rejects %s with 400 and never touches the store', async (_name, body) => {
    const { request, params } = voteRequest(body);
    const res = await POST(request, { params });

    expect(res.status).toBe(400);
    expect(recordVoteMock).not.toHaveBeenCalled();
  });

  it('rejects a non-JSON body with 400', async () => {
    const request = new NextRequest('http://localhost/api/v1/designs/share/abc/vote', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(request, { params: Promise.resolve({ shareId: 'abc' }) });
    expect(res.status).toBe(400);
    expect(recordVoteMock).not.toHaveBeenCalled();
  });

  it('answers 429 with Retry-After when the IP is over the limit — before any store work', async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, limit: 60, remaining: 0, reset: 1_800_000_000 });

    const { request, params } = voteRequest({ vote: 'get_it' });
    const res = await POST(request, { params });

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(resolveStoreMock).not.toHaveBeenCalled();
    expect(recordVoteMock).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown shareId', async () => {
    recordVoteMock.mockResolvedValue(null);

    const { request, params } = voteRequest({ vote: 'get_it' }, 'missing');
    const res = await POST(request, { params });

    expect(res.status).toBe(404);
  });

  it('degrades honestly to 503 when no durable store is configured', async () => {
    // A vote counted in one serverless instance's memory was never counted.
    resolveStoreMock.mockReturnValue(null);

    const { request, params } = voteRequest({ vote: 'get_it' });
    const res = await POST(request, { params });
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.code).toBe('SHARE_VOTES_UNAVAILABLE');
  });

  it('returns 503 — not a fake success — when the store write throws', async () => {
    recordVoteMock.mockRejectedValue(new Error('firestore down'));

    const { request, params } = voteRequest({ vote: 'get_it' });
    const res = await POST(request, { params });
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.code).toBe('SHARE_VOTES_UNAVAILABLE');
  });
});
