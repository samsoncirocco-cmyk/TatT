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

// Conversational-intake turns (design bot, ADR-0019) are near-free next to
// image renders, but untracked spend categories are how caps become fiction
// — so they get their own line item from day one. Conservative flat
// estimate: one cent per this many turns, charged by ceiling (the first
// turn of every block adds the cent). Override via CONVERSATION_TURNS_PER_CENT.
export const CONVERSATION_TURNS_PER_CENT =
  Number(process.env.CONVERSATION_TURNS_PER_CENT) || 10;

// One reference-image vision analysis (TAT-50): a single Gemini Flash
// multimodal call — one image in, a small JSON brief out. Real cost is a
// fraction of a cent; charged flat at 1¢ as a deliberate over-estimate,
// same philosophy as the conversation-turn line item. Override via
// VISION_ANALYSIS_COST_CENTS.
export const VISION_ANALYSIS_COST_CENTS =
  Number(process.env.VISION_ANALYSIS_COST_CENTS) || 1;

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

/**
 * Record one conversational-intake turn as its own budget line item.
 *
 * Keeps a running `conversationTurns` counter and a `conversationSpendCents`
 * category total on the budget doc, and rolls the cents into the global
 * `spentCents` cap. Charging is ceiling-based on the turn counter: turns
 * 1, 11, 21, … (with the default block of 10) each add one cent, the rest
 * add none — a deliberate over-estimate of real chat-turn cost. Fails open
 * like the other trackers.
 */
export async function recordConversationTurnSpend(): Promise<void> {
  try {
    if (!ensureAdminApp()) throw new Error('Firebase Admin not configured');
    const db = getFirestore();
    const ref = db.collection('budget').doc('global');

    let newTotalCents = 0;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() || {};

      const turns =
        typeof data.conversationTurns === 'number' ? data.conversationTurns : 0;
      const spentCents =
        typeof data.spentCents === 'number' ? data.spentCents : 0;

      // Ceiling difference: exactly one cent at the start of each block.
      const centsDelta =
        Math.ceil((turns + 1) / CONVERSATION_TURNS_PER_CENT) -
        Math.ceil(turns / CONVERSATION_TURNS_PER_CENT);

      tx.set(
        ref,
        {
          conversationTurns: FieldValue.increment(1),
          conversationSpendCents: FieldValue.increment(centsDelta),
          spentCents: FieldValue.increment(centsDelta),
          lastUpdated: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      newTotalCents = spentCents + centsDelta;

      logger.info({
        event_type: 'budget.conversation_turn_recorded',
        turn_count: turns + 1,
        amount_cents: centsDelta,
        new_total_cents: newTotalCents,
      });
    });

    // Same pattern as recordSpend: monitoring write after the transaction.
    await writeBudgetMetric(newTotalCents);
  } catch (error) {
    logger.warn({
      event_type: 'budget.record_failed',
      category: 'conversation-turn',
      error: error instanceof Error ? error.message : String(error),
    }, '[Budget] Firestore unavailable for conversation-turn tracking; skipping.');
  }
}

