'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import StudioShell from '@/components/studio/StudioShell';
import { useAuth } from '@/hooks/useAuth';

type ClaimResult = {
  claimed: boolean;
  artistId: string;
  name: string | null;
  hasConnectedAccount: boolean;
  chargesEnabled: boolean;
  pendingDeposit: { count: number; amountCents: number };
};

type Phase = 'idle' | 'claiming' | 'claimed' | 'onboarding' | 'ready' | 'error';

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function ClaimArtistPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = use(params);
  const { user, isAuthenticated, loading, loginWithGoogle, getIdToken } = useAuth();

  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authedFetch = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      const token = await getIdToken();
      if (!token) throw new Error('Not signed in.');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error((data.error as string) || `Request failed (${res.status}).`);
      return data;
    },
    [getIdToken],
  );

  const runClaim = useCallback(async () => {
    setPhase('claiming');
    setError(null);
    try {
      const claim = (await authedFetch('/api/v1/connect/claim', { artistId })) as unknown as ClaimResult;
      setResult(claim);
      setPhase('claimed');

      // Hand off to embedded onboarding: ensure a connected account exists, then
      // mint an account-onboarding session. Both calls are idempotent server-side.
      setPhase('onboarding');
      await authedFetch('/api/v1/connect/accounts', { artistId, email: user?.email ?? undefined });
      const session = await authedFetch('/api/v1/connect/onboarding', { artistId });
      if (!session.clientSecret) throw new Error('Onboarding session did not return a client secret.');
      setPhase('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setPhase('error');
    }
  }, [artistId, authedFetch, user?.email]);

  // Once signed in, kick off the claim automatically (unless already underway).
  useEffect(() => {
    if (isAuthenticated && phase === 'idle') {
      void runClaim();
    }
  }, [isAuthenticated, phase, runClaim]);

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Claim Profile
          </span>
          <span>
            Artist:&nbsp;<span className="text-pink">{result?.name ?? artistId}</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-white text-[40px] md:text-[72px] leading-[0.9] tracking-[0.005em]">
            This is&nbsp;<span className="slash"><span>your</span></span> profile
            <span className="text-pink">.</span>
          </h1>
          <p className="mt-6 text-[15px] text-white/70 font-body max-w-xl leading-[1.55]">
            Claim <span className="text-white">{result?.name ?? artistId}</span> to collect the deposits
            clients have already paid and to get set up for payouts.
          </p>

          {result && result.pendingDeposit.count > 0 && (
            <div className="mt-10 border-2 border-pink bg-black p-6">
              <div className="font-body text-[10px] uppercase tracking-[0.25em] text-white/50">
                Held deposit waiting
              </div>
              <div className="mt-2 font-display text-white text-[48px] leading-none tabular-nums">
                {formatUsd(result.pendingDeposit.amountCents)}
              </div>
              <div className="mt-1 font-body text-[12px] text-white/60">
                {result.pendingDeposit.count} booking{result.pendingDeposit.count === 1 ? '' : 's'} — released once you finish onboarding.
              </div>
            </div>
          )}

          <div className="mt-12">
            {!isAuthenticated && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void loginWithGoogle()}
                className="inline-flex items-center justify-center px-8 py-4 font-display text-[20px] leading-none tracking-[0.02em] press tape disabled:opacity-50"
              >
                Log in with Google to claim
                <span className="ml-2 text-[14px]">▸</span>
              </button>
            )}

            {isAuthenticated && (phase === 'claiming' || phase === 'claimed' || phase === 'onboarding') && (
              <div className="font-body text-[12px] uppercase tracking-[0.28em] text-white/60">
                <span className="text-pink">●</span>&nbsp;&nbsp;
                {phase === 'claiming' ? 'Claiming profile…' : 'Setting up payouts…'}
              </div>
            )}

            {phase === 'ready' && (
              <div className="border-2 hairline bg-black p-6">
                <div className="font-display text-white text-[24px] leading-none">You&apos;re claimed.</div>
                <p className="mt-3 font-body text-[13px] text-white/70 leading-[1.55]">
                  Your Stripe account and onboarding session are ready. Finish verifying your identity and
                  bank details to unlock payouts
                  {result && result.pendingDeposit.count > 0
                    ? ` and release your ${formatUsd(result.pendingDeposit.amountCents)} in held deposits`
                    : ''}
                  .
                </p>
                <div className="mt-2 font-body text-[10px] uppercase tracking-[0.25em] text-white/40">
                  Signed in as {user?.email}
                </div>
              </div>
            )}

            {/* The other ending to the same recognition moment: an artist who
                recognises the profile may want it gone, not run. See ADR 0025. */}
            <div className="mt-10 pt-8 border-t hairline">
              <p className="font-body text-[13px] text-white/50 leading-[1.55]">
                This is your work but you never asked to be listed?{' '}
                <Link href={`/takedown/${encodeURIComponent(artistId)}`} className="text-pink press">
                  Have it removed instead
                </Link>
                .
              </p>
            </div>

            {phase === 'error' && error && (
              <div className="border-2 border-pink bg-black p-6">
                <div className="font-body text-[12px] uppercase tracking-[0.25em] text-pink">Couldn&apos;t claim</div>
                <p className="mt-2 font-body text-[13px] text-white/70">{error}</p>
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhase('idle');
                    }}
                    className="mt-4 inline-flex items-center px-6 py-3 border-2 hairline text-white font-display text-[16px] hover:bg-pink hover:border-pink hover:text-black press"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
