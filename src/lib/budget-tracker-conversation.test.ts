// Unit tests for the conversation-turn budget line item: the design-bot
// intake gets its own tracked spend category (untracked spend categories are
// how caps become fiction). Firestore, Firebase Admin bootstrap, logging,
// and monitoring are all mocked — no live call is ever made.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ensureAdminAppMock, writeBudgetMetricMock, txSetMock, txGetMock, runTransactionMock } =
  vi.hoisted(() => ({
    ensureAdminAppMock: vi.fn(),
    writeBudgetMetricMock: vi.fn(),
    txSetMock: vi.fn(),
    txGetMock: vi.fn(),
    runTransactionMock: vi.fn(),
  }));

vi.mock('./firebase-admin', () => ({ ensureAdminApp: ensureAdminAppMock }));
vi.mock('./monitoring-client', () => ({ writeBudgetMetric: writeBudgetMetricMock }));
vi.mock('./logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({ doc: () => ({}) }),
    runTransaction: runTransactionMock,
  }),
  FieldValue: {
    increment: (n: number) => ({ __increment: n }),
    serverTimestamp: () => ({ __serverTimestamp: true }),
  },
}));

import { recordConversationTurnSpend, CONVERSATION_TURNS_PER_CENT } from './budget-tracker';

/** Wire the fake transaction around a budget doc snapshot. */
function givenBudgetDoc(data: Record<string, unknown> | null) {
  txGetMock.mockResolvedValue({
    exists: data !== null,
    data: () => data ?? undefined,
  });
  runTransactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
    fn({ get: txGetMock, set: txSetMock })
  );
}

/** The doc written by the transaction's single set call. */
function writtenDoc(): Record<string, { __increment: number }> {
  expect(txSetMock).toHaveBeenCalledTimes(1);
  return txSetMock.mock.calls[0][1];
}

describe('recordConversationTurnSpend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureAdminAppMock.mockReturnValue(true);
    writeBudgetMetricMock.mockResolvedValue(undefined);
  });

  it('uses a 10-turn block by default', () => {
    expect(CONVERSATION_TURNS_PER_CENT).toBe(10);
  });

  it('charges one cent on the very first turn (ceiling rounds up)', async () => {
    givenBudgetDoc(null);

    await recordConversationTurnSpend();

    const doc = writtenDoc();
    expect(doc.conversationTurns).toEqual({ __increment: 1 });
    expect(doc.conversationSpendCents).toEqual({ __increment: 1 });
    // The category rolls into the global cap — a line item, not a side ledger.
    expect(doc.spentCents).toEqual({ __increment: 1 });
    expect(writeBudgetMetricMock).toHaveBeenCalledWith(1);
  });

  it('charges nothing mid-block', async () => {
    givenBudgetDoc({ conversationTurns: 4, conversationSpendCents: 1, spentCents: 120 });

    await recordConversationTurnSpend();

    const doc = writtenDoc();
    expect(doc.conversationTurns).toEqual({ __increment: 1 });
    expect(doc.conversationSpendCents).toEqual({ __increment: 0 });
    expect(doc.spentCents).toEqual({ __increment: 0 });
    // The monitoring total is republished unchanged.
    expect(writeBudgetMetricMock).toHaveBeenCalledWith(120);
  });

  it('charges the next cent when a new block starts (turn 11)', async () => {
    givenBudgetDoc({ conversationTurns: 10, conversationSpendCents: 1, spentCents: 200 });

    await recordConversationTurnSpend();

    const doc = writtenDoc();
    expect(doc.conversationSpendCents).toEqual({ __increment: 1 });
    expect(doc.spentCents).toEqual({ __increment: 1 });
    expect(writeBudgetMetricMock).toHaveBeenCalledWith(201);
  });

  it('fails open when Firebase Admin is not configured', async () => {
    ensureAdminAppMock.mockReturnValue(false);

    await expect(recordConversationTurnSpend()).resolves.toBeUndefined();

    expect(runTransactionMock).not.toHaveBeenCalled();
    expect(txSetMock).not.toHaveBeenCalled();
    expect(writeBudgetMetricMock).not.toHaveBeenCalled();
  });

  it('fails open when the transaction throws', async () => {
    runTransactionMock.mockRejectedValueOnce(new Error('firestore down'));

    await expect(recordConversationTurnSpend()).resolves.toBeUndefined();
    expect(writeBudgetMetricMock).not.toHaveBeenCalled();
  });
});
