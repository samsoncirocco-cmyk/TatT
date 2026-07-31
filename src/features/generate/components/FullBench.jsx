/**
 * Gear 3 — the full bench, behind an explicit door (ADR-0038).
 *
 * Everything the Studio has always had — layer stack, blend modes, version
 * timeline and compare, element regeneration, stencil export — lives on the
 * other side of one clearly labelled entrance. Nobody stumbles in; anybody may
 * walk in. This is ADR-0017's "power tools behind explicit doors" applied
 * inside the Studio: a re-parenting, not a deletion.
 *
 * On a narrow viewport the door is replaced by an honest sentence in
 * SketchBot's voice — the bench is not rendered at all there.
 */

import { useState } from 'react';
import { useIsDesktop } from '../hooks/useIsDesktop';
import {
    FULL_BENCH_CLOSE_LABEL,
    FULL_BENCH_DOOR_LABEL,
    FULL_BENCH_MOBILE_LINE
} from '../services/refineryVoice';

export default function FullBench({ children }) {
    const isDesktop = useIsDesktop();
    const [open, setOpen] = useState(false);

    if (!isDesktop) {
        return (
            <p
                data-testid="full-bench-mobile-note"
                className="font-body text-[13px] leading-[1.55] text-white/50"
            >
                {FULL_BENCH_MOBILE_LINE}
            </p>
        );
    }

    return (
        <div data-testid="full-bench">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-controls="full-bench-panel"
                className="press min-h-[44px] px-5 border hairline-white font-body text-[11px] lowercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink hover:border-pink"
            >
                {open ? FULL_BENCH_CLOSE_LABEL : FULL_BENCH_DOOR_LABEL}
            </button>

            {open && (
                <div id="full-bench-panel" data-testid="full-bench-panel" className="mt-6">
                    {children}
                </div>
            )}
        </div>
    );
}
