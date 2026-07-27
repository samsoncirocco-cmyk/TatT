// Money-movement tests for held-deposit release and refund.
//
// booking-relay.test.ts covers the pure helpers. This file covers the two
// functions that actually move money — transferHeldDeposits and refundRelay —
// with Stripe and Neo4j faked. The failures these guard against are expensive
// and silent: paying an artist the wrong amount, paying them twice, paying an
// artist who can't receive funds, or refunding a deposit that was already
// released.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { transfersCreate, refundsCreate, getArtistStripeMock, readMock } = vi.hoisted(() => ({
  transfersCreate: vi.fn(),
  refundsCreate: vi.fn(),
  getArtistStripeMock: vi.fn(),
  readMock: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    transfers: { create: transfersCreate },
    refunds: { create: refundsCreate },
  },
  CURRENCY: 'usd',
}));

vi.mock('@/lib/artist-stripe', () => ({
  getArtistStripe: getArtistStripeMock,
}));

vi.mock('@/features/match-pulse/services/neo4jService', () => ({
  executeServerCypherQuery: readMock,
}));

/** Every cypher WRITE the module issued, in order. */
const writes: Array<{ query: string; params: Record<string, unknown> }> = [];

vi.mock('@/lib/neo4j', () => ({
  getNeo4jDriver: () => ({
    session: () => ({
      executeWrite: async (
        fn: (tx: { run: (q: string, p: Record<string, unknown>) => Promise<unknown> }) => Promise<unknown>
      ) =>
        fn({
          run: async (query: string, params: Record<string, unknown>) => {
            writes.push({ query, params });
            return { records: [] };
          },
        }),
      close: async () => {},
    }),
  }),
  NEO4J_DATABASE: '',
  NEO4J_QUERY_TIMEOUT: 5000,
}));

import { transferHeldDeposits, refundRelay } from './booking-relay';

/** Row shape returned by the relay read queries. */
function relayRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pi_held_1',
    artistId: 'artist_1',
    customerEmail: 'client@example.com',
    // $150 deposit. The client also paid a $15 fee, which is NOT recorded here.
    amountCents: 15_000,
    chargeId: 'ch_held_1',
    paymentIntentId: 'pi_held_1',
    status: 'pending',
    expiresAtEpoch: 1_700_600_000,
    createdAtEpoch: 1_700_000_000,
    ...over,
  };
}

/** The status a given setRelayStatus write assigned. */
function statusWrites(): string[] {
  return writes.filter((w) => w.query.includes('SET r.status')).map((w) => String(w.params.status));
}

beforeEach(() => {
  vi.clearAllMocks();
  writes.length = 0;
  transfersCreate.mockResolvedValue({ id: 'tr_1' });
  refundsCreate.mockResolvedValue({ id: 're_1' });
});

