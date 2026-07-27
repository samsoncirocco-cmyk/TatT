'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import StudioShell from '@/components/studio/StudioShell';
import { DesignConversation } from '@/features/design-session';

/**
 * Reads the ?prompt= deep link (the one-door entry for saved-design
 * "Iterate" links and old Forge URLs, ADR-0028) and hands it to the
 * conversation as the user's first message — a complete prompt takes the
 * fast lane straight to the reveal. useSearchParams needs its own Suspense
 * boundary in the app router, so this stays a leaf component.
 */
function DesignConversationEntry() {
  const searchParams = useSearchParams();
  return <DesignConversation initialPrompt={searchParams?.get('prompt') ?? undefined} />;
}

/**
 * The single consumer design entry (ADR-0028): one input, talk or type.
 * Live conversational intake → proposal → reveal → one refinement round →
 * handoff (ADR-0019, ADR-0020, ADR-0012, ADR-0013); a complete first
 * prompt skips the conversation and lands on the four-cut reveal. Mobile
 * first — this is the first screen a TikTok/IG first-timer lands on.
 */
export default function DesignPage() {
  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Design&nbsp;Session
          </span>
          <span>
            One&nbsp;round.&nbsp;<span className="text-pink">Then&nbsp;your&nbsp;artist.</span>
          </span>
        </div>
      </div>
      <div className="px-6 md:px-12 py-10 md:py-16">
        <div className="max-w-2xl mx-auto">
          <Suspense fallback={null}>
            <DesignConversationEntry />
          </Suspense>
        </div>
      </div>
    </StudioShell>
  );
}
