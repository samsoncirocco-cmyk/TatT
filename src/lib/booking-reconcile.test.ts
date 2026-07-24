import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markBookingDepositPaid } from './booking-reconcile';

// In-memory fake for the one Firestore doc the reconciler touches.
let docData: Record<string, unknown> | null = null;
let adminConfigured = true;

vi.mock('@/lib/firebase-admin', () => ({
  ensureAdminApp: () => (adminConfigured ? 'firebase-triplet' : false),
}));

vi.mock('firebase-admin/firestore', () => {
  const ref = { id: 'fake-ref' };
  const tx = {
    get: async () => ({
      exists: docData !== null,
      data: () => docData ?? undefined,
    }),
    update: (_ref: unknown, fields: Record<string, unknown>) => {
      docData = { ...(docData ?? {}), ...fields };
    },
  };
  return {
    getFirestore: () => ({
      collection: () => ({ doc: () => ref }),
      runTransaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    }),
  };
});

const input = {
  bookingId: 'BK-0A1B2C3D',
  stripeSessionId: 'cs_test_123',
  stripePaymentIntent: 'pi_test_456',
  amountTotalCents: 16500,
  depositCents: 15000,
  paidAtIso: '2026-07-22T13:00:00.000Z',
};

beforeEach(() => {
  adminConfigured = true;
  docData = { status: 'pending', uid: 'user-1', statusHistory: [] };
});

describe('markBookingDepositPaid', () => {
  it('transitions a pending booking to deposit_paid with Stripe references', async () => {
    const result = await markBookingDepositPaid(input);
    expect(result).toBe('updated');
    expect(docData).toMatchObject({
      status: 'deposit_paid',
      stripeSessionId: 'cs_test_123',
      stripePaymentIntent: 'pi_test_456',
      amountTotalCents: 16500,
      depositCents: 15000,
      paidAt: input.paidAtIso,
    });
    expect(docData?.statusHistory).toEqual([
      { status: 'deposit_paid', at: input.paidAtIso, by: 'stripe-webhook' },
    ]);
  });

  it('is a no-op on redelivery (already deposit_paid)', async () => {
    await markBookingDepositPaid(input);
    const second = await markBookingDepositPaid(input);
    expect(second).toBe('already_processed');
    expect((docData?.statusHistory as unknown[]).length).toBe(1);
  });

  it('refuses to regress a booking that moved past deposit_paid', async () => {
    docData = { status: 'confirmed', statusHistory: [] };
    expect(await markBookingDepositPaid(input)).toBe('already_processed');
    expect(docData.status).toBe('confirmed');
  });

  it('treats a legacy doc without a recognizable status as pending', async () => {
    docData = { uid: 'user-1' };
    expect(await markBookingDepositPaid(input)).toBe('updated');
    expect(docData.status).toBe('deposit_paid');
  });

  it('returns not_found for a missing booking doc without throwing', async () => {
    docData = null;
    expect(await markBookingDepositPaid(input)).toBe('not_found');
  });

  it('rejects malformed booking ids before touching Firestore', async () => {
    expect(
      await markBookingDepositPaid({ ...input, bookingId: 'BK-nope' }),
    ).toBe('invalid_id');
    expect(docData?.status).toBe('pending');
  });

  it('reports no_admin when the Admin SDK is unconfigured', async () => {
    adminConfigured = false;
    expect(await markBookingDepositPaid(input)).toBe('no_admin');
    expect(docData?.status).toBe('pending');
  });

  it('omits optional Stripe fields when absent', async () => {
    const result = await markBookingDepositPaid({
      ...input,
      stripePaymentIntent: null,
      amountTotalCents: null,
      depositCents: null,
    });
    expect(result).toBe('updated');
    expect(docData).not.toHaveProperty('stripePaymentIntent');
    expect(docData).not.toHaveProperty('amountTotalCents');
    expect(docData).not.toHaveProperty('depositCents');
  });
});
