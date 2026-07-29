import StudioShell from "@/components/studio/StudioShell";
import QuietHeadline from "@/components/quiet/QuietHeadline";

export default function TermsPage() {
  return (
    <StudioShell quiet>
      <div className="px-6 md:px-12 pt-8 pb-6 border-b hairline-quiet-soft">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[12px] text-quiet-dim tabular-nums font-body">
          <span>Legal / Terms</span>
          <span>v0.1 draft</span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-3xl mx-auto">
          <QuietHeadline>Terms of use</QuietHeadline>
          <p className="mt-6 text-[12px] text-quiet-dim font-body tabular-nums">
            Last updated: Pending counsel review
          </p>

          <div className="mt-16 space-y-8 text-[14px] text-quiet-dim font-body leading-[1.8] border-t hairline-quiet-soft pt-12">
            <p className="text-[15px] text-quiet">
              This document will be drafted by counsel before public launch. The text
              below is placeholder content to ensure routes resolve correctly.
            </p>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
              tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
              veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
              commodo consequat.
            </p>
            <h2 className="font-display-quiet text-quiet text-[18px] pt-6">
              1.&nbsp;Acceptance
            </h2>
            <p>
              By accessing or using TattTester, you agree to be bound by these terms. If you
              disagree with any part of the terms, you do not have permission to access
              the service.
            </p>
            <h2 className="font-display-quiet text-quiet text-[18px] pt-6">
              2.&nbsp;Generated Content
            </h2>
            <p>
              Designs generated through the platform are licensed to you for personal
              use. Commercial reproduction without permission is prohibited.
            </p>
            <h2 className="font-display-quiet text-quiet text-[18px] pt-6">
              3.&nbsp;Artist Bookings
            </h2>
            <p>
              TattTester facilitates introductions between users and tattoo artists. The
              tattoo procedure itself is a contract between the user and the artist.
            </p>
            {/* SMS terms note (TAT-49) — mirrors the carrier disclosure. */}
            <h2 className="font-display-quiet text-quiet text-[18px] pt-6">
              4.&nbsp;Messaging
            </h2>
            <p>
              By texting SketchBot at the number published on this site you agree to receive
              conversational replies. Message and data rates may apply, message frequency
              varies, and you can reply STOP to opt out or HELP for help.
            </p>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
