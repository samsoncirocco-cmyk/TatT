'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import StudioShell from '@/components/studio/StudioShell';
import { useAuth } from '@/hooks/useAuth';
import {
  formatRequirements,
  type ConnectOnboardingState,
} from '@/lib/connect-status';

type ClaimResult = {
  claimed: boolean;
  artistId: string;
  name: string | null;
  hasConnectedAccount: boolean;
  chargesEnabled: boolean;
  pendingDeposit: { count: number; amountCents: number };
};

type OnboardingStatus = {
  state: ConnectOnboardingState;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
  disabledReason: string | null;
  artistName: string | null;
  heldDeposit: { count: number; amountCents: number };
  released: { count: number; amountCents: number };
};

/** 'working' covers claim + account + status; the rest are terminal renders. */
type Phase = 'idle' | 'working' | 'ready' | 'error';

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function ClaimArtistPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = use(params);
  const { user, isAuthenticated, loading, loginWithGoogle, getIdToken } = useAuth();

  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkPending, setLinkPending] = useState(false);
  // Set when Stripe bounced the artist back on an expired/used Account Link.
  const [linkExpired, setLinkExpired] = useState(false);

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

  // Read the redirect marker Stripe appended (?onboarding=return|refresh).
  // Done off window rather than useSearchParams so the page needs no Suspense
  // boundary at build time.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const marker = new URLSearchParams(window.location.search).get('onboarding');
    if (marker === 'refresh') setLinkExpired(true);
  }, []);

  const refreshStatus = useCallback(async () => {
    const next = (await authedFetch('/api/v1/connect/status', { artistId })) as unknown as OnboardingStatus;
    setStatus(next);
    return next;
  }, [artistId, authedFetch]);

  const runClaim = useCallback(async () => {
    setPhase('working');
    setError(null);
    try {
      const claim = (await authedFetch('/api/v1/connect/claim', { artistId })) as unknown as ClaimResult;
      setResult(claim);

      // Make sure a connected account exists, then read its REAL state from
      // Stripe. Both calls are idempotent server-side.
      await authedFetch('/api/v1/connect/accounts', { artistId, email: user?.email ?? undefined });
      await refreshStatus();
      setPhase('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setPhase('error');
    }
  }, [artistId, authedFetch, refreshStatus, user?.email]);

  // Once signed in, kick off the claim automatically (unless already underway).
  useEffect(() => {
    if (isAuthenticated && phase === 'idle') {
      void runClaim();
    }
  }, [isAuthenticated, phase, runClaim]);

  /** Mint a fresh single-use Account Link and hand the artist to Stripe. */
  const startOnboarding = useCallback(async () => {
    setLinkPending(true);
    setError(null);
    try {
      const link = (await authedFetch('/api/v1/connect/onboarding-link', { artistId })) as { url?: string };
      if (!link.url) throw new Error('Stripe did not return an onboarding link.');
      window.location.href = link.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open Stripe onboarding.');
      setLinkPending(false);
    }
  }, [artistId, authedFetch]);

  /** Re-read the live account — used after a return redirect or a review wait. */
  const recheck = useCallback(async () => {
    setLinkPending(true);
    setError(null);
    try {
      await refreshStatus();
      setLinkExpired(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh your status.');
    } finally {
      setLinkPending(false);
    }
  }, [refreshStatus]);

  const heldCount = status?.heldDeposit.count ?? result?.pendingDeposit.count ?? 0;
  const heldCents = status?.heldDeposit.amountCents ?? result?.pendingDeposit.amountCents ?? 0;
  const displayName = status?.artistName ?? result?.name ?? artistId;

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Claim Profile
          </span>
          <span>
            Artist:&nbsp;<span className="text-pink">{displayName}</span>
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
            Claim <span className="text-white">{displayName}</span> to collect the deposits
            clients have already paid and to get set up for payouts.
          </p>

          {heldCount > 0 && (
            <div className="mt-10 border-2 border-pink bg-black p-6">
              <div className="font-body text-[10px] uppercase tracking-[0.25em] text-white/50">
                Held deposit waiting
              </div>
              <div className="mt-2 font-display text-white text-[48px] leading-none tabular-nums">
                {formatUsd(heldCents)}
              </div>
              <div className="mt-1 font-body text-[12px] text-white/60">
                {heldCount} booking{heldCount === 1 ? '' : 's'} — released once Stripe clears your account.
              </div>
            </div>
          )}

          {status && status.released.count > 0 && (
            <div className="mt-10 border-2 border-pink bg-black p-6">
              <div className="font-body text-[10px] uppercase tracking-[0.25em] text-pink">
                Deposits released
              </div>
              <div className="mt-2 font-display text-white text-[48px] leading-none tabular-nums">
                {formatUsd(status.released.amountCents)}
              </div>
              <div className="mt-1 font-body text-[12px] text-white/60">
                Sent to your Stripe account across {status.released.count} booking
                {status.released.count === 1 ? '' : 's'}.
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

            {isAuthenticated && phase === 'working' && (
              <div className="font-body text-[12px] uppercase tracking-[0.28em] text-white/60">
                <span className="text-pink">●</span>&nbsp;&nbsp;Checking your payout status…
              </div>
            )}

            {phase === 'ready' && linkExpired && status?.state !== 'enabled' && (
              <div className="mb-6 border-2 border-pink bg-black p-4 font-body text-[13px] text-white/70">
                That Stripe setup link had already been used or expired — they&apos;re single-use.
                Start a fresh one below.
              </div>
            )}

            {phase === 'ready' && status && (
              <OnboardingPanel
                status={status}
                heldCents={heldCents}
                heldCount={heldCount}
                pending={linkPending}
                email={user?.email ?? null}
                onStart={() => void startOnboarding()}
                onRecheck={() => void recheck()}
              />
            )}

            {phase === 'ready' && error && (
              <p className="mt-4 font-body text-[13px] text-pink">{error}</p>
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

/**
 * The honest-status panel. Every branch below is a state Stripe can actually
 * leave an artist in — only `enabled` (charges_enabled === true) is allowed to
 * claim the artist is set up, because that is the only state in which a held
 * deposit can move.
 */
function OnboardingPanel({
  status,
  heldCents,
  heldCount,
  pending,
  email,
  onStart,
  onRecheck,
}: {
  status: OnboardingStatus;
  heldCents: number;
  heldCount: number;
  pending: boolean;
  email: string | null;
  onStart: () => void;
  onRecheck: () => void;
}) {
  /** "your $150 in held deposits", or null when nothing is being held. */
  const heldPhrase = heldCount > 0 ? `your ${formatUsd(heldCents)} in held deposits` : null;

  const primaryButton = (label: string) => (
    <button
      type="button"
      disabled={pending}
      onClick={onStart}
      className="mt-6 inline-flex items-center justify-center px-8 py-4 font-display text-[20px] leading-none tracking-[0.02em] press tape disabled:opacity-50"
    >
      {pending ? 'Opening Stripe…' : label}
      <span className="ml-2 text-[14px]">▸</span>
    </button>
  );

  const recheckButton = (
    <button
      type="button"
      disabled={pending}
      onClick={onRecheck}
      className="mt-4 inline-flex items-center px-6 py-3 border-2 hairline text-white font-display text-[16px] hover:bg-pink hover:border-pink hover:text-black press disabled:opacity-50"
    >
      {pending ? 'Checking…' : 'Check again'}
    </button>
  );

  const footer = email ? (
    <div className="mt-6 font-body text-[10px] uppercase tracking-[0.25em] text-white/40">
      Signed in as {email}
    </div>
  ) : null;

  if (status.state === 'enabled') {
    return (
      <div className="border-2 hairline bg-black p-6">
        <div className="font-display text-white text-[24px] leading-none">Payouts are live.</div>
        <p className="mt-3 font-body text-[13px] text-white/70 leading-[1.55]">
          Stripe has cleared your account — deposits route straight to you from here on.
        </p>
        {!status.payoutsEnabled && (
          <p className="mt-3 font-body text-[13px] text-white/60 leading-[1.55]">
            Bank transfers are still switching on. You can take payments now; Stripe will pay them
            out as soon as your bank details clear.
          </p>
        )}
        {footer}
      </div>
    );
  }

  if (status.state === 'pending_verification') {
    return (
      <div className="border-2 hairline bg-black p-6">
        <div className="font-display text-white text-[24px] leading-none">Stripe is reviewing you.</div>
        <p className="mt-3 font-body text-[13px] text-white/70 leading-[1.55]">
          You&apos;ve sent Stripe everything they asked for. Nothing is needed from you — reviews
          usually finish within a day. Payouts stay off until they clear you
          {heldPhrase ? `, and ${heldPhrase} stays held until then` : ''}.
        </p>
        {recheckButton}
        {footer}
      </div>
    );
  }

  if (status.state === 'requirements_due') {
    const items = formatRequirements(status.requirementsDue);
    return (
      <div className="border-2 border-pink bg-black p-6">
        <div className="font-display text-white text-[24px] leading-none">Stripe still needs a few things.</div>
        <p className="mt-3 font-body text-[13px] text-white/70 leading-[1.55]">
          You&apos;re not set up yet. Until these are done you can&apos;t be paid
          {heldPhrase ? `, and we can’t release ${heldPhrase}` : ''}.
        </p>
        {items.length > 0 && (
          <ul className="mt-4 space-y-1 font-body text-[13px] text-white/80">
            {items.map((item) => (
              <li key={item}>
                <span className="text-pink">—</span>&nbsp;&nbsp;{item}
              </li>
            ))}
          </ul>
        )}
        {primaryButton('Finish setup on Stripe')}
        {recheckButton}
        {footer}
      </div>
    );
  }

  if (status.state === 'no_account') {
    return (
      <div className="border-2 border-pink bg-black p-6">
        <div className="font-display text-white text-[24px] leading-none">No Stripe account yet.</div>
        <p className="mt-3 font-body text-[13px] text-white/70 leading-[1.55]">
          We couldn&apos;t set up your Stripe account, so payouts can&apos;t be turned on. Try again —
          if it keeps failing, tell us and we&apos;ll sort it before your hold window runs out.
        </p>
        {recheckButton}
        {footer}
      </div>
    );
  }

  // not_started
  return (
    <div className="border-2 hairline bg-black p-6">
      <div className="font-display text-white text-[24px] leading-none">
        You&apos;re claimed. Payouts aren&apos;t on yet.
      </div>
      <p className="mt-3 font-body text-[13px] text-white/70 leading-[1.55]">
        Stripe needs to verify your identity and bank details before any money can reach you. It
        takes a few minutes on their site, and you&apos;ll land back here when you&apos;re done
        {heldPhrase ? `. Finishing it is what unlocks ${heldPhrase}` : ''}.
      </p>
      {primaryButton('Set up payouts on Stripe')}
      {footer}
    </div>
  );
}
