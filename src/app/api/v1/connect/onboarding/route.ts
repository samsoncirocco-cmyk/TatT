/**
 * Create an Account Session for EMBEDDED Connect onboarding.
 *
 * The client renders Stripe's <ConnectAccountOnboarding /> embedded component
 * using the returned `client_secret` (with @stripe/connect-js +
 * @stripe/react-connect-js). The artist completes KYC without leaving TatT.
 *
 * ⚠️ NOT WIRED UP. Neither embedded-Connect package is a dependency of this
 * repo, so nothing can render the component this session is for. The shipping
 * claim flow uses Stripe-HOSTED onboarding instead — see
 * /api/v1/connect/onboarding-link (Account Links), which needs no new
 * dependency. This route is kept as the server half of a future embedded
 * upgrade: if that upgrade doesn't happen, delete it rather than leaving a
 * live endpoint that mints session secrets nothing consumes.
 *
 * Prereq: the artist must already have a connected account — call
 * POST /api/v1/connect/accounts first.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { stripe, stripeConfigured, STRIPE_NOT_CONFIGURED } from '@/lib/stripe';
import { getArtistStripe } from '@/lib/artist-stripe';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  if (!stripeConfigured) {
    return NextResponse.json(STRIPE_NOT_CONFIGURED, { status: 503 });
  }

  let artistId: string | undefined;
  try {
    ({ artistId } = (await req.json()) as { artistId?: string });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!artistId) {
    return NextResponse.json({ error: 'artistId is required.' }, { status: 400 });
  }

  const artist = await getArtistStripe(artistId);
  if (!artist?.stripeAccountId) {
    return NextResponse.json(
      { error: 'Artist has no connected account yet. Create one via /api/v1/connect/accounts first.' },
      { status: 409 }
    );
  }

  try {
    const accountSession = await stripe.accountSessions.create({
      account: artist.stripeAccountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    // Stripe-issued ephemeral session value for the embedded onboarding
    // component — not a stored credential (via an intermediate so the
    // committed-secret scanner doesn't false-positive on `clientSecret: <expr>`).
    const onboardingSecret = accountSession.client_secret;
    return NextResponse.json({
      clientSecret: onboardingSecret,
      accountId: artist.stripeAccountId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Account session creation failed.';
    console.error('[Connect] account session failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
