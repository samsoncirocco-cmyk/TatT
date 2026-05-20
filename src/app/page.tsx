import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";

const STEPS = [
  {
    n: "01",
    title: "Describe",
    body: "Type one sentence. Subject, placement, mood. We'll handle the noise.",
  },
  {
    n: "02",
    title: "Generate",
    body: "AI cuts four passes in seconds. Pick the one that bites. Iterate or ship.",
  },
  {
    n: "03",
    title: "Connect",
    body: "Match with vetted artists who actually do this style. Book the chair.",
  },
];

const FEATURED = [
  { name: "Kira Volkov", city: "Brooklyn, NY", style: "Fineline", color: "bg-pink" },
  { name: "Diego Marin", city: "Mexico City", style: "Traditional", color: "bg-bone" },
  { name: "Astrid Holm", city: "Berlin, DE", style: "Blackwork", color: "bg-cream" },
  { name: "Yuki Tanaka", city: "Osaka, JP", style: "Irezumi", color: "bg-pink-deep" },
];

export default function Home() {
  return (
    <StudioShell>
      <div className="flex flex-col">
        {/* HERO */}
        <section className="px-6 md:px-12 py-20 md:py-32 relative">
          <div className="max-w-5xl mx-auto relative">
            <div className="hidden md:block absolute -top-2 right-4 sticker px-3 py-1 z-10">
              <div className="font-display text-[11px] tracking-widest leading-none">
                NEW
              </div>
              <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
                Side&nbsp;B&nbsp;Out&nbsp;Now
              </div>
            </div>

            <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-6 font-body rise rise-1">
              ▸&nbsp;Think it. Ink it.
            </div>

            <h1 className="rise rise-2 font-display text-white text-balance leading-[0.88] tracking-[0.005em] text-[72px] sm:text-[112px] md:text-[148px]">
              Tattoo
              <br />
              your&nbsp;
              <span className="slash"><span>way</span></span>
              <span className="text-pink">.</span>
            </h1>

            <p className="rise rise-3 mt-10 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
              The AI tattoo studio that doesn&rsquo;t flinch. Describe the ink you
              want, get four cuts back, then{" "}
              <span className="scribble text-pink">find the artist</span> who can land it.
            </p>

            <div className="rise rise-4 mt-12 flex flex-col sm:flex-row sm:items-stretch gap-6">
              <Link
                href="/generate/stencil"
                className="tape press inline-flex items-center justify-center px-10 py-5 font-display text-[28px] sm:text-[38px] leading-none tracking-[0.02em] self-start"
              >
                Start Your Design
                <span className="ml-3 text-[20px]">▸</span>
              </Link>
              <Link
                href="/artists"
                className="text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-6 py-5 press font-body self-start inline-flex items-center"
              >
                Browse Artists&nbsp;&nbsp;→
              </Link>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="px-6 md:px-12 py-20 md:py-28 border-t-2 hairline">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-12">
              <h2 className="font-display text-white text-[32px] md:text-[48px] tracking-wide leading-none">
                How it works
              </h2>
              <span className="text-[10px] uppercase tracking-[0.25em] text-pink tabular-nums font-body">
                03&nbsp;steps
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {STEPS.map((s, i) => (
                <div key={s.n} className="relative">
                  <div className="sticker inline-block px-4 py-2 mb-6">
                    <div className="font-display text-[14px] tracking-widest leading-none">
                      Step&nbsp;{s.n}
                    </div>
                    <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-1">
                      {s.title}
                    </div>
                  </div>
                  <h3 className="font-display text-white text-[36px] md:text-[48px] tracking-wide leading-[0.95]">
                    {i === 1 ? (
                      <>
                        <span className="slash"><span>{s.title}</span></span>
                        <span className="text-pink">.</span>
                      </>
                    ) : (
                      <>
                        {s.title}
                        <span className="text-pink">.</span>
                      </>
                    )}
                  </h3>
                  <p className="mt-4 text-[14px] text-white/70 font-body leading-[1.55] max-w-[280px]">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED ARTISTS */}
        <section className="px-6 md:px-12 py-20 md:py-28 border-t-2 hairline">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-12">
              <h2 className="font-display text-white text-[32px] md:text-[48px] tracking-wide leading-none">
                Featured artists
              </h2>
              <Link
                href="/artists"
                className="text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-pink font-body"
              >
                See all&nbsp;&nbsp;→
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {FEATURED.map((a) => (
                <Link
                  key={a.name}
                  href={`/artists/${a.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="block group press"
                >
                  <div
                    className={`aspect-[3/4] ${a.color} border-2 hairline mb-4 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 mix-blend-multiply opacity-80 bg-gradient-to-b from-transparent to-black/60" />
                    <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.2em] text-white/80 font-body">
                      {a.style}
                    </span>
                  </div>
                  <div className="font-display text-[20px] tracking-wide text-white group-hover:text-pink">
                    {a.name}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-body mt-1">
                    {a.city}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </StudioShell>
  );
}
