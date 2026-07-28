'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import StudioShell from '@/components/studio/StudioShell';

export default function ClaimEntryPage() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    // The artist directory already does live graph search; send them there.
    router.push(term ? `/artists?q=${encodeURIComponent(term)}` : '/artists');
  };

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Claim Profile
          </span>
          <span>Artists&nbsp;/&nbsp;<span className="text-pink">self-serve</span></span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-white text-[40px] md:text-[72px] leading-[0.9] tracking-[0.005em]">
            Find your&nbsp;<span className="slash"><span>profile</span></span>
            <span className="text-pink">.</span>
          </h1>
          <p className="mt-6 text-[15px] text-white/70 font-body max-w-xl leading-[1.55]">
            You may already be on TattTester — clients can book and leave deposits before you sign up. Search
            the directory, open your profile, and claim it.
          </p>

          <form onSubmit={search} className="mt-12 flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Your name or studio…"
              className="flex-1 bg-black border-2 hairline text-white font-body text-[16px] px-5 py-4 placeholder:text-white/30 focus:outline-none focus:border-pink"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center px-8 py-4 font-display text-[20px] leading-none tracking-[0.02em] press tape"
            >
              Search
              <span className="ml-2 text-[14px]">▸</span>
            </button>
          </form>

          <p className="mt-8 font-body text-[13px] text-white/50">
            Prefer to browse?{' '}
            <Link href="/artists" className="text-pink underline underline-offset-4">
              See the full roster
            </Link>
            .
          </p>
        </div>
      </div>
    </StudioShell>
  );
}
