/**
 * Shared Stripe client + platform config.
 *
 * TatT is a two-sided marketplace (Stripe Connect) with a separate SaaS
 * Billing lane. This module centralizes the server-side Stripe SDK client and
 * the platform economics so routes never hand-roll fetch/HMAC again.
 *
 * Money flows:
 *  1. Marketplace — customer pays an artist; funds are routed to the artist's
 *     connected account via a DESTINATION CHARGE, and TatT keeps an
 *     `application_fee_amount`. The PLATFORM is merchant of record and owns
 *     risk/liability (why Radar + platform-managed fraud matter here).
 *  2. SaaS Billing — TatT charges artists a subscription to run their business.
 *
 * Never import this in client components — it reads STRIPE_SECRET_KEY.
 */
import Stripe from 'stripe';
import { envInt, envString } from '@/config/envSchema';

const secretKey = envString('STRIPE_SECRET_KEY') ?? '';

/**
 * A key is a usable live/test key only if it is present and not one of the
 * placeholder sentinels the repo uses for demo mode. Callers gate on this so a
 * misconfigured deploy fails closed (503) instead of throwing at import time.
 */
export const stripeConfigured =
  !!secretKey && !secretKey.startsWith('sk_test_PLACEHOLDER') && !secretKey.startsWith('sk_PLACEHOLDER');

/**
 * Singleton Stripe client. We deliberately DON'T pass `apiVersion` so the SDK
 * uses the version it was built against (pinned by the `stripe` package), which
 * keeps the TypeScript types and runtime behavior in lockstep on upgrade.
 */
export const stripe = new Stripe(secretKey || 'sk_test_PLACEHOLDER_unconfigured', {
  appInfo: { name: 'TattTester', url: 'https://tatttester.com' },
  maxNetworkRetries: 2,
});

/**
 * Platform economics. TatT's take rate on marketplace transactions, in basis
 * points (bps). 1000 bps = 10%. Override per-env with PLATFORM_FEE_BPS.
 */
export const PLATFORM_FEE_BPS = envInt('PLATFORM_FEE_BPS') ?? 1000; // 10% default

/** Compute the platform's application fee (in cents) from a gross amount (in cents). */
export function platformFeeCents(grossCents: number): number {
  return Math.round((grossCents * PLATFORM_FEE_BPS) / 10_000);
}

export const CURRENCY = (envString('STRIPE_CURRENCY') ?? 'usd').toLowerCase();

/** Standard "not configured" response body for routes when Stripe is off. */
export const STRIPE_NOT_CONFIGURED = { error: 'Payments are not configured.', code: 'STRIPE_NOT_CONFIGURED' } as const;
