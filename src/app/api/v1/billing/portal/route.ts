/**
 * SaaS Billing — open the Stripe customer portal so an artist can manage their
 * subscription (update card, change plan, cancel). The Stripe customer id
 * (`cus_...`) is derived server-side from the caller's own claimed artist
 * profile — never taken from the request body, so there is nothing for a
 * client to spoof to reach another customer's portal session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { stripe, stripeConfigured, STRIPE_NOT_CONFIGURED } from '@/lib/stripe';
import { getArtistStripeCustomerId } from '@/lib/artist-stripe';

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

  const user = await verifyFirebaseToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const customerId = await getArtistStripeCustomerId(user.uid);
  if (!customerId) {
    return NextResponse.json(
      { error: 'No billing account found for this user.', code: 'NO_BILLING_CUSTOMER' },
      { status: 404 }
    );
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
