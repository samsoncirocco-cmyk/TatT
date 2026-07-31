/**
 * The keep-or-revert beat (ADR-0038).
 *
 * A fix is never applied silently: the redraw comes back side by side with
 * what it replaced, and the design only changes when the user says so.
 */

export default function BeforeAfterReview({ before, after, onKeep, onRevert }) {
    return (
        <div data-testid="before-after" className="border-2 border-pink bg-black p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <figure className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={before} alt="Before this fix" className="w-full h-auto block border hairline" />
                    <figcaption className="text-[10px] font-body uppercase tracking-[0.25em] text-white/40">
                        before
                    </figcaption>
                </figure>
                <figure className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={after} alt="After this fix" className="w-full h-auto block border-2 border-pink" />
                    <figcaption className="text-[10px] font-body uppercase tracking-[0.25em] text-pink">
                        after
                    </figcaption>
                </figure>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    type="button"
                    onClick={onKeep}
                    className="press flex-1 min-h-[44px] bg-pink text-black font-display uppercase text-[14px] tracking-[0.2em]"
                >
                    keep it
                </button>
                <button
                    type="button"
                    onClick={onRevert}
                    className="press flex-1 min-h-[44px] border hairline-white font-body uppercase text-[11px] tracking-[0.25em] text-white/80 hover:bg-white/10"
                >
                    put it back
                </button>
            </div>
        </div>
    );
}
