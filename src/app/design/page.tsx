'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import StudioShell from '@/components/studio/StudioShell';
import SlashHeadline from '@/components/punk/SlashHeadline';
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
 *
 * TAT-48: this is the front door, and it speaks loud (ADR-0035 register
 * map: /design shell = Loud). SketchBot owns the header; the conversation
 * itself follows ADR-0023's consultant voice, with the live notepad
 * rendered beside it by DesignConversation.
 */
export default function DesignPage() {
  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-5 border-b hairline">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
            <span>
              <span className="text-pink">●</span>&nbsp;&nbsp;SketchBot&nbsp;—&nbsp;live
            </span>
            <span>
              one&nbsp;round.&nbsp;<span className="text-pink">then&nbsp;your&nbsp;artist.</span>
            </span>
          </div>
          <SlashHeadline slashed="SketchBot" size="form" className="mt-4" />
          <p className="mt-2 font-body text-[13px] leading-[1.55] text-white/60">
            your design consult — say it messy, leave with four takes.
          </p>
        </div>
      </div>
      <div className="px-6 md:px-12 py-10 md:py-14">
        <div className="max-w-5xl mx-auto">
          <Suspense fallback={null}>
            <DesignConversationEntry />
          </Suspense>
        </div>
      </div>
    </StudioShell>
  );
}
