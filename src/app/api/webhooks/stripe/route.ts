/**
 * Stripe webhook receiver.
 *
 * Verifies the event signature with the SDK (stripe.webhooks.constructEvent) —
 * this replaces the previous hand-rolled HMAC. Still FAILS CLOSED: without a
 * real signing secret it returns 503 unless an explicit non-production bypass
 * flag is set.
 *
 * Handles both money flows:
 *  - Marketplace/payments: checkout.session.completed, payment_intent.succeeded
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
