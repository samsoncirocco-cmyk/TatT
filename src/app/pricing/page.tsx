import StudioShell from "@/components/studio/StudioShell";
import QuietHeadline from "@/components/quiet/QuietHeadline";
import QuietCTA from "@/components/quiet/QuietCTA";
import { ArtistSubscribeButton } from "@/components/billing/BillingButtons";
// Server component — safe to read the platform take rate from the shared
// Stripe config (never imported into client components). Rendering the fee
// from PLATFORM_FEE_BPS keeps this page honest if the rate ever changes.
import { PLATFORM_FEE_BPS } from "@/lib/stripe";

const FEE_PERCENT = PLATFORM_FEE_BPS / 100; // 1000 bps → 10

/**
 * Honest pricing (ADR-0030): no consumer tiers exist, so none are sold here.
 * Designing is free; the only customer charge is the booking fee added on top
 * of the deposit at booking, and the artist keeps 100% of the deposit
 * (ADR-0007). Consumer credits/tiers are explicitly deferred post-launch.
 */
const STEPS = [
  {
    step: "01",
    name: "Design",
    price: "Free",
    body: "Generate designs, preview them on your body in AR, and browse artists. No monthly fee, no credit card.",
  },
  {
    step: "02",
    name: "Book",
    price: `Deposit + ${FEE_PERCENT}%`,
    body: `When you book an artist, you pay their deposit plus a ${FEE_PERCENT}% booking fee. That fee is the only thing TattTester ever charges you.`,
  },
  {
    step: "03",
    name: "Ink",
    price: "100% to the artist",
    body: "Your entire deposit goes to the artist — TattTester takes nothing out of it. The booking fee is how we keep the lights on.",
  },
];

export default function PricingPage() {
  return (
    <StudioShell quiet>
      <div className="px-6 md:px-12 pt-8 pb-6 border-b hairline-quiet-soft">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[12px] text-quiet-dim tabular-nums font-body">
          <span>Pricing</span>
          <span>USD / pay per booking</span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <QuietHeadline>Free to design</QuietHeadline>
          <p className="mt-8 text-[15px] text-quiet-dim font-body max-w-xl leading-[1.7]">
            No tiers. No subscriptions. You only pay when you book an artist.
            No tricks.
          </p>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {STEPS.map((s) => (
              <div key={s.name} className="relative border hairline-quiet bg-black p-10">
                <div className="inline-block border hairline-quiet px-3 py-2 mb-8">
                  <div className="font-display-quiet text-quiet text-[13px] leading-none">
                    {s.name}
                  </div>
                  <div className="font-body text-[10px] text-quiet-dim leading-none mt-1">
                    Step&nbsp;{s.step}
                  </div>
                </div>

                <div className="font-display-quiet text-quiet text-[26px] md:text-[28px] leading-[1.1]">
                  {s.price}
                </div>

                <p className="mt-8 border-t hairline-quiet-soft pt-8 text-[13px] text-quiet-dim font-body leading-[1.7]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col sm:flex-row sm:items-center gap-6">
            <QuietCTA href="/design" size="md">Start designing</QuietCTA>
            <p className="text-[13px] text-quiet-dim font-body">
              Deposits are set by the artist, not by us.
            </p>
          </div>

          {/* For artists — SaaS subscription (money flow #2: platform charges
              the artist directly). Posts to /api/v1/billing/subscribe and
              redirects to the Stripe-hosted Checkout Session. */}
          <div className="mt-20 md:mt-28 border hairline-quiet bg-black p-10 md:p-14 flex flex-col md:flex-row md:items-center md:justify-between gap-10">
            <div className="max-w-xl">
              <div className="inline-block border hairline-quiet px-3 py-2 mb-8">
                <div className="font-display-quiet text-quiet text-[13px] leading-none">
                  For artists
                </div>
                <div className="font-body text-[10px] text-quiet-dim leading-none mt-1">
                  Plan
                </div>
              </div>
              <h2 className="font-display-quiet text-quiet text-[24px] md:text-[32px] leading-[1.1]">
                Run your business
              </h2>
              <p className="mt-6 text-[14px] text-quiet-dim font-body leading-[1.7]">
                Take bookings, hold deposits, and manage clients on TattTester.
                You keep 100% of every deposit. Cancel any time from the
                billing portal.
              </p>
            </div>
            <ArtistSubscribeButton className="press inline-flex items-center justify-center whitespace-nowrap px-8 py-4 font-body text-[14px] leading-none bg-quiet text-black hover:bg-white disabled:opacity-60">
              Start subscription
            </ArtistSubscribeButton>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
