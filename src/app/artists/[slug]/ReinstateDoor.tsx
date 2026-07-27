'use client';

/**
 * "Changed your mind? You can reclaim this profile."
 *
 * The UI half of the reinstatement flow (docs/adr/0026). Renders on the
 * artist 404 — the surface a removed artist actually lands on when they
 * revisit their old URL. It starts as one quiet line and only unfolds when
 * asked, because for almost every visitor it is noise.
 *
 * Two properties carried over from the API, deliberately:
 *
 *  - NO GOSSIP. This component never knows — and never asks — whether the
 *    handle typed into it was ever removed. The API answers identically
 *    either way, and the copy says so out loud. The cases the server refuses
 *    to reveal (never removed; already claimed by another account; code
 *    lapsed before review) are disclosed here as *possibilities*, each with
 *    its next step, so no one hits a silent dead end.
 *
 *  - HONEST FAILURE. Every response the API can actually return gets its own
 *    rendering with a real next step: 400 keeps the form editable, 401 offers
 *    a fresh sign-in, 429 and 502 hand over a human mailbox (and the
 *    reference to quote), and a network fault gets a retry that keeps what
 *    was typed. Nothing spins forever; nothing pretends.
 *
 * The attack this door invites is impersonating a removed artist — the
 * profile can be bound to payouts — which is why the copy is plain about
 * what is verified (control of the Instagram handle the removal was recorded
 * against) and why (the profile will belong to the signed-in account).
 */

import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

type Received = {
  requestId?: string;
  verificationCode?: string;
  expiresInDays?: number;
};

type Failure = {
  kind: 'auth' | 'blocked' | 'network';
  message: string;
  fallbackEmail?: string;
  requestId?: string;
};

type Phase = 'form' | 'submitting' | 'received' | 'failed';

/** Strip "@", urls and trailing junk for display; the API re-normalizes. */
function displayHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

const label = 'block font-body text-[10px] uppercase tracking-[0.25em] text-white/50';
const input =
  'mt-3 w-full bg-black border-2 hairline px-4 py-3 text-white font-body text-[15px] focus:border-pink focus:outline-none';

