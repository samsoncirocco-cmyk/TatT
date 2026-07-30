import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureAdminAppMock,
  runTransactionMock,
  txGetMock,
  txSetMock,
  writeBudgetMetricMock,
} = vi.hoisted(() => ({
  ensureAdminAppMock: vi.fn(),
  runTransactionMock: vi.fn(),
  txGetMock: vi.fn(),
  txSetMock: vi.fn(),
  writeBudgetMetricMock: vi.fn(),
}));

vi.mock('./firebase-admin', () => ({ ensureAdminApp: ensureAdminAppMock }));
vi.mock('./monitoring-client', () => ({ writeBudgetMetric: writeBudgetMetricMock }));
vi.mock('./logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({ path: `${name}/${id}` }),
    }),
    runTransaction: runTransactionMock,
  }),
  FieldValue: {
    increment: (amount: number) => ({ __increment: amount }),
    serverTimestamp: () => ({ __serverTimestamp: true }),
  },
}));

import {
  reconcileReservedSpend,
  reserveSpend,
  type BudgetConfig,
} from './budget-tracker';

const config: BudgetConfig = {
  maxSpendCents: 100,
  periodMs: 30 * 24 * 60 * 60 * 1000,
};

function snapshot(data: Record<string, unknown> | null) {
  return {
    exists: data !== null,
    data: () => data ?? undefined,
  };
}

function givenTransaction(
  budget: Record<string, unknown> | null,
  reservation: Record<string, unknown> | null
) {
  txGetMock
    .mockResolvedValueOnce(snapshot(budget))
    .mockResolvedValueOnce(snapshot(reservation));
  runTransactionMock.mockImplementation(
    async (callback: (tx: { get: typeof txGetMock; set: typeof txSetMock }) => Promise<unknown>) =>
      callback({ get: txGetMock, set: txSetMock })
  );
}

describe('budget spend reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureAdminAppMock.mockReturnValue(true);
    writeBudgetMetricMock.mockResolvedValue(undefined);
  });

  it('fails closed when Firebase Admin is unavailable', async () => {
    ensureAdminAppMock.mockReturnValue(false);

    await expect(reserveSpend('generation-1', 8, config)).rejects.toThrow(
      'Firebase Admin not configured'
    );
    expect(runTransactionMock).not.toHaveBeenCalled();
  });

  it('reserves the requested amount in the same transaction as the idempotency record', async () => {
    const periodStartMs = Date.now();
    givenTransaction({ periodStartMs, spentCents: 92 }, null);

    const result = await reserveSpend('generation-1', 8, config);

    expect(result).toMatchObject({
      allowed: true,
      acquired: true,
      status: 'reserved',
      reservedCents: 8,
      spentCents: 100,
      remainingCents: 0,
    });
    expect(txSetMock).toHaveBeenCalledTimes(2);
    expect(txSetMock.mock.calls[0][1]).toMatchObject({ spentCents: 100 });
    expect(txSetMock.mock.calls[1][1]).toMatchObject({
      reservationKey: 'generation-1',
      status: 'reserved',
      reservedCents: 8,
      periodStartMs,
    });
  });

  it('denies atomically when the reservation would cross the cap', async () => {
    givenTransaction({ periodStartMs: Date.now(), spentCents: 95 }, null);

    const result = await reserveSpend('generation-1', 8, config);

    expect(result).toMatchObject({
      allowed: false,
      acquired: false,
      status: 'denied',
      spentCents: 95,
      remainingCents: 5,
    });
    expect(txSetMock).not.toHaveBeenCalled();
  });

  it('does not grant a second acquisition for the same active reservation', async () => {
    givenTransaction(
      { periodStartMs: Date.now(), spentCents: 50 },
      { status: 'reserved', reservedCents: 8 }
    );

    const result = await reserveSpend('generation-1', 8, config);

    expect(result).toMatchObject({
      allowed: true,
      acquired: false,
      status: 'reserved',
      reservedCents: 8,
    });
    expect(txSetMock).not.toHaveBeenCalled();
  });

  it('reconciles the estimate to actual spend and marks it billed atomically', async () => {
    const periodStartMs = Date.now();
    givenTransaction(
      { periodStartMs, spentCents: 100 },
      { status: 'reserved', reservedCents: 8, periodStartMs }
    );

    await reconcileReservedSpend('generation-1', 4);

    expect(txSetMock).toHaveBeenCalledTimes(2);
    expect(txSetMock.mock.calls[0][1]).toMatchObject({ spentCents: 96 });
    expect(txSetMock.mock.calls[1][1]).toMatchObject({
      status: 'billed',
      actualCents: 4,
    });
    expect(writeBudgetMetricMock).toHaveBeenCalledWith(96);
  });
});
