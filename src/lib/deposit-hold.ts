/**
 * Held-deposit expiry window (ADR-0006).
 *
 * One helper so webhook stamping, cron semantics, and user-facing refund copy
 * cannot drift when operators override DEPOSIT_HOLD_DAYS.
 */
export function depositHoldDays(): number {
  const n = Number(process.env.DEPOSIT_HOLD_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 7;
}
