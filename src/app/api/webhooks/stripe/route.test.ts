// Seam tests for the Stripe webhook's booking reconciliation (Tasks 1.3/1.9).
//
// Stripe, firebase-admin, and the relay/notify side-modules are all mocked so
// these tests exercise ONLY the reconciliation logic: on a
// `checkout.session.completed` event whose metadata carries a bookingId, the
// booking_requests doc moves pending → deposit_paid; a replay of the same event
// id is a no-op (idempotency).
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── firebase-admin/firestore fake ──────────────────────────────────────────
// A tiny in-memory doc store that supports the exact surface the route uses:
// collection().doc(), runTransaction(tx => …), tx.get()/tx.set({merge}), and
// FieldValue.arrayUnion (applied at set time).
const ARRAY_UNION = Symbol('arrayUnion');

type DocStore = Map<string, Record<string, unknown>>;
const docStore: DocStore = new Map();

function makeRef(id: string) {
  return {
    id,
    async get() {
      const data = docStore.get(id);
      return {
        exists: data !== undefined,
        data: () => data,
      };
    },
    set(patch: Record<string, unknown>, options?: { merge?: boolean }) {
      const prev = options?.merge ? docStore.get(id) ?? {} : {};
      const next: Record<string, unknown> = { ...prev };
      for (const [k, v] of Object.entries(patch)) {
        if (v && typeof v === 'object' && (v as { __op?: symbol }).__op === ARRAY_UNION) {
          const existing = Array.isArray(next[k]) ? (next[k] as unknown[]) : [];
          const additions = (v as { values: unknown[] }).values.filter((x) => !existing.includes(x));
          next[k] = [...existing, ...additions];
        } else {
          next[k] = v;
        }
      }
      docStore.set(id, next);
    },
  };
}

const fakeDb = {
  collection: (_name: string) => ({
    doc: (id: string) => makeRef(id),
  }),
  async runTransaction(fn: (tx: unknown) => Promise<void>) {
    // Single-writer webhook: run the callback with a tx that proxies the ref's
    // own get/set (good enough for the reconciliation's read-then-write).
    const tx = {
      get: (ref: ReturnType<typeof makeRef>) => ref.get(),
      set: (ref: ReturnType<typeof makeRef>, patch: Record<string, unknown>, options?: { merge?: boolean }) =>
        ref.set(patch, options),
    };
    await fn(tx);
  },
};

const FieldValue = {
  arrayUnion: (...values: unknown[]) => ({ __op: ARRAY_UNION, values }),
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => fakeDb,
  FieldValue,
}));

vi.mock('@/lib/firebase-admin', () => ({
  ensureAdminApp: () => 'sa-json',
}));

// ── Stripe fake ─────────────────────────────────────────────────────────────
// constructEvent returns whatever event we stashed; the payment-intent retrieve
// is only touched by the held-deposit relay path (unused here) but stubbed safe.
const { constructEventMock, retrievePiMock, createRelayMock, notifyArtistMock } = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  retrievePiMock: vi.fn(),
  createRelayMock: vi.fn().mockResolvedValue(undefined),
  notifyArtistMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: constructEventMock },
    paymentIntents: { retrieve: retrievePiMock },
  },
}));

// ── Side-modules stubbed so unrelated paths never explode ───────────────────
vi.mock('@/lib/booking-relay', () => ({
  createRelay: createRelayMock,
  transferHeldDeposits: vi.fn().mockResolvedValue({ count: 0 }),
  setArtistSubscription: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/artist-stripe', () => ({
  setArtistChargesEnabled: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/notify', () => ({
  notifyArtistOfBooking: notifyArtistMock,
}));

import { POST } from './route';

const CREATED_EPOCH = 1_700_000_000; // fixed → deterministic paidAt
const CREATED_ISO = new Date(CREATED_EPOCH * 1000).toISOString();

function makeEvent(id: string) {
  return {
    id,
    type: 'checkout.session.completed',
    created: CREATED_EPOCH,
    data: {
      object: {
        id: 'cs_test_123',
        mode: 'payment',
        payment_status: 'paid',
        amount_total: 8250,
        payment_intent: 'pi_test_abc',
        customer_details: { email: 'client@example.com' },
        metadata: {
          bookingId: 'BK-TEST01',
          // 'routed' (not 'held') → the relay branch is skipped.
          depositState: 'routed',
          // Deposit in DOLLARS (75). amount_total (8250 cents) is deposit + fee.
          depositAmount: '75',
        },
      },
    },
  };
}

function makeRequest(event: unknown) {
  const body = JSON.stringify(event);
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 't=1,v1=deadbeef' },
    body,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

