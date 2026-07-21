/**
 * Booking-deposit checkout — MARKETPLACE destination charge.
 *
 * The customer pays a deposit; the funds are routed to the ARTIST's connected
 * account, and TatT keeps an application fee. This is the correct marketplace
 * money flow (previously this route charged the platform directly and artists
 * never received anything).
 *
 *   customer pays $deposit
 *     ├─ application_fee_amount → TatT (platform)
 *     └─ remainder             → artist connected account (transfer_data.destination)
 *
 * Tax is computed automatically (Stripe Tax); Radar screens the payment
 * automatically because the platform is merchant of record.
 *
 * Prereq: the artist must have an onboarded connected account with charges
 * enabled. If not, we 409 — you cannot route money to an artist who can't
 * receive it yet.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
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

  let body: Partial<CheckoutPayload>;
  try {
    body = (await req.json()) as Partial<CheckoutPayload>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { artistId, artistName, size, placement, date, time, budget, clientName, clientEmail } = body;

  if (!artistName || !size || !placement || !date || !time || !budget || !clientName || !clientEmail) {
    return NextResponse.json({ error: 'Missing required booking details.' }, { status: 400 });
  }

  const depositAmount = getDepositAmount(size);
  const depositAmountInCents = depositAmount * 100;

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
    return NextResponse.json({ demoMode: true, sessionUrl: `/book/success?${demoParams.toString()}` });
  }

  // ---- Marketplace gate: the artist must be able to receive funds. ----
  if (!artistId) {
    return NextResponse.json({ error: 'artistId is required to route the deposit to an artist.' }, { status: 400 });
  }
  const artist = await getArtistStripe(artistId);
  if (!artist) {
    return NextResponse.json({ error: 'Artist not found.' }, { status: 404 });
  }
  if (!artist.stripeAccountId || !artist.chargesEnabled) {
    return NextResponse.json(
      {
        error: 'This artist has not finished setting up payments yet.',
        code: 'ARTIST_PAYMENTS_NOT_READY',
      },
      { status: 409 }
    );
  }

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
  };

  try {
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
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeCents(depositAmountInCents),
        transfer_data: { destination: artist.stripeAccountId },
        metadata,
      },
      metadata,
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
