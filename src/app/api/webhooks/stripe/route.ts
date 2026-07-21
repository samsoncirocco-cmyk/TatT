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
      console.log('[Stripe] checkout completed', {
        id: session.id,
        mode: session.mode,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        metadata: session.metadata || {},
      });
      // TODO(fulfillment): mark the booking confirmed / activate the artist subscription.
      break;
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      // Cache payout-readiness so checkout can gate without a live round-trip.
      await setArtistChargesEnabled(account.id, Boolean(account.charges_enabled));
      console.log('[Stripe] account.updated', { id: account.id, chargesEnabled: account.charges_enabled });
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
      // TODO(billing): reflect artist subscription status on the artist record.
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