describe('Stripe webhook — booking reconciliation (Task 1.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    docStore.clear();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';
    // Seed a captured, unpaid booking.
    docStore.set('BK-TEST01', {
      bookingId: 'BK-TEST01',
      status: 'pending',
      clientEmail: 'client@example.com',
    });
  });

  it('transitions pending → deposit_paid and stamps Stripe fields', async () => {
    const event = makeEvent('evt_1');
    constructEventMock.mockReturnValueOnce(event);

    const res = await POST(makeRequest(event));
    expect(res.status).toBe(200);

    const doc = docStore.get('BK-TEST01')!;
    expect(doc.status).toBe('deposit_paid');
    expect(doc.stripeSessionId).toBe('cs_test_123');
    expect(doc.stripePaymentIntent).toBe('pi_test_abc');
    expect(doc.depositAmount).toBe(75); // dollars — the deposit, not the cents total
    expect(doc.amountPaidCents).toBe(8250); // full charged total (deposit + fee), cents
    expect(doc.paidAt).toBe(CREATED_ISO);
    expect(doc.processedStripeEvents).toEqual(['evt_1']);

    const history = doc.statusHistory as Array<Record<string, unknown>>;
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual({ status: 'deposit_paid', at: CREATED_ISO, by: 'stripe-webhook' });
  });

  it('is idempotent: replaying the same event id is a no-op', async () => {
    const event = makeEvent('evt_1');
    constructEventMock.mockReturnValue(event);

    // First delivery.
    await POST(makeRequest(event));
    const afterFirst = docStore.get('BK-TEST01')!;
    expect((afterFirst.statusHistory as unknown[]).length).toBe(1);

    // Stripe retries the SAME event id.
    const res = await POST(makeRequest(event));
    expect(res.status).toBe(200);

    const afterReplay = docStore.get('BK-TEST01')!;
    // No double-append, still exactly one processed id.
    expect((afterReplay.statusHistory as unknown[]).length).toBe(1);
    expect(afterReplay.processedStripeEvents).toEqual(['evt_1']);
  });

  it('skips reconciliation when the session carries no bookingId', async () => {
    const event = makeEvent('evt_2');
    // Strip the bookingId (older sessions).
    (event.data.object.metadata as Record<string, unknown>).bookingId = undefined;
    constructEventMock.mockReturnValueOnce(event);

    const res = await POST(makeRequest(event));
    expect(res.status).toBe(200);

    // The seeded booking is untouched — still pending, no Stripe stamps.
    const doc = docStore.get('BK-TEST01')!;
    expect(doc.status).toBe('pending');
    expect(doc.stripeSessionId).toBeUndefined();
  });

  it('does NOT mark deposit_paid when the session is not yet paid', async () => {
    const event = makeEvent('evt_3');
    event.data.object.payment_status = 'unpaid'; // async method still clearing
    constructEventMock.mockReturnValueOnce(event);

    const res = await POST(makeRequest(event));
    expect(res.status).toBe(200);

    const doc = docStore.get('BK-TEST01')!;
    expect(doc.status).toBe('pending'); // untouched until money clears
    expect(doc.stripeSessionId).toBeUndefined();
  });

  it('reconciles when an asynchronous payment later succeeds', async () => {
    const event = makeEvent('evt_async');
    event.type = 'checkout.session.async_payment_succeeded';
    constructEventMock.mockReturnValueOnce(event);

    const res = await POST(makeRequest(event));
    expect(res.status).toBe(200);

    const doc = docStore.get('BK-TEST01')!;
    expect(doc.status).toBe('deposit_paid');
    expect(doc.processedStripeEvents).toEqual(['evt_async']);
  });

  it('creates a held relay only after an asynchronous payment succeeds', async () => {
    const completedEvent = makeEvent('evt_async_pending');
    completedEvent.data.object.payment_status = 'unpaid';
    completedEvent.data.object.metadata.depositState = 'held';
    constructEventMock.mockReturnValueOnce(completedEvent);

    expect(await POST(makeRequest(completedEvent))).toHaveProperty('status', 200);
    expect(retrievePiMock).not.toHaveBeenCalled();
    expect(createRelayMock).not.toHaveBeenCalled();

    const succeededEvent = makeEvent('evt_async_paid');
    succeededEvent.type = 'checkout.session.async_payment_succeeded';
    succeededEvent.data.object.metadata.depositState = 'held';
    Object.assign(succeededEvent.data.object.metadata, {
      artistId: 'artist-1',
      clientEmail: 'client@example.com',
      depositCents: '7500',
    });
    retrievePiMock.mockResolvedValueOnce({ latest_charge: 'ch_test_123' });
    constructEventMock.mockReturnValueOnce(succeededEvent);

    expect(await POST(makeRequest(succeededEvent))).toHaveProperty('status', 200);
    expect(createRelayMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pi_test_abc',
        artistId: 'artist-1',
        amountCents: 7500,
        chargeId: 'ch_test_123',
      })
    );
    expect(notifyArtistMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pi_test_abc', status: 'pending' })
    );
  });

  it('reconciles before a held-deposit side effect fails', async () => {
    const event = makeEvent('evt_relay_failure');
    event.data.object.metadata.depositState = 'held';
    retrievePiMock.mockRejectedValueOnce(new Error('Stripe unavailable'));
    constructEventMock.mockReturnValueOnce(event);

    const res = await POST(makeRequest(event));
    expect(res.status).toBe(500);

    const doc = docStore.get('BK-TEST01')!;
    expect(doc.status).toBe('deposit_paid');
    expect(doc.processedStripeEvents).toEqual(['evt_relay_failure']);
  });

  it('seeds the booking doc from metadata when it is missing (file-fallback recovery)', async () => {
    docStore.delete('BK-TEST01'); // capture only reached the file fallback
    const event = makeEvent('evt_4');
    (event.data.object.metadata as Record<string, unknown>).clientUid = 'uid-owner-1';
    (event.data.object.metadata as Record<string, unknown>).artistId = 'artist_x';
    constructEventMock.mockReturnValueOnce(event);

    const res = await POST(makeRequest(event));
    expect(res.status).toBe(200);

    const doc = docStore.get('BK-TEST01')!;
    expect(doc.status).toBe('deposit_paid');
    expect(doc.uid).toBe('uid-owner-1'); // owner can still read it via /api/v1/bookings
    expect(doc.artistId).toBe('artist_x');
    expect(doc.depositAmount).toBe(75);
    expect(doc.reconstructedFromStripe).toBe(true);
    expect(doc.processedStripeEvents).toEqual(['evt_4']);
  });
});
