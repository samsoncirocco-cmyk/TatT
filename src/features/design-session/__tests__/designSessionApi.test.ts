// Client-facing error semantics for the design-session API (the half the
// provider-level retry in the generation module cannot cover): what the UI
// receives when /confirm fails, and how it retries.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/client-api-auth', () => ({
  getApiAuthHeaders: vi.fn().mockResolvedValue({}),
}));

import {
  confirmProposal,
  DesignSessionRequestError,
} from '../services/designSessionApi';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const SESSION = { id: 'sess-1', phase: 'revealed' };

/** The route's retryable envelope — 1ms so the test does not actually wait. */
const THROTTLED = {
  error: 'The image provider is busy right now — retrying shortly usually clears it.',
  code: 'GENERATION_UNAVAILABLE',
  retryable: true,
  retryAfterMs: 1,
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('confirmProposal — structured errors', () => {
  it('throws a typed error carrying code, status and retryability', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(409, {
          error: 'wrong phase',
          code: 'INVALID_PHASE',
          retryable: false,
        })
      )
    );

    await expect(confirmProposal('sess-1')).rejects.toBeInstanceOf(
      DesignSessionRequestError
    );

    try {
      await confirmProposal('sess-1');
    } catch (error) {
      const err = error as DesignSessionRequestError;
      expect(err.code).toBe('INVALID_PHASE');
      expect(err.status).toBe(409);
      expect(err.retryable).toBe(false);
      expect(err.message).toBe('wrong phase');
    }
  });

  it('treats a body with no retryable hint as NOT retryable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(500, { error: 'Design session request failed' })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(confirmProposal('sess-1')).rejects.toThrow(
      'Design session request failed'
    );
    // A blind retry can cost paid renders — exactly one attempt.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('confirmProposal — retry semantics', () => {
  it('retries a retryable failure and returns the eventual success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, THROTTLED))
      .mockResolvedValueOnce(jsonResponse(200, { session: SESSION }));
    vi.stubGlobal('fetch', fetchMock);

    const session = await confirmProposal('sess-1');

    expect(session).toEqual(SESSION);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after a bounded number of attempts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(503, THROTTLED));
    vi.stubGlobal('fetch', fetchMock);

    await expect(confirmProposal('sess-1')).rejects.toBeInstanceOf(
      DesignSessionRequestError
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('never retries a non-retryable failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(409, { error: 'wrong phase', code: 'INVALID_PHASE', retryable: false })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(confirmProposal('sess-1')).rejects.toThrow('wrong phase');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