export default function ReinstateDoor() {
  const { user, isAuthenticated, loading, loginWithGoogle, getIdToken } = useAuth();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [instagram, setInstagram] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [received, setReceived] = useState<Received | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const prefilled = useRef(false);

  // Reply-to defaults to the signed-in address; typing over it sticks.
  if (isAuthenticated && user?.email && !prefilled.current && !contactEmail) {
    prefilled.current = true;
    setContactEmail(user.email);
  }

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPhase('submitting');
      setFormError(null);
      setFailure(null);
      try {
        const token = await getIdToken();
        if (!token) {
          setFailure({ kind: 'auth', message: 'Your sign-in expired.' });
          setPhase('failed');
          return;
        }
        const res = await fetch('/api/v1/artists/reinstate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            instagram,
            contactEmail,
            message: message.trim() || undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (res.ok && data.received) {
          setReceived({
            requestId: data.requestId as string | undefined,
            verificationCode: data.verificationCode as string | undefined,
            expiresInDays: data.expiresInDays as number | undefined,
          });
          setPhase('received');
          return;
        }
        if (res.status === 400) {
          // A fixable mistake, not a wall: stay on the form.
          setFormError((data.error as string) || 'That didn’t look right — check the fields.');
          setPhase('form');
          return;
        }
        if (res.status === 401) {
          setFailure({ kind: 'auth', message: 'Your sign-in expired.' });
          setPhase('failed');
          return;
        }
        setFailure({
          kind: 'blocked',
          message:
            (data.error as string) ||
            `Something went wrong on our side (${res.status}). Nothing was sent.`,
          fallbackEmail: data.fallbackEmail as string | undefined,
          requestId: data.requestId as string | undefined,
        });
        setPhase('failed');
      } catch (err) {
        setFailure({
          kind: 'network',
          message: err instanceof Error ? err.message : 'Network error.',
        });
        setPhase('failed');
      }
    },
    [contactEmail, getIdToken, instagram, message],
  );

  return (
    <div className="mt-14 pt-8 border-t hairline max-w-xl">
      {!open && (
        <p className="font-body text-[11px] text-white/40 leading-[1.6]">
          Changed your mind? If this was your profile and you had it removed,{' '}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-white/60 hover:text-pink press underline underline-offset-4"
          >
            you can reclaim it
          </button>
          .
        </p>
      )}

      {open && (
        <div>
          <div className="font-body text-[10px] uppercase tracking-[0.28em] text-pink">
            ●&nbsp;&nbsp;Reclaim a removed profile
          </div>

          <p className="mt-4 font-body text-[13px] text-white/70 leading-[1.6]">
            If you asked us to remove your profile and want back in, this is the
            way. Being honest up front: nothing that was deleted comes back —
            your photos and details were permanently erased when you were
            removed. What you get is an empty profile that belongs to your
            account, that you fill in yourself, and that our scrapers stay
            permanently blocked from touching.
          </p>

          {!isAuthenticated && (
            <div className="mt-8">
              <p className="font-body text-[13px] text-white/70 leading-[1.6]">
                First, sign in. A reclaimed profile is bound to your account —
                it belongs to you, and it can be set up to receive booking
                deposits — so we need to know which account is asking.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void loginWithGoogle()}
                className="mt-6 inline-flex items-center justify-center px-8 py-4 font-display text-[20px] leading-none tracking-[0.02em] press tape disabled:opacity-50"
              >
                Log in with Google
                <span className="ml-2 text-[14px]">▸</span>
              </button>
            </div>
          )}

          {isAuthenticated && phase !== 'received' && phase !== 'failed' && (
            <form onSubmit={submit} className="mt-8 space-y-7">
              <div>
                <label htmlFor="ri-handle" className={label}>
                  Instagram handle the profile was removed under
                </label>
                <input
                  id="ri-handle"
                  type="text"
                  required
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className={input}
                  placeholder="@yourhandle"
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="ri-email" className={label}>
                  Your email — where we reply
                </label>
                <input
                  id="ri-email"
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={input}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="ri-message" className={label}>
                  Anything else (optional)
                </label>
                <textarea
                  id="ri-message"
                  rows={3}
                  maxLength={5000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={input}
                  placeholder="Anything we should know."
                />
              </div>

              <div className="border-2 hairline bg-black p-5">
                <p className="font-body text-[12px] text-white/60 leading-[1.6]">
                  <span className="text-white/80">What we verify, and why.</span>{' '}
                  Because a reclaimed profile belongs to your account and can
                  receive money, we have to be sure it&apos;s really you — not
                  someone wearing your name. We&apos;ll issue a one-time code;
                  you post it on that Instagram account — bio, post, or story —
                  and a person checks it&apos;s there before anything changes.
                  Only whoever controls the account can do that. Nothing is
                  automatic, and this page won&apos;t tell you — or anyone else
                  — whether a given handle was ever removed.
                </p>
              </div>

              {formError && (
                <p className="font-body text-[13px] text-pink leading-[1.55]" role="alert">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={phase === 'submitting' || !instagram || !contactEmail}
                className="inline-flex items-center justify-center px-8 py-4 font-display text-[20px] leading-none tracking-[0.02em] press tape disabled:opacity-50"
              >
                {phase === 'submitting' ? 'Sending…' : 'Send the request'}
                <span className="ml-2 text-[14px]">▸</span>
              </button>
            </form>
          )}

          {phase === 'received' && received && (
            <div className="mt-8 border-2 hairline bg-black p-6">
              <div className="font-display text-white text-[24px] leading-none">
                Code issued. Now prove the handle is yours.
              </div>

              <div className="mt-5 border-2 border-pink px-5 py-4 inline-block">
                <span className="font-display text-[28px] sm:text-[32px] tracking-[0.08em] text-pink tabular-nums">
                  {received.verificationCode}
                </span>
              </div>

              <p className="mt-5 font-body text-[13px] text-white/70 leading-[1.6]">
                Post this code on{' '}
                <span className="text-white">@{displayHandle(instagram)}</span> — in your
                bio, a post, or a story. It&apos;s valid for{' '}
                {received.expiresInDays ?? 7} days. A person will check it&apos;s
                there and reply to <span className="text-white">{contactEmail}</span>.
                Your reference is{' '}
                <span className="text-pink tabular-nums">{received.requestId}</span>.
              </p>

              <p className="mt-4 font-body text-[13px] text-white/50 leading-[1.6]">
                Nothing has been reinstated yet, and nothing that was deleted
                comes back — approval gets you an empty profile that&apos;s
                yours to fill in.
              </p>

              <div className="mt-6 pt-5 border-t hairline">
                <p className="font-body text-[11px] uppercase tracking-[0.22em] text-white/50">
                  Three things we&apos;ll tell you by email, not here
                </p>
                <ul className="mt-3 space-y-3 font-body text-[12px] text-white/60 leading-[1.6]">
                  <li>
                    <span className="text-pink">—</span>&nbsp;&nbsp;If this handle
                    was <span className="text-white/80">never removed</span> from
                    TatT, there&apos;s nothing to reclaim — we&apos;ll say so and
                    point you at a normal sign-up. This page stays silent about
                    that on purpose, so nobody can use it to find out who asked
                    to be removed.
                  </li>
                  <li>
                    <span className="text-pink">—</span>&nbsp;&nbsp;If the profile
                    is <span className="text-white/80">already claimed</span> by a
                    different account, nothing moves automatically — a person
                    sorts out who&apos;s who with you first.
                  </li>
                  <li>
                    <span className="text-pink">—</span>&nbsp;&nbsp;If the code{' '}
                    <span className="text-white/80">expires before</span> we&apos;ve
                    checked, just send a new request — a fresh code costs
                    nothing.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {phase === 'failed' && failure && (
            <div className="mt-8 border-2 border-pink bg-black p-6">
              {failure.kind === 'auth' ? (
                <>
                  <div className="font-body text-[12px] uppercase tracking-[0.25em] text-pink">
                    Sign-in expired
                  </div>
                  <p className="mt-2 font-body text-[13px] text-white/70 leading-[1.55]">
                    Your sign-in expired before we could send that. Log in again
                    — what you typed is still here.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void loginWithGoogle();
                      setPhase('form');
                    }}
                    className="mt-4 inline-flex items-center px-6 py-3 border-2 hairline text-white font-display text-[16px] hover:bg-pink hover:border-pink hover:text-black press"
                  >
                    Log in with Google
                  </button>
                </>
              ) : (
                <>
                  <div className="font-body text-[12px] uppercase tracking-[0.25em] text-pink">
                    Not sent
                  </div>
                  <p className="mt-2 font-body text-[13px] text-white/70 leading-[1.55]">
                    {failure.message}
                  </p>
                  {failure.fallbackEmail && (
                    <p className="mt-3 font-body text-[13px] text-white/70 leading-[1.55]">
                      Email us at{' '}
                      <a
                        href={`mailto:${failure.fallbackEmail}`}
                        className="text-pink press"
                      >
                        {failure.fallbackEmail}
                      </a>
                      {failure.requestId && (
                        <>
                          {' '}
                          and quote{' '}
                          <span className="text-pink tabular-nums">{failure.requestId}</span>
                        </>
                      )}
                      .
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setPhase('form')}
                    className="mt-4 inline-flex items-center px-6 py-3 border-2 hairline text-white font-display text-[16px] hover:bg-pink hover:border-pink hover:text-black press"
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
