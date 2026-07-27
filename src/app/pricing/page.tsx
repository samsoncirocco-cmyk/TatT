import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
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
    body: `When you book an artist, you pay their deposit plus a ${FEE_PERCENT}% booking fee. That fee is the only thing TatT ever charges you.`,
  },
  {
    step: "03",
    name: "Ink",
    price: "100% to the artist",
    body: "Your entire deposit goes to the artist — TatT takes nothing out of it. The booking fee is how we keep the lights on.",
  },
];

export default function PricingPage() {
  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Pricing
          </span>
          <span>USD&nbsp;/&nbsp;<span className="text-pink">pay&nbsp;per&nbsp;booking</span></span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-white text-[48px] md:text-[88px] leading-[0.88] tracking-[0.005em]">
            Free to&nbsp;<span className="slash"><span>design</span></span>
            <span className="text-pink">.</span>
          </h1>
          <p className="mt-6 text-[15px] text-white/70 font-body max-w-xl leading-[1.55]">
            No tiers. No subscriptions. You only pay when you book an artist.{" "}
            <span className="scribble text-pink">No tricks.</span>
          </p>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {STEPS.map((s) => (
              <div key={s.name} className="relative border-2 hairline bg-black p-8">
                <div className="sticker inline-block px-3 py-1 mb-6">
                  <div className="font-display text-[14px] tracking-widest leading-none">
                    {s.name}
                  </div>
                  <div className="font-body text-[10px] uppercase tracking-widest leading-none mt-0.5">
                    Step&nbsp;{s.step}
                  </div>
                </div>

                <div className="font-display text-white text-[32px] md:text-[36px] leading-[1.05]">
                  {s.price}
                </div>

                <p className="mt-6 border-t hairline pt-6 text-[13px] text-white/70 font-body leading-[1.55]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-6">
            <Link
              href="/design"
              className="press inline-flex items-center justify-center px-8 py-4 font-display text-[22px] leading-none tracking-[0.02em] tape"
            >
              Start Designing
              <span className="ml-2 text-[14px]">▸</span>
            </Link>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-body">
              Deposits are set by the artist, not by us.
            </p>
          </div>

          {/* For artists — SaaS subscription (money flow #2: platform charges
              the artist directly). Posts to /api/v1/billing/subscribe and
              redirects to the Stripe-hosted Checkout Session. */}
          <div className="mt-16 md:mt-24 border-2 border-pink bg-black p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-xl">
              <div className="sticker inline-block px-3 py-1 mb-6">
                <div className="font-display text-[14px] tracking-widest leading-none">
                  For Artists
                </div>
                <div className="font-body text-[10px] uppercase tracking-widest leading-none mt-0.5">
                  Plan
                </div>
              </div>
              <h2 className="font-display text-white text-[32px] md:text-[48px] leading-[0.92]">
                Run your&nbsp;<span className="slash"><span>business</span></span>
                <span className="text-pink">.</span>
              </h2>
              <p className="mt-5 text-[14px] text-white/70 font-body leading-[1.55]">
                Take bookings, hold deposits, and manage clients on TatT.
                You keep 100% of every deposit. Cancel any time from the
                billing portal.
              </p>
            </div>
            <ArtistSubscribeButton className="press inline-flex items-center justify-center whitespace-nowrap px-8 py-4 font-display text-[22px] leading-none tracking-[0.02em] tape disabled:opacity-60">
              Start Subscription
              <span className="ml-2 text-[14px]">▸</span>
            </ArtistSubscribeButton>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
