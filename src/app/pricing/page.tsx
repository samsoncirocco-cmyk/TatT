import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    sub: "/forever",
    cta: "Start Free",
    href: "/signup?tier=free",
    features: [
      "5 generations / month",
      "Standard SDXL model",
      "Watermarked exports",
      "Browse artists",
      "Community support",
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: "$19",
    sub: "/month",
    cta: "Go Pro",
    href: "/signup?tier=pro",
    features: [
      "Unlimited generations",
      "Imagen 3 + RGBA layers",
      "No watermark",
      "Artist match priority",
      "Email support",
    ],
    popular: true,
  },
  {
    name: "Studio",
    price: "$79",
    sub: "/month",
    cta: "Open Studio",
    href: "/signup?tier=studio",
    features: [
      "Everything in Pro",
      "Multi-seat (up to 5)",
      "API access",
      "Custom model training",
      "Direct support line",
    ],
    popular: false,
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
          <span>USD&nbsp;/&nbsp;<span className="text-pink">3&nbsp;tiers</span></span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-white text-[48px] md:text-[88px] leading-[0.88] tracking-[0.005em]">
            Pick your&nbsp;<span className="slash"><span>tier</span></span>
            <span className="text-pink">.</span>
          </h1>
          <p className="mt-6 text-[15px] text-white/70 font-body max-w-xl leading-[1.55]">
            No contracts. No fine print. Cancel any time.{" "}
            <span className="scribble text-pink">No tricks.</span>
          </p>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`relative border-2 hairline bg-black p-8 ${
                  t.popular ? "border-pink" : ""
                }`}
              >
                {t.popular && (
                  <div className="absolute -top-3 -right-3 tape px-3 py-1 font-display text-[12px] tracking-[0.2em] leading-none rotate-[8deg]">
                    Most Popular
                  </div>
                )}

                <div className="sticker inline-block px-3 py-1 mb-6">
                  <div className="font-display text-[11px] tracking-widest leading-none">
                    {t.name}
                  </div>
                  <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
                    Tier
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-display text-white text-[64px] leading-none tabular-nums">
                    {t.price}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-body">
                    {t.sub}
                  </span>
                </div>

                <ul className="mt-8 space-y-3 border-t hairline pt-6">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="text-[13px] text-white/70 font-body leading-[1.5] flex gap-3"
                    >
                      <span className="text-pink">▸</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={t.href}
                  className={`mt-8 inline-flex items-center justify-center w-full px-6 py-4 font-display text-[20px] leading-none tracking-[0.02em] press ${
                    t.popular
                      ? "tape"
                      : "border-2 hairline text-white hover:text-black hover:bg-pink hover:border-pink"
                  }`}
                >
                  {t.cta}
                  <span className="ml-2 text-[14px]">▸</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
