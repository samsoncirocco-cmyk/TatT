'use client';

/**
 * The artist console — the minimal artist home TAT-38 asked for (ADR 0031).
 *
 * Three panels, nothing speculative: the booking inbox (which finally surfaces
 * each booking's statusHistory — TAT-24), a pointer to the availability
 * editor, and payout status via Stripe Connect. No analytics, no CRM — those
 * are the paid rung, deferred.
 *
 * Lives at /console because /dashboard is (and stays) the consumer redirect
 * to /designs. Identity is server-resolved: the page asks /api/v1/artist/me
 * "which artist am I?" and every API it calls re-verifies the Firebase token
 * against claimedByUid — no artistId in this file is trusted by the server.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import StudioShell from '@/components/studio/StudioShell';
import QuietHeadline from '@/components/quiet/QuietHeadline';
import { useAuth } from '@/hooks/useAuth';
import type { BookingStatus, BookingStatusEvent, RequestedSlot } from '@/lib/booking';

type ConsoleArtist = {
  id: string;
  name: string | null;
  hasConnectedAccount: boolean;
  chargesEnabled: boolean;
};

type ArtistBooking = {
  id: string;
  bookingId?: string;
  clientName?: string;
  clientEmail?: string;
  description?: string;
  budget?: string;
  status?: BookingStatus;
  createdAt?: string;
  requestedSlots?: RequestedSlot[];
  statusHistory?: BookingStatusEvent[];
};

type PayoutStatus = {
  state: 'enabled' | 'pending_verification' | 'requirements_due' | 'no_account' | 'not_started';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  heldDeposit: { count: number; amountCents: number };
};

/** Artist-facing copy per booking lifecycle state — see src/lib/booking.ts. */
const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Awaiting deposit',
  held: 'Slot held',
  deposit_paid: 'Deposit paid',
  confirmed: 'Confirmed',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  expired: 'Expired',
};

