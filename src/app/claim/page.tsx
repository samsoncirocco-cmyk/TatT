'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import StudioShell from '@/components/studio/StudioShell';
import QuietHeadline from '@/components/quiet/QuietHeadline';

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
    <StudioShell quiet>
      <div className="px-6 md:px-12 pt-8 pb-6 border-b hairline-quiet-soft">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[12px] text-quiet-dim tabular-nums font-body">
          <span>Claim profile</span>
          <span>Artists / self-serve</span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-3xl mx-auto">
          <QuietHeadline>Find your profile</QuietHeadline>
          <p className="mt-8 text-[15px] text-quiet-dim font-body max-w-xl leading-[1.7]">
            You may already be on TattTester — clients can book and leave deposits before you sign up. Search
            the directory, open your profile, and claim it.
          </p>

          <form onSubmit={search} className="mt-14 flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Your name or studio…"
              className="flex-1 bg-black border hairline-quiet text-quiet font-body text-[16px] px-5 py-4 placeholder:text-white/30 focus:outline-none focus:border-quiet"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center px-8 py-4 font-body text-[14px] leading-none press bg-quiet text-black hover:bg-white"
            >
              Search
            </button>
          </form>

          <p className="mt-10 font-body text-[13px] text-quiet-dim">
            Prefer to browse?{' '}
            <Link href="/artists" className="text-quiet underline underline-offset-4 hover:text-white">
              See the full roster
            </Link>
            .
          </p>
        </div>
      </div>
    </StudioShell>
  );
}