describe('transferHeldDeposits — releasing a held deposit', () => {
  const onboardedArtist = {
    id: 'artist_1',
    name: 'Nadia Ink',
    email: null,
    stripeAccountId: 'acct_artist_1',
    chargesEnabled: true,
    claimVerified: true,
  };

  it('ADR-0007: transfers the FULL deposit, with no fee deducted', async () => {
    getArtistStripeMock.mockResolvedValue(onboardedArtist);
    readMock.mockResolvedValue([relayRow()]);

    const result = await transferHeldDeposits('artist_1');

    expect(transfersCreate).toHaveBeenCalledTimes(1);
    const [params] = transfersCreate.mock.calls[0];
    expect(params.amount).toBe(15_000);
    // The inverted model (deposit − 10%) would transfer 13500. It must not.
    expect(params.amount).not.toBe(13_500);
    expect(result).toEqual({ count: 1, totalTransferredCents: 15_000 });
  });

  it('draws from the held charge, not platform float, and keys the transfer idempotently', async () => {
    getArtistStripeMock.mockResolvedValue(onboardedArtist);
    readMock.mockResolvedValue([relayRow()]);

    await transferHeldDeposits('artist_1');

    const [params, options] = transfersCreate.mock.calls[0];
    expect(params.destination).toBe('acct_artist_1');
    expect(params.currency).toBe('usd');
    // source_transaction ties the payout to the original charge.
    expect(params.source_transaction).toBe('ch_held_1');
    // One transfer per relay, forever — Stripe dedupes a retried call.
    expect(options).toEqual({ idempotencyKey: 'relay-transfer-pi_held_1' });
  });

  it('flips the relay to accepted so it can never be selected again', async () => {
    getArtistStripeMock.mockResolvedValue(onboardedArtist);
    readMock.mockResolvedValue([relayRow()]);

    await transferHeldDeposits('artist_1');

    expect(statusWrites()).toEqual(['accepted']);
  });

  it('DOUBLE-TRANSFER GUARD: a second release for the same artist pays nothing', async () => {
    getArtistStripeMock.mockResolvedValue(onboardedArtist);
    // First call sees the pending relay; afterwards it is 'accepted', so the
    // pending query returns nothing. Both webhook (account.updated) and
    // claim-complete can fire — the second must be a no-op.
    readMock.mockResolvedValueOnce([relayRow()]).mockResolvedValue([]);

    const first = await transferHeldDeposits('artist_1');
    const second = await transferHeldDeposits('artist_1');

    expect(first.count).toBe(1);
    expect(second).toEqual({ count: 0, totalTransferredCents: 0 });
    expect(transfersCreate).toHaveBeenCalledTimes(1);
  });

  it('pays every pending relay and reports the total', async () => {
    getArtistStripeMock.mockResolvedValue(onboardedArtist);
    readMock.mockResolvedValue([
      relayRow(),
      relayRow({ id: 'pi_held_2', chargeId: 'ch_held_2', paymentIntentId: 'pi_held_2', amountCents: 7_500 }),
    ]);

    const result = await transferHeldDeposits('artist_1');

    expect(result).toEqual({ count: 2, totalTransferredCents: 22_500 });
    expect(transfersCreate.mock.calls.map(([p]) => p.amount)).toEqual([15_000, 7_500]);
    expect(transfersCreate.mock.calls.map(([, o]) => o.idempotencyKey)).toEqual([
      'relay-transfer-pi_held_1',
      'relay-transfer-pi_held_2',
    ]);
  });

  it('refuses to pay an artist whose charges are not enabled', async () => {
    getArtistStripeMock.mockResolvedValue({ ...onboardedArtist, chargesEnabled: false });

    const result = await transferHeldDeposits('artist_1');

    expect(result).toEqual({ count: 0, totalTransferredCents: 0 });
    expect(transfersCreate).not.toHaveBeenCalled();
    expect(statusWrites()).toEqual([]);
  });

  it('refuses to pay a first-finder claim that was never identity-verified', async () => {
    getArtistStripeMock.mockResolvedValue({ ...onboardedArtist, claimVerified: false });
    readMock.mockResolvedValue([relayRow()]);

    expect(await transferHeldDeposits('artist_1')).toEqual({
      count: 0,
      totalTransferredCents: 0,
    });
    expect(transfersCreate).not.toHaveBeenCalled();
    expect(statusWrites()).toEqual([]);
  });

  it('refuses to pay an artist with no connected account', async () => {
    getArtistStripeMock.mockResolvedValue({ ...onboardedArtist, stripeAccountId: null });

    expect(await transferHeldDeposits('artist_1')).toEqual({ count: 0, totalTransferredCents: 0 });
    expect(transfersCreate).not.toHaveBeenCalled();
  });

  it('is a no-op for an unknown artist', async () => {
    getArtistStripeMock.mockResolvedValue(null);

    expect(await transferHeldDeposits('nope')).toEqual({ count: 0, totalTransferredCents: 0 });
    expect(transfersCreate).not.toHaveBeenCalled();
  });

  it('skips a zero-amount relay rather than calling Stripe with amount 0', async () => {
    getArtistStripeMock.mockResolvedValue(onboardedArtist);
    readMock.mockResolvedValue([relayRow({ amountCents: 0 })]);

    expect(await transferHeldDeposits('artist_1')).toEqual({ count: 0, totalTransferredCents: 0 });
    expect(transfersCreate).not.toHaveBeenCalled();
  });
});

describe('refundRelay — closing an expired hold', () => {
  it('refunds the PaymentIntent in full (no amount → deposit + fee back)', async () => {
    readMock.mockResolvedValue([relayRow()]);

    await refundRelay('pi_held_1');

    expect(refundsCreate).toHaveBeenCalledTimes(1);
    const [params, options] = refundsCreate.mock.calls[0];
    expect(params).toEqual({ payment_intent: 'pi_held_1' });
    // No `amount` key at all — a partial refund would shortchange the customer.
    expect(params.amount).toBeUndefined();
    expect(options).toEqual({ idempotencyKey: 'relay-refund-pi_held_1' });
  });

  it('marks the relay refunded', async () => {
    readMock.mockResolvedValue([relayRow()]);

    await refundRelay('pi_held_1');

    expect(statusWrites()).toEqual(['refunded']);
  });

  it('DOUBLE-SPEND GUARD: never refunds a relay that was already released to the artist', async () => {
    readMock.mockResolvedValue([relayRow({ status: 'accepted' })]);

    await refundRelay('pi_held_1');

    expect(refundsCreate).not.toHaveBeenCalled();
    expect(statusWrites()).toEqual([]);
  });

  it('is idempotent — a re-run against an already-refunded relay does nothing', async () => {
    readMock.mockResolvedValue([relayRow({ status: 'refunded' })]);

    await refundRelay('pi_held_1');

    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it('is a no-op for an unknown relay id', async () => {
    readMock.mockResolvedValue([]);

    await refundRelay('pi_missing');

    expect(refundsCreate).not.toHaveBeenCalled();
  });
});
