// Guard + batch tests for the held-deposit expiry cron.
//
// This route is the ONLY automatic closer of held deposits (ADR-0006) and it is
// unauthenticated apart from a shared secret. Two things must hold: nobody
// without CRON_SECRET can trigger refunds, and one failing refund must not
// abandon the rest of the batch.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listExpiredPendingMock, refundRelayMock } = vi.hoisted(() => ({
  listExpiredPendingMock: vi.fn(),
  refundRelayMock: vi.fn(),
}));

vi.mock('@/lib/booking-relay', () => ({
  listExpiredPending: listExpiredPendingMock,
  refundRelay: refundRelayMock,
}));

import { GET, POST } from './route';

const SECRET = 'cron-secret-value';

function makeRequest(authorization?: string) {
  return new Request('http://localhost/api/cron/expire-deposits', {
    method: 'POST',
    headers: authorization ? { authorization } : {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

function relay(id: string) {
  return {
    id,
    artistId: 'artist_1',
    customerEmail: 'client@example.com',
    amountCents: 15_000,
    chargeId: `ch_${id}`,
    paymentIntentId: id,
    status: 'pending' as const,
    expiresAtEpoch: 1,
    createdAtEpoch: 0,
  };
}

const originalSecret = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  listExpiredPendingMock.mockResolvedValue([]);
  refundRelayMock.mockResolvedValue(undefined);
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe('cron/expire-deposits — authorization', () => {
  it('401s with no Authorization header', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(listExpiredPendingMock).not.toHaveBeenCalled();
  });

  it('401s on a wrong secret', async () => {
    const res = await POST(makeRequest('Bearer not-the-secret'));
    expect(res.status).toBe(401);
    expect(refundRelayMock).not.toHaveBeenCalled();
  });

  it('401s on a right-length-but-wrong secret (constant-time compare still rejects)', async () => {
    const wrong = 'x'.repeat(SECRET.length);
    const res = await POST(makeRequest(`Bearer ${wrong}`));
    expect(res.status).toBe(401);
  });

  it('401s on the raw secret without the Bearer scheme', async () => {
    const res = await POST(makeRequest(SECRET));
    expect(res.status).toBe(401);
  });

  it('FAILS CLOSED: 401s when CRON_SECRET is unset, even with a Bearer header', async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeRequest('Bearer anything'));
    expect(res.status).toBe(401);
    expect(listExpiredPendingMock).not.toHaveBeenCalled();
  });

  it('accepts the correct bearer token', async () => {
    const res = await POST(makeRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(listExpiredPendingMock).toHaveBeenCalledTimes(1);
  });

  it('accepts GET too — Vercel cron issues GET', async () => {
    const req = new Request('http://localhost/api/cron/expire-deposits', {
      method: 'GET',
      headers: { authorization: `Bearer ${SECRET}` },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(listExpiredPendingMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an unauthorized GET as well', async () => {
    const req = new Request('http://localhost/api/cron/expire-deposits', {
      method: 'GET',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    expect((await GET(req)).status).toBe(401);
  });
});

describe('cron/expire-deposits — refund batch', () => {
  it('refunds every expired hold and reports the count', async () => {
    listExpiredPendingMock.mockResolvedValue([relay('pi_1'), relay('pi_2'), relay('pi_3')]);

    const res = await POST(makeRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ refunded: 3 });
    expect(refundRelayMock.mock.calls.map(([id]) => id)).toEqual(['pi_1', 'pi_2', 'pi_3']);
  });

  it('queries expiry against the current time in SECONDS, not milliseconds', async () => {
    const before = Math.floor(Date.now() / 1000);
    await POST(makeRequest(`Bearer ${SECRET}`));
    const [nowEpoch] = listExpiredPendingMock.mock.calls[0];

    // A ms/s mix-up here would expire every hold immediately.
    expect(nowEpoch).toBeGreaterThanOrEqual(before);
    expect(nowEpoch).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 1);
  });

  it('keeps going when one refund throws, and does not count the failure', async () => {
    listExpiredPendingMock.mockResolvedValue([relay('pi_1'), relay('pi_2'), relay('pi_3')]);
    refundRelayMock.mockResolvedValueOnce(undefined);
    refundRelayMock.mockRejectedValueOnce(new Error('Stripe down'));
    refundRelayMock.mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    // The third relay was still attempted — a stuck hold must not block the rest.
    expect(refundRelayMock).toHaveBeenCalledTimes(3);
    expect(await res.json()).toEqual({ refunded: 2 });
  });

  it('reports zero when nothing has expired', async () => {
    const res = await POST(makeRequest(`Bearer ${SECRET}`));
    expect(await res.json()).toEqual({ refunded: 0 });
    expect(refundRelayMock).not.toHaveBeenCalled();
  });
});
