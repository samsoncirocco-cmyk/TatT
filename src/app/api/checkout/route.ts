/**
 * Booking-deposit checkout — two money flows depending on artist readiness.
 *
 * CLAIMED artist (has a connected account with charges enabled):
 *   MARKETPLACE destination charge — the deposit is routed to the artist's
 *   connected account and TatT keeps an application fee.
 *
 *   customer pays $deposit
 *     ├─ application_fee_amount → TatT (platform)
 *     └─ remainder             → artist connected account (transfer_data.destination)
 *
 * UNCLAIMED artist (no connected account, or charges not enabled):
 *   HELD deposit — we can't route money to an artist who can't receive it, so
 *   the deposit is collected to the PLATFORM and HELD (a plain payment charge,
 *   NO transfer_data / application_fee_amount, metadata.depositState='held').
 *   The webhook records a :BookingRelay; when the artist finishes onboarding we
 *   transfer (gross − fee) to them, and if the hold window lapses we refund.
 *
 * Either way tax is computed automatically (Stripe Tax) and Radar screens the
 * payment because the platform is merchant of record. We always return the
 * session url.
 */
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { stripe, stripeConfigured, platformFeeCents, CURRENCY } from '@/lib/stripe';
import { getArtistStripe } from '@/lib/artist-stripe';

export const runtime = 'nodejs';

type TattooSize = 'small' | 'medium' | 'large' | 'sleeve';

interface CheckoutPayload {
  artistId?: string;
  artistName: string;
  size: TattooSize;
  placement: string;
  date: string;
  time: string;
  budget: string;
  clientName: string;
  clientEmail: string;
  bookingId?: string;
}

const DEPOSIT_BY_SIZE: Record<TattooSize, number> = {
  small: 75,
  medium: 150,
  large: 300,
  sleeve: 500,
};

function getDepositAmount(size: string): number {
  const normalized = size?.toLowerCase() as TattooSize;
  return DEPOSIT_BY_SIZE[normalized] ?? DEPOSIT_BY_SIZE.medium;
}

function getBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  const origin = req.headers.get('origin');
  if (origin) {
    return origin.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  // The verified caller — used to bind the deposit to the booking's owner so a
  // client can't link their payment to someone else's booking record.
  const caller = await verifyFirebaseToken(req);
  const callerUid = caller?.uid ?? null;

  let body: Partial<CheckoutPayload>;
  try {
    body = (await req.json()) as Partial<CheckoutPayload>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { artistId, artistName, size, placement, date, time, budget, clientName, clientEmail, bookingId } = body;

  if (!artistName || !size || !placement || !date || !time || !budget || !clientName || !clientEmail) {
    return NextResponse.json({ error: 'Missing required booking details.' }, { status: 400 });
  }

  // Ownership guard: a client-supplied bookingId must belong to the caller (the
  // webhook later marks that exact doc deposit_paid, so an unverified id would
  // let one user flip another user's booking). If the booking record exists and
  // is owned by someone else or is no longer awaiting payment, refuse. A
  // MISSING doc is allowed through — the capture may have hit the file fallback
  // (Firestore down at book time); the webhook seeds/upserts it from metadata.
  if (bookingId) {
    const cred = ensureAdminApp();
    if (cred) {
      try {
        const { getFirestore } = await import('firebase-admin/firestore');
        const snap = await getFirestore().collection('booking_requests').doc(bookingId).get();
        if (snap.exists) {
          const booking = snap.data() as Record<string, unknown> | undefined;
          const ownerUid = booking?.uid ?? null;
          if (ownerUid && ownerUid !== callerUid) {
            return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
          }
          if (booking?.status && booking.status !== 'pending') {
            return NextResponse.json(
              { error: 'Booking is no longer awaiting a deposit.' },
              { status: 409 }
            );
          }
        }
      } catch (err) {
        // Fail-open on infra error — never block a legitimate checkout because
        // the ownership lookup itself failed. The webhook's own guards still apply.
        console.warn('[checkout] bookingId ownership check failed — allowing:', err instanceof Error ? err.message : err);
      }
    }
  }

  const depositAmount = getDepositAmount(size);
  const depositAmountInCents = depositAmount * 100;
  // Client-paid booking fee, added ON TOP of the deposit so the artist keeps
  // 100% of their rate. The client pays (deposit + fee); TatT keeps the fee.
  const bookingFeeInCents = platformFeeCents(depositAmountInCents);

  // ---- Demo mode: no real charge, fake success page (unchanged behavior). ----
  if (!stripeConfigured) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      return NextResponse.json({ error: 'Payments are not configured.' }, { status: 503 });
    }
    const demoParams = new URLSearchParams({
      demo: 'true',
      artist: artistName,
      size,
      placement,
      date,
      time,
      deposit: String(depositAmount),
    });
    // Carry bookingId here too so /book/success reconciles the exact booking in
    // demo mode (mirrors the live Stripe success_url path).
    if (bookingId) demoParams.set('bookingId', bookingId);
    return NextResponse.json({ demoMode: true, sessionUrl: `/book/success?${demoParams.toString()}` });
  }

  // ---- Resolve the artist and decide which money flow applies. ----
  if (!artistId) {
    return NextResponse.json({ error: 'artistId is required to route the deposit to an artist.' }, { status: 400 });
  }
  const artist = await getArtistStripe(artistId);
  if (!artist) {
    return NextResponse.json({ error: 'Artist not found.' }, { status: 404 });
  }
  // A "claimed" artist can receive funds directly (destination charge).
  // Otherwise we HOLD the deposit on the platform (held path below).
  const artistReady = Boolean(artist.stripeAccountId && artist.chargesEnabled);

  const baseUrl = getBaseUrl(req);
  const successParams = new URLSearchParams({
    session_id: '{CHECKOUT_SESSION_ID}',
    artist: artistName,
    size,
    placement,
    date,
    time,
    deposit: String(depositAmount),
  });
  // Carry the bookingId so /book/success can reconcile against the exact
  // booking record (server truth) rather than the caller's most-recent one.
  if (bookingId) successParams.set('bookingId', bookingId);
  const cancelUrl = artistId ? `${baseUrl}/book?artistId=${encodeURIComponent(artistId)}` : `${baseUrl}/book`;

  const metadata: Record<string, string> = {
    artistId,
    artistName,
    size,
    placement,
    date,
    time,
    budget,
    clientName,
    clientEmail,
    depositAmount: String(depositAmount),
    // The artist's share (100% of the deposit, in cents) and the platform's
    // booking fee (in cents). depositCents is what a held deposit transfers to
    // the artist on accept — the fee is never part of that transfer.
    depositCents: String(depositAmountInCents),
    bookingFeeCents: String(bookingFeeInCents),
    // 'held' tells the webhook to record a :BookingRelay instead of confirming a
    // routed booking. Overwritten to a real flag only on the held path below.
    depositState: artistReady ? 'routed' : 'held',
  };
  // Tie the Stripe session back to the booking_requests/{bookingId} record so
  // the webhook can reconcile a paid deposit. Only set when present — metadata
  // is Record<string,string> and must never carry undefined/empty values.
  if (bookingId) metadata.bookingId = bookingId;
  // The booking owner's uid — lets the webhook seed an owner-readable
  // booking_requests doc if the original capture only reached the file fallback.
  if (callerUid) metadata.clientUid = callerUid;

  try {
    // Two paths — in BOTH, the client pays (deposit + booking fee) and the
    // artist ends up with 100% of the deposit:
    //  - CLAIMED artist  → destination charge. application_fee_amount = the
    //    booking fee, transfer_data → artist, so the artist receives
    //    (total − fee) = the full deposit.
    //  - UNCLAIMED artist → held on the platform (no transfer/app fee now). The
    //    whole charge sits on the platform; transferHeldDeposits() later moves
    //    the full deposit (metadata.depositCents) to the artist and TatT keeps
    //    the fee, or refundRelay() returns everything on expiry.
    const payment_intent_data: Stripe.Checkout.SessionCreateParams.PaymentIntentData = artistReady
      ? {
          application_fee_amount: bookingFeeInCents,
          transfer_data: { destination: artist.stripeAccountId as string },
          metadata,
        }
      : {
          metadata,
        };

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        success_url: `${baseUrl}/book/success?${successParams.toString()}`,
        cancel_url: cancelUrl,
        customer_email: clientEmail,
        automatic_tax: { enabled: true },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: CURRENCY,
              unit_amount: depositAmountInCents,
              product_data: {
                name: `Tattoo Consultation Deposit — ${artistName}`,
                description: `${size} tattoo on ${placement}, ${date} at ${time}`,
              },
              // tax_behavior lets Stripe Tax reason about inclusive/exclusive pricing.
              tax_behavior: 'exclusive',
            },
          },
          {
            quantity: 1,
            price_data: {
              currency: CURRENCY,
              unit_amount: bookingFeeInCents,
              product_data: {
                name: 'TatT booking fee',
                description: 'Platform booking fee — the artist keeps 100% of the deposit.',
              },
              tax_behavior: 'exclusive',
            },
          },
        ],
        payment_intent_data,
        metadata,
      },
      bookingId ? { idempotencyKey: `booking-deposit:${bookingId}` } : undefined
    );

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 });
    }
    return NextResponse.json({ sessionUrl: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create checkout session.';
    console.error('Checkout session creation failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
