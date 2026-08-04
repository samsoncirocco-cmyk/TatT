/**
 * Held-deposit expiry window (ADR-0006).
 *
 * One helper so webhook stamping, cron semantics, and user-facing refund copy
 * cannot drift when operators override DEPOSIT_HOLD_DAYS.
 */
export function depositHoldDays(value: unknown = process.env.DEPOSIT_HOLD_DAYS): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 7;
}
