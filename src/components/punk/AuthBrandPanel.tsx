/**
 * Left-hand brand panel for the auth split layout — studio photo at
 * half opacity under the halftone, bottom scrim, big display line and
 * a testimonial. Server-safe (no client hooks).
 */
type Props = {
  quote: string;
  attribution: string;
};

export default function AuthBrandPanel({ quote, attribution }: Props) {
  return (
    <div className="relative hidden lg:block overflow-hidden border-r-2 hairline">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover opacity-50"
      />
      <div className="halftone absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,#0a0a0a_10%,transparent_55%)]" />
      <div className="relative z-[2] h-full flex flex-col justify-end p-12">
        <div className="font-display text-white text-[64px] xl:text-[80px] leading-[0.88]">
          Think it.
          <br />
          <span className="slash"><span>Ink it</span></span>
          <span className="text-pink">.</span>
        </div>
        <p className="mt-8 max-w-sm text-[13px] leading-[1.6] text-white/70 font-body">
          &ldquo;{quote}&rdquo;
        </p>
        <div className="mt-4 text-[10px] uppercase tracking-[0.25em] text-pink font-body">
          ▸&nbsp;{attribution}
        </div>
      </div>
    </div>
  );
}
