'use client';

import StudioShell from '@/components/studio/StudioShell';
import { DesignConversation } from '@/features/design-session';

/**
 * The design-session surface: live conversational intake → proposal →
 * reveal → one refinement round → handoff (ADR-0019, ADR-0020, ADR-0012,
 * ADR-0013). Mobile-first — this is the first screen a TikTok/IG
 * first-timer lands on.
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
          <DesignConversation />
        </div>
      </div>
    </StudioShell>
  );
}
