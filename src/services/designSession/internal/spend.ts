/**
 * Image spend for a design session.
 *
 * This lives beside the orchestrator rather than in the route adapters
 * because the orchestrator is the only thing that knows how many renders were
 * actually bought: a retry that reuses an already-staged image (see
 * ./durableImage) pays for nothing, and a step that fails after the provider
 * answered has still spent the money. Routes keep the pre-flight checkBudget
 * policy; the purchase itself is recorded here, where it happens.
 */
import { recordSpend, VERTEX_IMAGEN_COST_CENTS } from '@/lib/budget-tracker';
import type { ProviderName } from '../../generation';

/**
 * Replicate results are billed flat (~1 cent), matching /api/v1/generate's
 * fallback cost. The session's provider is locked for its lifetime
 * (ADR-0016), so one rate applies to every render in a step.
 */
export const REPLICATE_COST_CENTS = 1;

/**
 * Record what a session step bought. Called on the success AND the failure
 * path: money leaves the account the moment the provider returns an image, so
 * a later durable-copy or persistence failure must not make that render free
 * in the ledger.
 *
 * Never throws — a ledger write that fails must not mask the real error, and
 * must not turn a successful reveal into a failed one.
 */
export async function recordImageSpend(
  provider: ProviderName | string,
  imagesPurchased: number
): Promise<void> {
  if (imagesPurchased <= 0) return;
  try {
    await recordSpend(
      provider === 'replicate'
        ? REPLICATE_COST_CENTS * imagesPurchased
        : VERTEX_IMAGEN_COST_CENTS * imagesPurchased
    );
  } catch (error) {
    console.error('[DesignSession] Failed to record image spend:', error);
  }
}
