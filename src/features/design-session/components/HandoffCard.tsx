import Link from 'next/link';
import type { DesignSession } from '@/services/designSession/types';

/**
 * The hard stop (ADR-0013). Shows the refined design plus the brief the
 * artist will actually receive — placement, styles, their meaning quoted
 * back, and any placement concerns surfaced honestly (ADR-0014). There is
 * deliberately NO regenerate/refine-again affordance here: refinement from
 * this point belongs to the canvas and the artist consult.
 */
export function HandoffCard({ session }: { session: DesignSession }) {
  const brief = session.brief;
  const placement = brief?.placement ?? session.intake.placement;
  const styleTags = brief?.styleTags ?? session.intake.styleTags;
  const meaning = brief?.meaning ?? session.intake.meaning;
  const placementNotes = brief?.placementNotes ?? [];
  const imageUrl = session.refinedVariation?.imageUrl;

  return (
    <div className="border-2 hairline bg-white/[0.02]">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- provider CDN image; next/image needs domain config
        <img src={imageUrl} alt="Your refined design" className="block w-full object-cover" />
      )}
      <div className="p-5 space-y-5">
        <h2 className="font-display uppercase tracking-wide text-[20px] text-white leading-none">
          This one&rsquo;s yours<span className="text-pink">.</span>
        </h2>

        <dl className="space-y-3 font-body text-[13px] leading-[1.55]">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.25em] text-white/50">Placement</dt>
            <dd className="text-white/90 mt-1">{placement}</dd>
          </div>
          {styleTags.length > 0 && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.25em] text-white/50">Styles</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {styleTags.map((tag) => (
                  <span
                    key={tag}
                    className="border hairline px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-[10px] uppercase tracking-[0.25em] text-white/50">What it means to you</dt>
            <dd className="text-white/90 mt-1">&ldquo;{meaning}&rdquo;</dd>
          </div>
        </dl>

        {placementNotes.length > 0 && (
          <div className="border hairline p-3 space-y-2">
            <div className="font-body text-[10px] uppercase tracking-[0.25em] text-pink">
              Straight talk for the consult
            </div>
            <ul className="font-body text-[13px] leading-[1.55] text-white/80 space-y-1">
              {placementNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="font-body text-[13px] leading-[1.55] text-white/70">
          This is where the bot stops. Last-mile tweaks happen on the canvas —
          the real refinement happens with your artist.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <Link
            href="/generate"
            className="tape press inline-flex items-center justify-center px-6 py-4 font-display text-[20px] leading-none tracking-[0.02em] uppercase"
          >
            Fine-tune on the canvas<span className="ml-3 text-[14px]">▸</span>
          </Link>
          <Link
            href="/smart-match"
            className="press inline-flex items-center justify-center px-6 py-4 border hairline font-body text-[11px] uppercase tracking-[0.25em] text-white/80 hover:bg-pink hover:text-black"
          >
            Find my artist
          </Link>
        </div>
      </div>
    </div>
  );
}
