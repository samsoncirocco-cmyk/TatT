/**
 * Stripe webhook receiver.
 *
 * Verifies the event signature with the SDK (stripe.webhooks.constructEvent) —
 * this replaces the previous hand-rolled HMAC. Still FAILS CLOSED: without a
 * real signing secret it returns 503 unless an explicit non-production bypass
 * flag is set.
 *
 * Handles both money flows:
 *  - Marketplace/payments: checkout.session.completed/async_payment_succeeded,
 *    payment_intent.succeeded
 *  - Connect account status: account.updated (caches charges_enabled on the artist)
 *  - SaaS billing: customer.subscription.*, invoice.paid/payment_failed
 *
 * Connect events (account.updated, etc.) are delivered signed with the same or
 * a separate signing secret. We try STRIPE_WEBHOOK_SECRET then, if set,
 * STRIPE_CONNECT_WEBHOOK_SECRET so one endpoint can serve both.
 */
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { setArtistChargesEnabled } from '@/lib/artist-stripe';
import { createRelay, transferHeldDeposits, setArtistSubscription } from '@/lib/booking-relay';
import { notifyArtistOfBooking } from '@/lib/notify';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { canTransition, appendStatus } from '@/lib/booking';
import type { BookingStatus, BookingStatusEvent } from '@/lib/booking';

export const runtime = 'nodejs';

/** Verify against any of the configured signing secrets; return the event or null. */
function constructEvent(rawBody: string, signature: string, secrets: string[]): Stripe.Event | null {
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      // try the next secret (e.g. Connect endpoint secret)
    }
  }
  return null;
}

/**
 * Reconcile a captured booking against a paid Checkout Session.
 *
 * Best-effort and idempotent. Older sessions carry no `metadata.bookingId`
 * (nothing to reconcile — skip). Guards against Stripe webhook replays two
 * ways: the processed event id is recorded on the doc, and the state machine
 * refuses to re-apply once the booking has advanced past `pending`. Never
 * throws — any failure is logged and swallowed so relay creation and the 200
 * response survive.
 */
