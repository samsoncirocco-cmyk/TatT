/**
 * SaaS Billing — open the Stripe customer portal so an artist can manage their
 * subscription (update card, change plan, cancel). Requires the artist's Stripe
 * customer id (`cus_...`), which the billing webhook persists after their first
 * subscription checkout.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { stripe, stripeConfigured, STRIPE_NOT_CONFIGURED } from '@/lib/stripe';

export const runtime = 'nodejs';

function getBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.replace(/\/$/, '');
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  if (!stripeConfigured) {
    return NextResponse.json(STRIPE_NOT_CONFIGURED, { status: 503 });
  }

  let customerId: string | undefined;
  try {
    ({ customerId } = (await req.json()) as { customerId?: string });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required.' }, { status: 400 });
  }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getBaseUrl(req)}/dashboard`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to open billing portal.';
    console.error('[Billing] portal failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
