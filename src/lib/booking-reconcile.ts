/**
 * Booking ↔ payment reconciliation.
 *
 * Called by the Stripe webhook when a checkout session completes carrying a
 * bookingId in its metadata: flips the booking_requests doc from "pending"
 * to "deposit_paid" and records the Stripe references. The write runs in a
 * transaction and is guarded by the canTransition state machine, so Stripe's
 * retry deliveries (and parallel deliveries) are safe no-ops.
 *
 * Firestore rules keep booking_requests server-write-only; the Admin SDK
 * bypasses rules, which is exactly the intended write path.
 */
import { ensureAdminApp } from '@/lib/firebase-admin';
import {
  canTransition,
  isBookingStatus,
  isValidBookingId,
  type BookingStatus,
} from '@/lib/booking';

export interface DepositPaidInput {
  bookingId: string;
  stripeSessionId: string;
  stripePaymentIntent: string | null;
  /** Full charge incl. booking fee + tax, from session.amount_total. */
  amountTotalCents: number | null;
  /** The artist's share (metadata.depositCents). */
  depositCents: number | null;
  paidAtIso: string;
}

export type ReconcileResult =
  | 'updated'
  | 'already_processed'
  | 'not_found'
  | 'invalid_id'
  | 'no_admin';

export async function markBookingDepositPaid(
  input: DepositPaidInput,
): Promise<ReconcileResult> {
  if (!isValidBookingId(input.bookingId)) return 'invalid_id';
  if (!ensureAdminApp()) return 'no_admin';

  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();
  const ref = db.collection('booking_requests').doc(input.bookingId);

  return db.runTransaction(async (tx): Promise<ReconcileResult> => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 'not_found';

    const current = snap.data() ?? {};
    // Docs written before the lifecycle existed have status 'pending' anyway;
    // anything unrecognizable collapses to 'pending' rather than blocking.
    const status: BookingStatus = isBookingStatus(current.status)
      ? current.status
      : 'pending';
    if (!canTransition(status, 'deposit_paid')) return 'already_processed';

    const history = Array.isArray(current.statusHistory)
      ? current.statusHistory
      : [];
    tx.update(ref, {
      status: 'deposit_paid' satisfies BookingStatus,
      stripeSessionId: input.stripeSessionId,
      ...(input.stripePaymentIntent
        ? { stripePaymentIntent: input.stripePaymentIntent }
        : {}),
      ...(input.amountTotalCents != null
        ? { amountTotalCents: input.amountTotalCents }
        : {}),
      ...(input.depositCents != null ? { depositCents: input.depositCents } : {}),
      paidAt: input.paidAtIso,
      statusHistory: [
        ...history,
        { status: 'deposit_paid', at: input.paidAtIso, by: 'stripe-webhook' },
      ],
    });
    return 'updated';
  });
}
