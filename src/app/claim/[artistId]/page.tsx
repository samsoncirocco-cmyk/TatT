'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import StudioShell from '@/components/studio/StudioShell';
import QuietHeadline from '@/components/quiet/QuietHeadline';
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
    <StudioShell quiet>
      <div className="px-6 md:px-12 pt-8 pb-6 border-b hairline-quiet-soft">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[12px] text-quiet-dim tabular-nums font-body">
          <span>Claim profile</span>
          <span>Artist: {displayName}</span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-3xl mx-auto">
          <QuietHeadline>This is your profile</QuietHeadline>
          <p className="mt-8 text-[15px] text-quiet-dim font-body max-w-xl leading-[1.7]">
            Claim <span className="text-quiet">{displayName}</span> to collect the deposits
            clients have already paid and to get set up for payouts.
          </p>

          {heldCount > 0 && (
            <div className="mt-14 border hairline-quiet bg-black p-8">
              <div className="font-body text-[12px] text-quiet-dim">
                Held deposit waiting
              </div>
              <div className="mt-3 font-display-quiet text-quiet text-[40px] leading-none tabular-nums">
                {formatUsd(heldCents)}
              </div>
              <div className="mt-2 font-body text-[12px] text-quiet-dim">
                {heldCount} booking{heldCount === 1 ? '' : 's'} — released once Stripe clears your account.
              </div>
              {/* The money sentence (ADR-0033): who pays what, who keeps what. */}
              <p className="mt-4 font-body text-[13px] text-quiet leading-[1.7]">
                Clients paid this deposit plus our booking fee — the full deposit is
                yours; the fee is the only part TattTester keeps.
              </p>
            </div>
          )}

          {status && status.released.count > 0 && (
            <div className="mt-14 border hairline-quiet bg-black p-8">
              <div className="font-body text-[12px] text-quiet-dim">
                Deposits released
              </div>
              <div className="mt-3 font-display-quiet text-quiet text-[40px] leading-none tabular-nums">
                {formatUsd(status.released.amountCents)}
              </div>
              <div className="mt-2 font-body text-[12px] text-quiet-dim">
                Sent to your Stripe account across {status.released.count} booking
                {status.released.count === 1 ? '' : 's'}.
              </div>
            </div>
          )}

          <div className="mt-14">
            {!isAuthenticated && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void loginWithGoogle()}
                className="inline-flex items-center justify-center px-8 py-4 font-body text-[14px] leading-none press bg-quiet text-black hover:bg-white disabled:opacity-50"
              >
                Log in with Google to claim
              </button>
            )}

            {isAuthenticated && phase === 'working' && (
              <div className="font-body text-[13px] text-quiet-dim">
                Checking your payout status…
              </div>
            )}

            {phase === 'ready' && linkExpired && status?.state !== 'enabled' && (
              <div className="mb-8 border hairline-quiet bg-black p-5 font-body text-[13px] text-quiet-dim">
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
              <p className="mt-5 font-body text-[13px] text-pink">{error}</p>
            )}
            {/* The other ending to the same recognition moment: an artist who
                recognises the profile may want it gone, not run. See ADR 0025. */}
            <div className="mt-14 pt-10 border-t hairline-quiet-soft">
              <p className="font-body text-[13px] text-quiet-dim leading-[1.7]">
                This is your work but you never asked to be listed?{' '}
                <Link href={`/takedown/${encodeURIComponent(artistId)}`} className="text-quiet underline underline-offset-4 hover:text-white press">
                  Have it removed instead
                </Link>
                .
              </p>
            </div>

            {phase === 'error' && error && (
              <div className="border border-pink/60 bg-black p-6">
                <div className="font-body text-[13px] text-pink">Couldn&apos;t claim</div>
                <p className="mt-3 font-body text-[13px] text-quiet-dim">{error}</p>
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhase('idle');
                    }}
                    className="mt-5 inline-flex items-center px-6 py-3 border hairline-quiet text-quiet font-body text-[13px] hover:border-quiet hover:text-white press"
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
      className="mt-8 inline-flex items-center justify-center px-8 py-4 font-body text-[14px] leading-none press bg-quiet text-black hover:bg-white disabled:opacity-50"
    >
      {pending ? 'Opening Stripe…' : label}
    </button>
  );

  const recheckButton = (
    <button
      type="button"
      disabled={pending}
      onClick={onRecheck}
      className="mt-5 inline-flex items-center px-6 py-3 border hairline-quiet text-quiet font-body text-[13px] hover:border-quiet hover:text-white press disabled:opacity-50"
    >
      {pending ? 'Checking…' : 'Check again'}
    </button>
  );

  const footer = email ? (
    <div className="mt-8 font-body text-[12px] text-quiet-dim/80">
      Signed in as {email}
    </div>
  ) : null;

  if (status.state === 'enabled') {
    return (
      <div className="border hairline-quiet bg-black p-8">
        <div className="font-display-quiet text-quiet text-[20px] leading-none">Payouts are live.</div>
        <p className="mt-4 font-body text-[13px] text-quiet-dim leading-[1.7]">
          Stripe has cleared your account — deposits route straight to you from here on.
        </p>
        {!status.payoutsEnabled && (
          <p className="mt-4 font-body text-[13px] text-quiet-dim leading-[1.7]">
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
      <div className="border hairline-quiet bg-black p-8">
        <div className="font-display-quiet text-quiet text-[20px] leading-none">Stripe is reviewing you.</div>
        <p className="mt-4 font-body text-[13px] text-quiet-dim leading-[1.7]">
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
      <div className="border hairline-quiet bg-black p-8">
        <div className="font-display-quiet text-quiet text-[20px] leading-none">Stripe still needs a few things.</div>
        <p className="mt-4 font-body text-[13px] text-quiet-dim leading-[1.7]">
          You&apos;re not set up yet. Until these are done you can&apos;t be paid
          {heldPhrase ? `, and we can’t release ${heldPhrase}` : ''}.
        </p>
        {items.length > 0 && (
          <ul className="mt-5 space-y-2 font-body text-[13px] text-quiet">
            {items.map((item) => (
              <li key={item}>
                <span className="text-quiet-dim">—</span>&nbsp;&nbsp;{item}
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
      <div className="border hairline-quiet bg-black p-8">
        <div className="font-display-quiet text-quiet text-[20px] leading-none">No Stripe account yet.</div>
        <p className="mt-4 font-body text-[13px] text-quiet-dim leading-[1.7]">
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
    <div className="border hairline-quiet bg-black p-8">
      <div className="font-display-quiet text-quiet text-[20px] leading-none">
        You&apos;re claimed. Payouts aren&apos;t on yet.
      </div>
      <p className="mt-4 font-body text-[13px] text-quiet-dim leading-[1.7]">
        Stripe needs to verify your identity and bank details before any money can reach you. It
        takes a few minutes on their site, and you&apos;ll land back here when you&apos;re done
        {heldPhrase ? `. Finishing it is what unlocks ${heldPhrase}` : ''}.
      </p>
      {primaryButton('Set up payouts on Stripe')}
      {footer}
    </div>
  );
}
