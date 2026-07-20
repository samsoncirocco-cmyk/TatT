import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { ensureAdminApp } from './firebase-admin';
import { logger } from './logger';
import { writeBudgetMetric } from './monitoring-client';

export interface BudgetConfig {
  maxSpendCents: number;
  periodMs: number;
}

// Monthly cap in cents; override via BUDGET_MAX_SPEND_CENTS (e.g. 1000 = $10).
const DEFAULT_BUDGET: BudgetConfig = {
  maxSpendCents: Number(process.env.BUDGET_MAX_SPEND_CENTS) || 50_000,
  periodMs: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Cost of a single Vertex AI (Imagen 3) generated image, in cents.
// Imagen 3 is ~$0.04/image; override via VERTEX_IMAGEN_COST_CENTS.
export const VERTEX_IMAGEN_COST_CENTS =
  Number(process.env.VERTEX_IMAGEN_COST_CENTS) || 4;

export type BudgetResult = {
  allowed: boolean;
  spentCents: number;
  remainingCents: number;
};

function isPeriodExpired(periodStartMs: number, config: BudgetConfig): boolean {
  return Date.now() - periodStartMs >= config.periodMs;
}

export async function checkBudget(_userId?: string, config: BudgetConfig = DEFAULT_BUDGET): Promise<BudgetResult> {
  try {
    // Inside the try: init/getFirestore throw when Firebase Admin isn't
    // configured, and budget checking must fail open.
    if (!ensureAdminApp()) throw new Error('Firebase Admin not configured');
    const db = getFirestore();
    const ref = db.collection('budget').doc('global');

    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() || {};

      const periodStartMs =
        typeof data.periodStartMs === 'number' ? data.periodStartMs : Date.now();
      const spentCents = typeof data.spentCents === 'number' ? data.spentCents : 0;

      if (!snap.exists || isPeriodExpired(periodStartMs, config)) {
        tx.set(
          ref,
          {
            periodStartMs: Date.now(),
            spentCents: 0,
            lastUpdated: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return { allowed: true, spentCents: 0, remainingCents: config.maxSpendCents };
      }

      if (spentCents >= config.maxSpendCents) {
        logger.warn({
          event_type: 'budget.limit_reached',
          spent_cents: spentCents,
          max_cents: config.maxSpendCents,
        });
        return { allowed: false, spentCents, remainingCents: 0 };
      }

      return {
        allowed: true,
        spentCents,
        remainingCents: config.maxSpendCents - spentCents,
      };
    });
  } catch (error) {
    logger.warn({
      event_type: 'budget.check_failed',
      error: error instanceof Error ? error.message : String(error),
    }, '[Budget] Firestore unavailable for budget tracking; allowing request.');
    return { allowed: true, spentCents: 0, remainingCents: -1 };
  }
}

export async function recordSpend(amountCents: number, config: BudgetConfig = DEFAULT_BUDGET): Promise<void> {
  try {
    if (!ensureAdminApp()) throw new Error('Firebase Admin not configured');
    const db = getFirestore();
    const ref = db.collection('budget').doc('global');

    let newTotalCents = 0;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() || {};

      const periodStartMs =
        typeof data.periodStartMs === 'number' ? data.periodStartMs : Date.now();

      if (!snap.exists || isPeriodExpired(periodStartMs, config)) {
        const spentAmount = Math.max(0, Math.floor(amountCents));
        tx.set(
          ref,
          {
            periodStartMs: Date.now(),
            spentCents: spentAmount,
            lastUpdated: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        newTotalCents = spentAmount;

        // Log spend recorded for new period
        logger.info({
          event_type: 'budget.spend_recorded',
          amount_cents: spentAmount,
          new_total_cents: spentAmount,
          period_reset: true,
        });
        return;
      }

      const currentSpent = typeof data.spentCents === 'number' ? data.spentCents : 0;
      const incrementAmount = Math.max(0, Math.floor(amountCents));

      tx.set(
        ref,
        {
          spentCents: FieldValue.increment(incrementAmount),
          lastUpdated: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      newTotalCents = currentSpent + incrementAmount;

      // Log spend recorded
      logger.info({
        event_type: 'budget.spend_recorded',
        amount_cents: incrementAmount,
        new_total_cents: newTotalCents,
      });
    });

    // Write budget metric to Cloud Monitoring AFTER transaction completes
    // (don't hold transaction open for monitoring write)
    await writeBudgetMetric(newTotalCents);
  } catch (error) {
    logger.warn({
      event_type: 'budget.record_failed',
      amount_cents: amountCents,
      error: error instanceof Error ? error.message : String(error),
    }, '[Budget] Firestore unavailable for spend tracking; skipping recordSpend.');
  }
}

