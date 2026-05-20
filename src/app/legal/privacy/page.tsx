import StudioShell from "@/components/studio/StudioShell";

export default function PrivacyPage() {
  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span><span className="text-pink">●</span>&nbsp;&nbsp;Legal&nbsp;/&nbsp;Privacy</span>
          <span>v0.1&nbsp;<span className="text-pink">draft</span></span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-white text-[48px] sm:text-[80px] leading-[0.88] tracking-[0.005em]">
            Privacy&nbsp;<span className="slash"><span>policy</span></span>
            <span className="text-pink">.</span>
          </h1>
          <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-white/40 font-body tabular-nums">
            Last updated:&nbsp;<span className="text-pink">Pending counsel review</span>
          </p>

          <div className="mt-12 space-y-6 text-[14px] text-white/70 font-body leading-[1.7] border-t-2 hairline pt-10">
            <p className="text-[15px] text-white">
              This document will be drafted by counsel before public launch. The text
              below is placeholder content to ensure routes resolve correctly.
            </p>
            <h2 className="font-display text-white text-[20px] tracking-wide pt-4">
              1.&nbsp;Information We Collect
            </h2>
            <p>
              We collect information you provide directly (account details, design
              prompts) and information generated through your use of the service
              (generation history, artist matches).
            </p>
            <h2 className="font-display text-white text-[20px] tracking-wide pt-4">
              2.&nbsp;How We Use It
            </h2>
            <p>
              To operate the service, improve match quality, communicate with you, and
              meet legal obligations. We do not sell your data.
            </p>
            <h2 className="font-display text-white text-[20px] tracking-wide pt-4">
              3.&nbsp;Your Rights
            </h2>
            <p>
              You may access, correct, or delete your account information at any time
              from the Settings panel. For data portability or other rights, contact
              support.
            </p>
            <p className="italic">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
              tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
