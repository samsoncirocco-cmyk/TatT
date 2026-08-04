'use client';

import { useState } from 'react';
import Link from 'next/link';
import StudioShell from '@/components/studio/StudioShell';
import QuietCTA from '@/components/quiet/QuietCTA';

type Phase = 'form' | 'submitting' | 'received' | 'error';

export default function IntroClient({ artist }: { artist: { id: string; name: string; slug: string } }) {
  const [phase, setPhase] = useState<Phase>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ requestId?: string; error?: string; fallbackEmail?: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPhase('submitting');
    try {
      const response = await fetch('/api/v1/artist-intros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: artist.id, clientName: name, clientEmail: email, message }),
      });
      const data = (await response.json().catch(() => ({}))) as { requestId?: string; error?: string; fallbackEmail?: string; received?: boolean };
      setResult(data);
      setPhase(response.ok && data.received ? 'received' : 'error');
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Network error.' });
      setPhase('error');
    }
  }

  return (
    <StudioShell quiet>
      <div className="px-6 md:px-12 pt-8 pb-6 border-b hairline-quiet-soft">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[12px] text-quiet-dim font-body">
          <span>Artist introduction</span>
          <Link href={`/artists/${artist.slug}`} className="hover:text-white">Back to profile</Link>
        </div>
      </div>
      <main className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display-quiet text-[42px] md:text-[64px] leading-[0.9] text-quiet">
            Ask for an introduction.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] text-quiet-dim font-body leading-[1.7]">
            {artist.name} has not joined TatT&apos;s booking network. Send your details and TatT will relay the request to their shop. No deposit is taken, and this is not a confirmed booking.
          </p>

          {phase !== 'received' && (
            <form onSubmit={submit} className="mt-12 space-y-7 max-w-xl">
              <label className="block text-[11px] text-quiet-dim font-body">
                Your name
                <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full bg-black border hairline-quiet px-4 py-3 text-white font-body focus:outline-none focus:border-white" />
              </label>
              <label className="block text-[11px] text-quiet-dim font-body">
                Your email
                <input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full bg-black border hairline-quiet px-4 py-3 text-white font-body focus:outline-none focus:border-white" />
              </label>
              <label className="block text-[11px] text-quiet-dim font-body">
                What are you hoping to make? <span className="text-white/40">Optional</span>
                <textarea rows={5} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 w-full bg-black border hairline-quiet px-4 py-3 text-white font-body focus:outline-none focus:border-white" />
              </label>
              <p className="border hairline-quiet p-4 text-[12px] text-quiet-dim font-body leading-[1.7]">
                TatT sends this to a human relay queue. We cannot promise the artist&apos;s availability or response, and we do not take a deposit for this request.
              </p>
              <button type="submit" disabled={phase === 'submitting'} className="px-7 py-4 bg-quiet text-black font-body press hover:bg-white disabled:opacity-50">
                {phase === 'submitting' ? 'Sending…' : 'Request an intro'}
              </button>
            </form>
          )}

          {phase === 'received' && result && (
            <section className="mt-12 border hairline-quiet p-7 max-w-xl">
              <h2 className="font-display-quiet text-[26px] text-quiet">Request received.</h2>
              <p className="mt-4 text-[13px] text-quiet-dim font-body leading-[1.7]">TatT will relay your request to {artist.name}&apos;s shop. No deposit was taken and the artist has not confirmed a booking.</p>
              {result.requestId && <p className="mt-4 text-[12px] text-quiet-dim font-body">Reference: {result.requestId}</p>}
              <QuietCTA href={`/artists/${artist.slug}`} variant="ghost" size="sm" className="mt-7">Back to profile</QuietCTA>
            </section>
          )}
          {phase === 'error' && result && (
            <section className="mt-8 border border-red-300/50 p-5 max-w-xl text-[13px] text-quiet-dim font-body leading-[1.7]">
              {result.error || 'We could not send the request.'}
              {result.requestId && <span className="block mt-3">Reference: {result.requestId}</span>}
              {result.fallbackEmail && <span className="block mt-3">Email us directly at {result.fallbackEmail} and quote that reference.</span>}
            </section>
          )}
        </div>
      </main>
    </StudioShell>
  );
}
