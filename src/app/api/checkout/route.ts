/**
 * Booking-deposit checkout — two money flows depending on artist readiness.
 *
 * CLAIMED artist (has a connected account with charges enabled):
 *   MARKETPLACE destination charge — the deposit is routed to the artist's
 *   connected account and TatT keeps the client-paid booking fee as the
 *   application fee (ADR-0007: the fee rides ON TOP, so the artist nets 100%).
 *
 *   customer pays $deposit + $fee
 *     ├─ application_fee_amount = $fee → TatT (platform)
 *     └─ remainder             = $deposit → artist connected account (transfer_data.destination)
 *
 * UNCLAIMED artist (no connected account, or charges not enabled):
 *   HELD deposit — we can't route money to an artist who can't receive it, so
 *   the deposit is collected to the PLATFORM and HELD (a plain payment charge,
 *   NO transfer_data / application_fee_amount, metadata.depositState='held').
 *   The webhook records a :BookingRelay holding the DEPOSIT only; when the
 *   artist finishes onboarding we transfer that full deposit to them (TatT
 *   keeps the fee), and if the hold window lapses we refund the customer.
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
import { depositCentsForSize, type TattooSize } from '@/lib/booking';

export const runtime = 'nodejs';

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
  /**
   * Set on the reservation path only. Names the exclusive hold this payment is
   * for; absent means the request model, where nothing is reserved.
   */
  holdId?: string;
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

  const { artistId, artistName, size, placement, date, time, budget, clientName, clientEmail, bookingId, holdId } = body;

  if (!artistName || !size || !placement || !date || !time || !budget || !clientName || !clientEmail) {
    return NextResponse.json({ error: 'Missing required booking details.' }, { status: 400 });
  }

  // Ownership guard: a client-supplied bookingId must belong to the caller (the
  // webhook later marks that exact doc deposit_paid, so an unverified id would
  // let one user flip another user's booking). If the booking record exists and
  // is owned by someone else, refuse. A MISSING doc is allowed through — the
  // capture may have hit the file fallback (Firestore down at book time); the
  // webhook seeds/upserts it from metadata in that case.
  if (bookingId) {
    const cred = ensureAdminApp();
    if (cred) {
      try {
        const { getFirestore } = await import('firebase-admin/firestore');
        const snap = await getFirestore().collection('booking_requests').doc(bookingId).get();
        if (snap.exists) {
          const ownerUid = (snap.data() as Record<string, unknown> | undefined)?.uid ?? null;
          if (ownerUid && ownerUid !== callerUid) {
            return NextResponse.json({ error: 'Booking does not belong to you.' }, { status: 403 });
          }
        }
      } catch (err) {
        // Fail-open on infra error — never block a legitimate checkout because
        // the ownership lookup itself failed. The webhook's own guards still apply.
        console.warn('[checkout] bookingId ownership check failed — allowing:', err instanceof Error ? err.message : err);
      }
    }
  }

  // ---- Reservation path: the payment must be backed by a live hold. ----
  //
  // The hold is REFRESHED here rather than merely read, because the session's
  // `expires_at` is pinned to the hold's expiry and Stripe rejects an
  // `expires_at` under 30 minutes out. Refreshing restores the full window, so
  // a client who spent ten minutes on the details form still gets a valid
  // session — and the session can never outlive the reservation behind it,
  // which is what stops money arriving for a slot we no longer hold.
  let holdExpiresAtMs: number | null = null;
  let activeHoldId = holdId;
  if (holdId) {
    const { getHold, placeHold } = await import('@/lib/booking-holds-persistence');
    const hold = await getHold(holdId);
    if (!hold || hold.status !== 'active') {
      return NextResponse.json(
        { error: 'That time is no longer held. Pick another.', code: 'HOLD_LOST' },
        { status: 409 }
      );
    }
    // A hold belongs to exactly one booking. Paying against someone else's is
    // how one client's deposit confirms another client's slot.
    if (bookingId && hold.bookingId !== bookingId) {
      return NextResponse.json({ error: 'That hold is not for this booking.' }, { status: 403 });
    }
    const refreshed = await placeHold({
      artistId: hold.artistId,
      bookingId: hold.bookingId,
      slot: {
        date: hold.date,
        startTime: hold.startTime,
        endTime: hold.endTime,
        timezone: hold.timezone,
      },
    });
    if (!refreshed.ok) {
      return NextResponse.json(
        { error: 'That time is no longer available.', code: 'HOLD_LOST' },
        { status: 409 }
      );
    }
    activeHoldId = refreshed.hold.holdId;
    holdExpiresAtMs = Date.parse(refreshed.hold.expiresAt);
  }

  // Cents is the source of truth; the dollars value below exists only for the
  // human-readable metadata and the demo-mode success URL.
  const depositAmountInCents = depositCentsForSize(size);
  const depositAmount = depositAmountInCents / 100;
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
  const artistReady = Boolean(
    artist.claimVerified && artist.stripeAccountId && artist.chargesEnabled,
  );

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
  // The webhook needs this to convert the hold on payment, or to refund when
  // `resolvePaidHold` says the reservation was already lost.
  if (activeHoldId) metadata.holdId = activeHoldId;
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

    const session = await stripe.checkout.sessions.create({
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
      // Stripe stops accepting payment for this session the moment the hold
      // lapses. This is the load-bearing half of the reservation: without it a
      // client could pay twenty minutes after their slot went back on sale.
      ...(holdExpiresAtMs
        ? { expires_at: Math.floor(holdExpiresAtMs / 1000) }
        : {}),
    });

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