const PAYOUT_STATE_COPY: Record<PayoutStatus['state'], { title: string; body: string }> = {
  enabled: {
    title: 'Payouts are live.',
    body: 'Stripe has cleared your account — deposits route straight to you.',
  },
  pending_verification: {
    title: 'Stripe is reviewing you.',
    body: 'Nothing is needed from you — reviews usually finish within a day.',
  },
  requirements_due: {
    title: 'Stripe still needs a few things.',
    body: 'Until these are done you can’t be paid. Finish setup to unlock payouts.',
  },
  no_account: {
    title: 'No Stripe account yet.',
    body: 'Payouts can’t be turned on until your Stripe account exists.',
  },
  not_started: {
    title: 'Payouts aren’t on yet.',
    body: 'Stripe needs to verify your identity and bank details before money can reach you.',
  },
};

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ConsolePage() {
  const { user, isAuthenticated, loading, loginWithGoogle, getIdToken } = useAuth();

  // undefined = not asked yet, null = signed-in user with no claimed profile.
  const [artist, setArtist] = useState<ConsoleArtist | null | undefined>(undefined);
  const [bookings, setBookings] = useState<ArtistBooking[] | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [payout, setPayout] = useState<PayoutStatus | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payoutLinkPending, setPayoutLinkPending] = useState(false);

  const authedFetch = useCallback(
    async (url: string, body?: Record<string, unknown>) => {
      const token = await getIdToken();
      if (!token) throw new Error('Not signed in.');
      const res = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error((data.error as string) || `Request failed (${res.status}).`);
      return data;
    },
    [getIdToken],
  );

  // Step 1 — who am I? Server-resolved from the verified token.
  useEffect(() => {
    if (!isAuthenticated || artist !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await authedFetch('/api/v1/artist/me');
        if (!cancelled) setArtist((data.artist as ConsoleArtist | null) ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, artist, authedFetch]);

  // Step 2 — once we know the artist, load the inbox and payout status.
  // Independent fetches, independent failures: a Stripe hiccup must not
  // blank the booking list, and vice versa.
  useEffect(() => {
    if (!artist) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await authedFetch('/api/v1/artist/bookings');
        if (!cancelled) setBookings((data.bookings as ArtistBooking[]) ?? []);
      } catch (err) {
        if (!cancelled) {
          setBookingsError(err instanceof Error ? err.message : 'Could not load bookings.');
        }
      }
    })();
    (async () => {
      try {
        const data = await authedFetch('/api/v1/connect/status', { artistId: artist.id });
        if (!cancelled) setPayout(data as unknown as PayoutStatus);
      } catch (err) {
        if (!cancelled) {
          setPayoutError(err instanceof Error ? err.message : 'Could not load payout status.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artist, authedFetch]);

  /** Mint a one-time Stripe Express dashboard link and go there. */
  const openStripeDashboard = useCallback(async () => {
    if (!artist) return;
    setPayoutLinkPending(true);
    setPayoutError(null);
    try {
      const link = (await authedFetch('/api/v1/connect/login-link', { artistId: artist.id })) as {
        url?: string;
      };
      if (!link.url) throw new Error('Stripe did not return a dashboard link.');
      window.location.href = link.url;
    } catch (err) {
      setPayoutError(err instanceof Error ? err.message : 'Could not open the Stripe dashboard.');
      setPayoutLinkPending(false);
    }
  }, [artist, authedFetch]);

  const displayName = artist?.name ?? artist?.id ?? '';

  return (
    <StudioShell quiet>
      <div className="px-6 md:px-12 pt-8 pb-6 border-b hairline-quiet-soft">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[12px] text-quiet-dim tabular-nums font-body">
          <span>Artist console</span>
          {artist && (
            <span>Artist: {displayName}</span>
          )}
        </div>
      </div>

      <div className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-4xl mx-auto">
          {/* ── Signed out ─────────────────────────────────────────── */}
          {!loading && !isAuthenticated && (
            <div>
              <QuietHeadline>Your studio desk</QuietHeadline>
              <p className="mt-8 text-[15px] text-quiet-dim font-body max-w-xl leading-[1.7]">
                Bookings, availability and payouts — sign in to see yours.
              </p>
              <button
                type="button"
                onClick={() => void loginWithGoogle()}
                className="mt-12 inline-flex items-center justify-center px-8 py-4 font-body text-[14px] leading-none press bg-quiet text-black hover:bg-white"
              >
                Log in with Google
              </button>
            </div>
          )}

          {/* ── Resolving ──────────────────────────────────────────── */}
          {(loading || (isAuthenticated && artist === undefined && !error)) && (
            <div className="font-body text-[13px] text-quiet-dim">
              Loading your console…
            </div>
          )}

          {isAuthenticated && error && (
            <div className="border border-pink/60 bg-black p-6">
              <div className="font-body text-[13px] text-pink">
                Couldn&apos;t load your console
              </div>
              <p className="mt-3 font-body text-[13px] text-quiet-dim">{error}</p>
            </div>
          )}

          {/* ── Signed in, no claimed profile ──────────────────────── */}
          {isAuthenticated && artist === null && (
            <div>
              <QuietHeadline>No profile yet</QuietHeadline>
              <p className="mt-8 text-[15px] text-quiet-dim font-body max-w-xl leading-[1.7]">
                The console is for artists who have claimed their TattTester profile. You may already be
                listed — clients can book and leave deposits before you sign up.
              </p>
              <Link
                href="/claim"
                className="mt-12 inline-flex items-center justify-center px-8 py-4 font-body text-[14px] leading-none press bg-quiet text-black hover:bg-white"
              >
                Claim your profile
              </Link>
              <p className="mt-10 font-body text-[13px] text-quiet-dim">
                Just here for designs?{' '}
                <Link href="/designs" className="text-quiet underline underline-offset-4 hover:text-white">
                  Your design library
                </Link>
                .
              </p>
            </div>
          )}

          {/* ── The console proper ─────────────────────────────────── */}
          {artist && (
            <div>
              <QuietHeadline>{displayName}</QuietHeadline>

              <div className="mt-16 grid md:grid-cols-2 gap-8">
                {/* Payouts */}
                <section
                  aria-label="Payouts"
                  className="border hairline-quiet bg-black p-8"
                >
                  <div className="font-body text-[12px] text-quiet-dim">
                    Payouts
                  </div>
                  {!payout && !payoutError && (
                    <div className="mt-4 font-body text-[13px] text-quiet-dim">
                      Checking with Stripe…
                    </div>
                  )}
                  {payout && (
                    <>
                      <div className="mt-3 font-display-quiet text-quiet text-[20px] leading-none">
                        {PAYOUT_STATE_COPY[payout.state]?.title ?? 'Payout status unknown.'}
                      </div>
                      <p className="mt-4 font-body text-[13px] text-quiet-dim leading-[1.7]">
                        {PAYOUT_STATE_COPY[payout.state]?.body ?? ''}
                      </p>
                      {payout.heldDeposit.count > 0 && (
                        <p className="mt-4 font-body text-[13px] text-quiet-dim">
                          <span className="text-quiet tabular-nums">
                            {formatUsd(payout.heldDeposit.amountCents)}
                          </span>{' '}
                          in deposits held for you across {payout.heldDeposit.count} booking
                          {payout.heldDeposit.count === 1 ? '' : 's'}.
                        </p>
                      )}
                      {payout.state === 'enabled' ? (
                        <button
                          type="button"
                          disabled={payoutLinkPending}
                          onClick={() => void openStripeDashboard()}
                          className="mt-6 inline-flex items-center px-6 py-3 border hairline-quiet text-quiet font-body text-[13px] hover:border-quiet hover:text-white press disabled:opacity-50"
                        >
                          {payoutLinkPending ? 'Opening Stripe…' : 'Manage payouts'}
                        </button>
                      ) : (
                        <Link
                          href={`/claim/${encodeURIComponent(artist.id)}`}
                          className="mt-6 inline-flex items-center px-6 py-3 bg-quiet text-black font-body text-[13px] hover:bg-white press"
                        >
                          Finish payout setup
                        </Link>
                      )}
                    </>
                  )}
                  {payoutError && (
                    <p className="mt-4 font-body text-[13px] text-pink">{payoutError}</p>
                  )}
                  {/* The money sentence (ADR-0033): who pays what, who keeps what. */}
                  <p className="mt-6 pt-6 border-t hairline-quiet-soft font-body text-[13px] text-quiet leading-[1.7]">
                    Clients pay your deposit plus TattTester&apos;s booking fee — you keep
                    100% of every deposit; the fee is the only part we take.
                  </p>
                </section>

                {/* Availability */}
                <section aria-label="Availability" className="border hairline-quiet bg-black p-8">
                  <div className="font-body text-[12px] text-quiet-dim">
                    Availability
                  </div>
                  <div className="mt-3 font-display-quiet text-quiet text-[20px] leading-none">
                    Your hours, your calendar.
                  </div>
                  <p className="mt-4 font-body text-[13px] text-quiet-dim leading-[1.7]">
                    Declare the hours you give TattTester, and optionally connect Google Calendar so busy
                    times are subtracted automatically.
                  </p>
                  <Link
                    href={`/artist/${encodeURIComponent(artist.id)}/availability`}
                    className="mt-6 inline-flex items-center px-6 py-3 border hairline-quiet text-quiet font-body text-[13px] hover:border-quiet hover:text-white press"
                  >
                    Edit availability
                  </Link>
                </section>
              </div>

              {/* Bookings */}
              <section aria-label="Bookings" className="mt-8 border hairline-quiet bg-black p-8">
                <div className="font-body text-[12px] text-quiet-dim">
                  Bookings
                </div>

                {!bookings && !bookingsError && (
                  <div className="mt-4 font-body text-[13px] text-quiet-dim">
                    Loading bookings…
                  </div>
                )}
                {bookingsError && (
                  <p className="mt-4 font-body text-[13px] text-pink">{bookingsError}</p>
                )}
                {bookings && bookings.length === 0 && (
                  <p className="mt-4 font-body text-[13px] text-quiet-dim">
                    No booking requests yet. When a client books you, it lands here.
                  </p>
                )}

                {bookings && bookings.length > 0 && (
                  <ul className="mt-6 divide-y divide-white/10">
                    {bookings.map((b) => (
                      <li key={b.id} className="py-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="font-display-quiet text-quiet text-[16px] leading-none">
                            {b.clientName ?? 'Client'}
                            {b.budget && (
                              <span className="ml-3 font-body text-[12px] text-quiet-dim">
                                {b.budget}
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-4">
                            <span className="font-body text-[12px] text-quiet">
                              {(b.status && BOOKING_STATUS_LABELS[b.status]) ?? b.status ?? '—'}
                            </span>
                            <span className="font-body text-[12px] text-quiet-dim/80 tabular-nums">
                              {formatDate(b.createdAt)}
                            </span>
                          </div>
                        </div>
                        {b.description && (
                          <p className="mt-3 font-body text-[13px] text-quiet-dim leading-[1.7] line-clamp-2">
                            {b.description}
                          </p>
                        )}
                        {(b.requestedSlots?.length ?? 0) > 0 && (
                          <p className="mt-3 font-body text-[12px] text-quiet-dim">
                            Asked for:{' '}
                            {b.requestedSlots!
                              .map((s) => `${s.date}${s.time ? ` (${s.time})` : ''}`)
                              .join(', ')}
                          </p>
                        )}
                        {(b.statusHistory?.length ?? 0) > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer font-body text-[12px] text-quiet-dim hover:text-white">
                              Status history
                            </summary>
                            <ul className="mt-3 space-y-1.5">
                              {b.statusHistory!.map((event, i) => (
                                <li
                                  key={`${event.at}-${i}`}
                                  className="font-body text-[12px] text-quiet-dim tabular-nums"
                                >
                                  —&nbsp;&nbsp;
                                  {BOOKING_STATUS_LABELS[event.status] ?? event.status} ·{' '}
                                  {formatDate(event.at)} · by {event.by}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {user?.email && (
                <div className="mt-10 font-body text-[12px] text-quiet-dim/80">
                  Signed in as {user.email}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </StudioShell>
  );
}
