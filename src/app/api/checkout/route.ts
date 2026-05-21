import { NextRequest, NextResponse } from 'next/server';

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
  try {
    const body = (await req.json()) as Partial<CheckoutPayload>;
    const {
      artistId,
      artistName,
      size,
      placement,
      date,
      time,
      budget,
      clientName,
      clientEmail,
    } = body;

    if (!artistName || !size || !placement || !date || !time || !budget || !clientName || !clientEmail) {
      return NextResponse.json(
        { error: 'Missing required booking details.' },
        { status: 400 }
      );
    }

    const depositAmount = getDepositAmount(size);
    const depositAmountInCents = depositAmount * 100;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
    const demoStripeMode = stripeSecretKey.startsWith('sk_test_PLACEHOLDER') || !stripeSecretKey;

    if (demoStripeMode) {
      const demoParams = new URLSearchParams({
        demo: 'true',
        artist: artistName,
        size,
        placement,
        date,
        time,
        deposit: String(depositAmount),
      });
      return NextResponse.json({
        demoMode: true,
        sessionUrl: `/book/success?${demoParams.toString()}`,
      });
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

    const fallbackArtistPath = artistName.toLowerCase().replace(/\s+/g, '-');
    const cancelArtistId = artistId || fallbackArtistPath;

    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', `${baseUrl}/book/success?${successParams.toString()}`);
    form.set('cancel_url', `${baseUrl}/book/${encodeURIComponent(cancelArtistId)}`);

    form.set('line_items[0][price_data][currency]', 'usd');
    form.set('line_items[0][price_data][unit_amount]', String(depositAmountInCents));
    form.set(
      'line_items[0][price_data][product_data][name]',
      `Tattoo Consultation Deposit — ${artistName}`
    );
    form.set(
      'line_items[0][price_data][product_data][description]',
      `${size} tattoo on ${placement}, ${date} at ${time}`
    );
    form.set('line_items[0][quantity]', '1');

    form.set('metadata[artistId]', artistId || '');
    form.set('metadata[artistName]', artistName);
    form.set('metadata[size]', size);
    form.set('metadata[placement]', placement);
    form.set('metadata[date]', date);
    form.set('metadata[time]', time);
    form.set('metadata[budget]', budget);
    form.set('metadata[clientName]', clientName);
    form.set('metadata[clientEmail]', clientEmail);
    form.set('metadata[depositAmount]', String(depositAmount));

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const stripeJson = await stripeRes.json();
    if (!stripeRes.ok || !stripeJson?.url) {
      return NextResponse.json(
        { error: stripeJson?.error?.message || 'Failed to create Stripe Checkout session.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ sessionUrl: stripeJson.url });
  } catch (error) {
    console.error('Checkout session creation failed:', error);
    return NextResponse.json(
      { error: 'Unable to create checkout session.' },
      { status: 500 }
    );
  }
}
