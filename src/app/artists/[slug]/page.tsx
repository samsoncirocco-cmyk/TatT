import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import FavoriteButton from "@/components/punk/FavoriteButton";

const TILE_COLORS = [
  "bg-pink", "bg-bone", "bg-cream",
  "bg-pink-deep", "bg-white/10", "bg-pink",
  "bg-cream", "bg-bone", "bg-white/5",
];

function slugToName(slug: string) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = slugToName(slug);

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <Link href="/artists" className="hover:text-pink">
            ←&nbsp;Roster
          </Link>
          <span>
            Profile&nbsp;/&nbsp;<span className="text-pink">{slug}</span>
          </span>
        </div>
      </div>

      {/* HERO */}
      <div className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          <div className="md:col-span-5">
            <div className="aspect-[3/4] bg-pink border-2 hairline relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70 mix-blend-multiply" />
              <div className="absolute top-3 right-3 sticker px-3 py-1 z-10">
                <div className="font-display text-[11px] tracking-widest leading-none">
                  Verified
                </div>
                <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
                  Studio&nbsp;Approved
                </div>
              </div>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-white text-[56px] sm:text-[80px] md:text-[96px] leading-[0.88] tracking-[0.005em]">
                {name}
                <span className="text-pink">.</span>
              </h1>
              <FavoriteButton slug={slug} label={name} size={28} className="mt-2 shrink-0" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/60 font-body">
              <span>Brooklyn, NY</span>
              <span className="text-pink">●</span>
              <span>Fineline / Botanical</span>
              <span className="text-pink">●</span>
              <span>8&nbsp;yrs</span>
            </div>
            <p className="mt-8 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
              Specializing in delicate fineline botanical work and bold blackwork.
              {" "}
              <span className="scribble text-pink">Walk-ins by appointment.</span>
            </p>

            {/* TABS */}
            <div className="mt-10 flex gap-0 border-b-2 hairline">
              {["Portfolio", "About", "Book"].map((t, i) => (
                <button
                  key={t}
                  className={`px-5 py-3 font-display text-[16px] tracking-wide press border-r hairline ${
                    i === 0
                      ? "bg-pink text-black"
                      : "text-white/70 hover:text-pink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PORTFOLIO GRID */}
      <div className="px-6 md:px-12 pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-white text-[24px] tracking-wide">
              Portfolio
            </h2>
            <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body tabular-nums">
              09&nbsp;pieces
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {TILE_COLORS.map((c, i) => (
              <div
                key={i}
                className={`aspect-square ${c} border-2 hairline press relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 mix-blend-multiply" />
                <span className="absolute bottom-2 left-2 text-[9px] uppercase tracking-[0.2em] text-white/70 font-body tabular-nums">
                  #{String(i + 1).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FLOATING CTA */}
      <div className="sticky bottom-6 z-30 px-6 md:px-12 pointer-events-none">
        <div className="max-w-6xl mx-auto flex justify-end">
          <Link
            href="/book"
            className="tape press inline-flex items-center justify-center px-8 py-4 font-display text-[24px] sm:text-[32px] leading-none tracking-[0.02em] pointer-events-auto"
          >
            Book Consultation
            <span className="ml-3 text-[18px]">▸</span>
          </Link>
        </div>
      </div>
    </StudioShell>
  );
}
