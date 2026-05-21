'use client';

import dynamic from 'next/dynamic';
import StudioShell from '@/components/studio/StudioShell';
import TapeCTA from '@/components/punk/TapeCTA';

const LegacyContent = dynamic(() => import('@/features/Generate'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-black text-white font-body text-[10px] uppercase tracking-[0.28em]">
      <span className="text-pink">●</span>&nbsp;&nbsp;Loading&nbsp;the&nbsp;forge…
    </div>
  )
});

export default function GeneratePage() {
  return (
    <StudioShell footer={false}>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <div className="flex items-center gap-4">
            <TapeCTA
              href="/generate/stencil"
              variant="ghost"
              size="sm"
              arrow={false}
            >
              ◂ Back to Stencil
            </TapeCTA>
            <span className="hidden sm:inline">
              <span className="text-pink">●</span>&nbsp;&nbsp;The&nbsp;Forge&nbsp;— Legacy&nbsp;Studio
            </span>
          </div>
          <span>Status:&nbsp;<span className="text-pink">Live</span></span>
        </div>
      </div>
      <div className="min-h-[70vh] bg-black">
        <LegacyContent />
      </div>
    </StudioShell>
  );
}