async function reconcileBookingDeposit(
  session: Stripe.Checkout.Session,
  event: Stripe.Event
): Promise<void> {
  const metadata = session.metadata || {};
  const bookingId = metadata.bookingId;
  if (!bookingId) {
    // Older sessions predate the metadata.bookingId wiring — nothing to do.
    console.log('[Stripe] checkout completed without bookingId metadata — skipping booking reconciliation', {
      session: session.id,
    });
    return;
  }

  // Only reconcile once the money has actually cleared. checkout.session.completed
  // can fire for async payment methods while payment_status is still 'unpaid' /
  // 'no_payment_required' — marking deposit_paid then would be a lie.
  if (session.payment_status !== 'paid') {
    console.log('[Stripe] booking reconciliation: session not paid yet — skipping', {
      bookingId,
      paymentStatus: session.payment_status,
    });
    return;
  }

  try {
    const cred = ensureAdminApp();
    if (!cred) {
      console.error('[Stripe] booking reconciliation skipped — firebase-admin unconfigured', { bookingId });
      return;
    }

    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const db = getFirestore();
    const ref = db.collection('booking_requests').doc(bookingId);
    const paidAtIso = new Date(event.created * 1000).toISOString();
    const paymentIntent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    // The DEPOSIT (in dollars — what the client's booking is for and what the UI
    // renders), NOT session.amount_total, which is (deposit + booking fee) in
    // cents. amountPaidCents keeps the full charged total for audit.
    const depositAmount = Number(metadata.depositAmount) || 0;
    const amountPaidCents = session.amount_total ?? null;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        // The capture may have only reached the file fallback (Firestore down at
        // book time). A paid deposit is real money — SEED the booking record from
        // the Stripe session metadata rather than dropping it. uid comes from
        // metadata.clientUid so the owner can still read it via /api/v1/bookings.
        const seed = Object.fromEntries(
          Object.entries({
            bookingId,
            artistId: metadata.artistId,
            artistName: metadata.artistName,
            clientName: metadata.clientName,
            clientEmail: metadata.clientEmail || session.customer_details?.email,
            budget: metadata.budget,
            uid: metadata.clientUid || null,
            status: 'deposit_paid' as BookingStatus,
            statusHistory: appendStatus(undefined, {
              status: 'deposit_paid',
              at: paidAtIso,
              by: 'stripe-webhook',
            }),
            stripeSessionId: session.id,
            stripePaymentIntent: paymentIntent,
            depositAmount,
            amountPaidCents,
            paidAt: paidAtIso,
            createdAt: paidAtIso,
            reconstructedFromStripe: true,
            processedStripeEvents: [event.id],
          }).filter(([, v]) => v !== undefined)
        );
        tx.set(ref, seed);
        console.warn('[Stripe] booking reconciliation: doc missing — seeded from Stripe metadata', {
          bookingId,
          eventId: event.id,
        });
        return;
      }
      const data = (snap.data() as Record<string, unknown>) || {};
      const current = (data.status as BookingStatus) || 'pending';
      const processed = Array.isArray(data.processedStripeEvents)
        ? (data.processedStripeEvents as string[])
        : [];

      // Idempotency 1: this exact event already applied.
      if (processed.includes(event.id)) {
        console.log('[Stripe] booking reconciliation: event already processed — no-op', {
          bookingId,
          eventId: event.id,
        });
        return;
      }

      // Idempotency 2: booking already at deposit_paid or later. `pending` is
      // the only state that may transition to deposit_paid, so any state where
      // that transition is illegal AND is not pending is already-done.
      if (!canTransition(current, 'deposit_paid')) {
        if (current !== 'pending') {
          console.log('[Stripe] booking reconciliation: already at/after deposit_paid — no-op', {
            bookingId,
            current,
          });
        } else {
          console.error('[Stripe] booking reconciliation: illegal pending transition — skipping', {
            bookingId,
            current,
          });
        }
        return;
      }

      const history = Array.isArray(data.statusHistory)
        ? (data.statusHistory as BookingStatusEvent[])
        : undefined;
      const nextEvent: BookingStatusEvent = {
        status: 'deposit_paid',
        at: paidAtIso,
        by: 'stripe-webhook',
      };

      tx.set(
        ref,
        {
          status: 'deposit_paid',
          statusHistory: appendStatus(history, nextEvent),
          stripeSessionId: session.id,
          stripePaymentIntent: paymentIntent,
          depositAmount,
          amountPaidCents,
          paidAt: paidAtIso,
          processedStripeEvents: FieldValue.arrayUnion(event.id),
        },
        { merge: true }
      );

      console.log('[Stripe] booking reconciled → deposit_paid', { bookingId, eventId: event.id });
    });
  } catch (err) {
    // A lost reconciliation is real money — never silent.
    console.error('[Stripe] booking reconciliation failed (best-effort):', err);
  }
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      console.log('[Stripe] checkout completed', {
        id: session.id,
        mode: session.mode,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        metadata,
      });

      // Reconcile before relay/subscription side effects so their failures
      // cannot leave a successfully paid booking pending.
      await reconcileBookingDeposit(session, event);

      // HELD deposit (unclaimed artist): collected to the platform — record a
      // :BookingRelay so we can transfer it once the artist onboards, or refund
      // it if the hold window lapses.
      if (metadata.depositState === 'held') {
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;
        if (paymentIntentId) {
          // The charge id backs the later transfer's source_transaction.
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          const chargeId =
            typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id || '';
          const holdDays = Number(process.env.DEPOSIT_HOLD_DAYS) || 7;
          const expiresAtEpoch = event.created + holdDays * 86400;
          // The artist's share is the DEPOSIT only (metadata.depositCents) — the
          // client also paid a booking fee on top (session.amount_total), which
          // TatT keeps and never transfers to the artist.
          const depositCents = Number(metadata.depositCents) || 0;
          const relay = {
            id: paymentIntentId,
            artistId: metadata.artistId || '',
            customerEmail: metadata.clientEmail || session.customer_details?.email || '',
            amountCents: depositCents,
            chargeId,
            paymentIntentId,
            expiresAtEpoch,
            createdAtEpoch: event.created,
          };
          await createRelay(relay);
          await notifyArtistOfBooking({ ...relay, status: 'pending' as const });
        }
      }

      // SaaS subscription checkout: persist customer + status on the artist node.
      if (session.mode === 'subscription' && metadata.tattArtistId) {
        const stripeCustomerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
        await setArtistSubscription(metadata.tattArtistId, {
          stripeCustomerId,
          subscriptionStatus: 'active',
        });
      }

      break;
    }

    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('[Stripe] checkout async payment succeeded', {
        id: session.id,
        paymentStatus: session.payment_status,
      });
      await reconcileBookingDeposit(session, event);
      break;
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      const chargesEnabled = Boolean(account.charges_enabled);
      // Cache payout-readiness so checkout can gate without a live round-trip.
      await setArtistChargesEnabled(account.id, chargesEnabled);
      console.log('[Stripe] account.updated', { id: account.id, chargesEnabled });

      // Onboarding just completed → release any deposits held for this artist.
      if (chargesEnabled) {
        try {
          let artistId = account.metadata?.tattArtistId;
          if (!artistId) {
            // Fall back to the node keyed by this connected-account id.
            const { executeServerCypherQuery } = await import(
              '@/features/match-pulse/services/neo4jService'
            );
            const rows = await executeServerCypherQuery(
              `MATCH (a:Artist {stripeAccountId: $acct}) RETURN a.id AS id LIMIT 1`,
              { acct: account.id }
            );
            artistId = rows.length ? String((rows[0] as Record<string, unknown>).id) : undefined;
          }
          if (artistId) {
            const result = await transferHeldDeposits(artistId);
            if (result.count > 0) {
              console.log('[Stripe] released held deposits', { artistId, ...result });
            }
          }
        } catch (err) {
          console.error('[Stripe] transferHeldDeposits failed (best-effort):', err);
        }
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log('[Stripe] payment_intent.succeeded', { id: pi.id, amount: pi.amount });
      break;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log('[Stripe]', event.type, { id: invoice.id, status: invoice.status });
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      console.log('[Stripe]', event.type, { id: sub.id, status: sub.status, customer: sub.customer });
      // Reflect artist subscription status on the artist record when we can key it.
      const tattArtistId = sub.metadata?.tattArtistId;
      if (tattArtistId) {
        const stripeCustomerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || null;
        await setArtistSubscription(tattArtistId, {
          stripeCustomerId,
          subscriptionStatus: sub.status,
        });
      }
      break;
    }

    default:
      // Unhandled but acknowledged so Stripe stops retrying.
      break;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const primary = process.env.STRIPE_WEBHOOK_SECRET || '';
    const connectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || '';
    const secrets = [primary, connectSecret].filter((s) => s && !s.startsWith('whsec_PLACEHOLDER'));

    if (secrets.length === 0) {
      // Fail closed: without a real signing secret we cannot verify the payload.
      const allowPlaceholder =
        process.env.STRIPE_WEBHOOK_ALLOW_PLACEHOLDER === 'true' && process.env.NODE_ENV !== 'production';
      if (!allowPlaceholder) {
        return NextResponse.json({ error: 'Stripe webhook secret not configured.' }, { status: 503 });
      }
      // Bypass path (non-prod only): parse without verification.
      const event = JSON.parse(rawBody) as Stripe.Event;
      await handleEvent(event);
      return NextResponse.json({ received: true, unverified: true });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
    }

    const event = constructEvent(rawBody, signature, secrets);
    if (!event) {
      return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
    }

    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
