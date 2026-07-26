'use client';

/**
 * "This is my profile — take it down."
 *
 * Sits beside /claim/[artistId]: the same recognition moment, the other
 * ending. An artist who finds themselves in TatT's graph without ever having
 * opted in gets here, and does NOT need an account first — see docs/adr/0025.
 *
 * The page is careful about what it promises. It never says "removed"; it says
 * a person will review it. If the request could not be delivered, it says so
 * and gives an address that does not depend on the path that just failed.
 */

import { use, useCallback, useState } from 'react';
import Link from 'next/link';
import StudioShell from '@/components/studio/StudioShell';
import { TAKEDOWN_RELATIONSHIPS, TAKEDOWN_SCOPES } from '@/lib/takedown';

type Phase = 'form' | 'submitting' | 'received' | 'error';

type TakedownResponse = {
  received?: boolean;
  requestId?: string;
  logged?: boolean;
  status?: string;
  error?: string;
  fallbackEmail?: string;
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  artist: 'I am the artist',
  representative: 'I represent the artist',
  shop: 'I represent the shop',
  other: 'Something else',
};

const SCOPE_LABELS: Record<string, string> = {
  all: 'Remove my photos and take my profile down',
  images: 'Remove my photos, but the listing can stay',
};

export default function TakedownPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = use(params);

  const [phase, setPhase] = useState<Phase>('form');
  const [contactEmail, setContactEmail] = useState('');
  const [relationship, setRelationship] = useState<string>('artist');
  const [scope, setScope] = useState<string>('all');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<TakedownResponse | null>(null);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPhase('submitting');
      try {
        const res = await fetch('/api/v1/artists/takedown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artistId, contactEmail, relationship, scope, message }),
        });
        const data = (await res.json().catch(() => ({}))) as TakedownResponse;
        setResult(data);
        setPhase(res.ok && data.received ? 'received' : 'error');
      } catch (err) {
        setResult({ error: err instanceof Error ? err.message : 'Network error.' });
        setPhase('error');
      }
    },
    [artistId, contactEmail, relationship, scope, message],
  );

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Remove Profile
          </span>
          <span>
            Artist:&nbsp;<span className="text-pink">{artistId}</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-white text-[40px] md:text-[72px] leading-[0.9] tracking-[0.005em]">
            Take my work&nbsp;<span className="slash"><span>down</span></span>
            <span className="text-pink">.</span>
          </h1>

          <p className="mt-6 text-[15px] text-white/70 font-body max-w-xl leading-[1.55]">
            We built this profile from public listings. You never agreed to that. If the
            work here is yours and you want it gone, tell us and a person will action it.
          </p>

          {phase !== 'received' && (
            <form onSubmit={submit} className="mt-12 space-y-8">
              <div>
                <label
                  htmlFor="td-email"
                  className="block font-body text-[10px] uppercase tracking-[0.25em] text-white/50"
                >
                  Your email — so we can confirm
                </label>
                <input
                  id="td-email"
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-3 w-full bg-black border-2 hairline px-4 py-3 text-white font-body text-[15px] focus:border-pink focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <fieldset>
                <legend className="font-body text-[10px] uppercase tracking-[0.25em] text-white/50">
                  Who are you?
                </legend>
                <div className="mt-3 space-y-2">
                  {TAKEDOWN_RELATIONSHIPS.map((r) => (
                    <label key={r} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="relationship"
                        value={r}
                        checked={relationship === r}
                        onChange={() => setRelationship(r)}
                        className="accent-pink"
                      />
                      <span className="font-body text-[14px] text-white/80">
                        {RELATIONSHIP_LABELS[r]}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="font-body text-[10px] uppercase tracking-[0.25em] text-white/50">
                  What should we remove?
                </legend>
                <div className="mt-3 space-y-2">
                  {TAKEDOWN_SCOPES.map((s) => (
                    <label key={s} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="scope"
                        value={s}
                        checked={scope === s}
                        onChange={() => setScope(s)}
                        className="accent-pink"
                      />
                      <span className="font-body text-[14px] text-white/80">
                        {SCOPE_LABELS[s]}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor="td-message"
                  className="block font-body text-[10px] uppercase tracking-[0.25em] text-white/50"
                >
                  Anything else (optional)
                </label>
                <textarea
                  id="td-message"
                  rows={4}
                  maxLength={5000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-3 w-full bg-black border-2 hairline px-4 py-3 text-white font-body text-[15px] focus:border-pink focus:outline-none"
                  placeholder="Which images, or anything we should know."
                />
              </div>

              <div className="border-2 hairline bg-black p-5">
                <p className="font-body text-[12px] text-white/60 leading-[1.6]">
                  <span className="text-white/80">What happens next.</span> A person reviews
                  this — nothing is removed automatically. We may ask you to confirm the
                  Instagram handle on the profile is yours, so that no one can use this form
                  to remove someone else&apos;s work.
                </p>
              </div>

              <button
                type="submit"
                disabled={phase === 'submitting' || !contactEmail}
                className="inline-flex items-center justify-center px-8 py-4 font-display text-[20px] leading-none tracking-[0.02em] press tape disabled:opacity-50"
              >
                {phase === 'submitting' ? 'Sending…' : 'Send the request'}
                <span className="ml-2 text-[14px]">▸</span>
              </button>
            </form>
          )}

          {phase === 'received' && result && (
            <div className="mt-12 border-2 hairline bg-black p-6">
              <div className="font-display text-white text-[24px] leading-none">
                We&apos;ve got it.
              </div>
              <p className="mt-3 font-body text-[13px] text-white/70 leading-[1.55]">
                Reference&nbsp;
                <span className="text-pink tabular-nums">{result.requestId}</span>. A person
                will review this and reply to{' '}
                <span className="text-white">{contactEmail}</span>.
              </p>
              {/* Said plainly: nothing has happened to their work yet. */}
              <p className="mt-3 font-body text-[13px] text-white/50 leading-[1.55]">
                Nothing has been removed yet — we won&apos;t tell you it&apos;s done until it is.
              </p>
            </div>
          )}

          {phase === 'error' && (
            <div className="mt-12 border-2 border-pink bg-black p-6">
              <div className="font-body text-[12px] uppercase tracking-[0.25em] text-pink">
                Not sent
              </div>
              <p className="mt-2 font-body text-[13px] text-white/70 leading-[1.55]">
                {result?.error || 'Something went wrong.'}
              </p>
              {result?.fallbackEmail && (
                <p className="mt-3 font-body text-[13px] text-white/70">
                  Email us at{' '}
                  <a href={`mailto:${result.fallbackEmail}`} className="text-pink press">
                    {result.fallbackEmail}
                  </a>
                  {result.requestId && (
                    <>
                      {' '}
                      and quote{' '}
                      <span className="text-pink tabular-nums">{result.requestId}</span>
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
            </div>
          )}

          {/* The other ending to the same recognition moment. */}
          <div className="mt-12 pt-8 border-t hairline">
            <p className="font-body text-[13px] text-white/50 leading-[1.55]">
              Would you rather keep the profile and run it yourself?{' '}
              <Link href={`/claim/${encodeURIComponent(artistId)}`} className="text-pink press">
                Claim it instead
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
