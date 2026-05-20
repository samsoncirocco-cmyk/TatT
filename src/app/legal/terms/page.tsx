import StudioShell from "@/components/studio/StudioShell";

export default function TermsPage() {
  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span><span className="text-pink">●</span>&nbsp;&nbsp;Legal&nbsp;/&nbsp;Terms</span>
          <span>v0.1&nbsp;<span className="text-pink">draft</span></span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-white text-[48px] sm:text-[80px] leading-[0.88] tracking-[0.005em]">
            Terms of&nbsp;<span className="slash"><span>use</span></span>
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
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
              tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
              veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
              commodo consequat.
            </p>
            <h2 className="font-display text-white text-[20px] tracking-wide pt-4">
              1.&nbsp;Acceptance
            </h2>
            <p>
              By accessing or using TatT, you agree to be bound by these terms. If you
              disagree with any part of the terms, you do not have permission to access
              the service.
            </p>
            <h2 className="font-display text-white text-[20px] tracking-wide pt-4">
              2.&nbsp;Generated Content
            </h2>
            <p>
              Designs generated through the platform are licensed to you for personal
              use. Commercial reproduction without permission is prohibited.
            </p>
            <h2 className="font-display text-white text-[20px] tracking-wide pt-4">
              3.&nbsp;Artist Bookings
            </h2>
            <p>
              TatT facilitates introductions between users and tattoo artists. The
              tattoo procedure itself is a contract between the user and the artist.
            </p>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
