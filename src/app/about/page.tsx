import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";

const SECTIONS = [
  {
    n: "01",
    word: "Describe",
    body: [
      "One sentence. That's the rule. Tell us the subject, where it goes on your body, and the mood you're chasing.",
      "Don't overthink the prompt. The system is built to read intent, not jargon. Slang welcome. Vibe-based descriptions encouraged.",
    ],
  },
  {
    n: "02",
    word: "Generate",
    body: [
      "Four passes back in under thirty seconds. Each one a different cut at the same idea — different angle, different weight, different attitude.",
      "Pick the one that hits. Or scrap them all and try again. Credits don't tick on garbage.",
    ],
  },
  {
    n: "03",
    word: "Refine",
    body: [
      "Lock the composition. Adjust the linework. Mask a region and regenerate just that part. Iterate until the design is yours.",
      "Export as a stencil or send to an artist for final touches.",
    ],
  },
  {
    n: "04",
    word: "Connect",
    body: [
      "Match with vetted artists who actually do this style. We rank by portfolio fit, location, and availability — not by who paid for placement.",
      "Book the chair through the platform. Pay the deposit. Show up. Get inked.",
    ],
  },
];

export default function AboutPage() {
  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span><span className="text-pink">●</span>&nbsp;&nbsp;How It Works</span>
          <span>04&nbsp;<span className="text-pink">steps</span></span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <SlashHeadline
            before={<>From idea<br />to</>}
            slashed="ink"
            sizeClassName="text-[56px] sm:text-[88px] md:text-[120px] leading-[0.88]"
          />
          <p className="mt-8 text-[15px] text-white/70 font-body max-w-xl leading-[1.55]">
            Four steps. No bullshit. Here&rsquo;s how TatT works.
          </p>
        </div>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.n} className="px-6 md:px-12 py-20 md:py-28 border-t-2 hairline">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
            <div className="md:col-span-3">
              <div className="sticker inline-block px-4 py-2">
                <div className="font-display text-[14px] tracking-widest leading-none">
                  Step&nbsp;{s.n}
                </div>
                <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-1">
                  Of&nbsp;04
                </div>
              </div>
            </div>
            <div className="md:col-span-9">
              <SlashHeadline
                as="h2"
                before={<span className="text-pink">{s.n}.</span>}
                slashed={s.word}
                period={false}
                sizeClassName="text-[64px] sm:text-[96px] md:text-[120px] leading-[0.88]"
              />
              <div className="mt-8 space-y-4 max-w-xl">
                {s.body.map((p, i) => (
                  <p key={i} className="text-[15px] text-white/70 font-body leading-[1.6]">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="px-6 md:px-12 py-24 border-t-2 hairline">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-display text-white text-[40px] sm:text-[64px] leading-[0.95]">
            Ready?
            <span className="text-pink">.</span>
          </h2>
          <Link
            href="/generate/stencil"
            className="mt-10 tape press inline-flex items-center justify-center px-10 py-5 font-display text-[28px] sm:text-[38px] leading-none tracking-[0.02em]"
          >
            Start Forging
            <span className="ml-3 text-[20px]">▸</span>
          </Link>
        </div>
      </section>
    </StudioShell>
  );
}
