/**
 * Gear 1 — the Studio's default surface (ADR-0038).
 *
 * The canvas, one instruction line in SketchBot's voice, and a box for plain
 * words. No tool vocabulary and no palette: circle the part that's wrong, say
 * what's wrong, the region gets redrawn. Everything underneath — masks,
 * layers, blend modes — still executes; it is simply never shown here.
 *
 * Phone-native by construction: the gesture is a thumb drag or a tap, the
 * controls are 44px, and nothing needs precision pointing.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import RegionCanvas from './RegionCanvas';
import BeforeAfterReview from './BeforeAfterReview';
import { hasRegion } from '../services/regionMask';
import {
    ALLOWANCE_SPENT_CTA,
    REGION_READY_LINE,
    REFINERY_OPENER
} from '../services/refineryVoice';

export default function PointAndSay({ imageUrl, refinement, seed = null }) {
    const [points, setPoints] = useState([]);
    const [instruction, setInstruction] = useState('');
    const [appliedSeed, setAppliedSeed] = useState(null);
    const inputRef = useRef(null);

    // Gear 2 hands its plain-language tools down as a seeded instruction —
    // same surface, same gesture, fewer words to type. Adjusted during render
    // (each tap is a fresh object) rather than in an effect, so there is no
    // cascading second render.
    if (seed && seed !== appliedSeed) {
        setAppliedSeed(seed);
        setInstruction(seed.instruction || '');
    }

    useEffect(() => {
        if (appliedSeed) inputRef.current?.focus();
    }, [appliedSeed]);

    const { allowance, atCapacity, line, pending, status } = refinement;
    const busy = status === 'working';
    const reviewing = status === 'review' && pending;
    const selected = hasRegion(points);
    const blocked = allowance.exhausted || atCapacity;

    const handleSubmit = async (event) => {
        event.preventDefault();
        const applied = await refinement.refine({ points, instruction });
        if (applied) setInstruction('');
    };

    const handleKeep = () => {
        refinement.keep();
        setPoints([]);
    };

    const handleRevert = () => {
        refinement.revert();
        setPoints([]);
    };

    return (
        <section aria-label="Point and say" className="space-y-4">
            <p
                data-testid="sketchbot-line"
                role="status"
                aria-live="polite"
                className="font-body text-[15px] leading-[1.5] text-white/80"
            >
                {line || (selected ? REGION_READY_LINE : REFINERY_OPENER)}
            </p>

            <RegionCanvas
                imageUrl={imageUrl}
                points={points}
                onPointsChange={setPoints}
                disabled={busy || Boolean(reviewing)}
            />

            {reviewing ? (
                <BeforeAfterReview
                    before={pending.before}
                    after={pending.after}
                    onKeep={handleKeep}
                    onRevert={handleRevert}
                />
            ) : blocked ? (
                // The ceiling is a door, not a wall: a real link into finding
                // an artist. Never a paywall, never silence (ADR-0038).
                <div data-testid="refinery-blocked" className="border-2 border-pink bg-black p-4">
                    <Link
                        href="/smart-match"
                        className="press inline-flex min-h-[44px] items-center justify-center px-6 bg-pink text-black font-display uppercase text-[14px] tracking-[0.2em]"
                    >
                        {ALLOWANCE_SPENT_CTA}
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <label htmlFor="refinery-instruction" className="sr-only">
                        What&apos;s wrong with that part?
                    </label>
                    <textarea
                        id="refinery-instruction"
                        ref={inputRef}
                        value={instruction}
                        onChange={(event) => setInstruction(event.target.value)}
                        placeholder="the hand is mangled — give it four fingers and a thumb"
                        rows={2}
                        className="w-full min-h-[44px] bg-black border-2 hairline focus:border-pink px-4 py-3 text-[15px] text-white font-body focus:outline-none placeholder-white/30"
                    />
                    <button
                        type="submit"
                        disabled={busy || !selected || !instruction.trim()}
                        className="press w-full min-h-[44px] bg-pink text-black font-display uppercase text-[14px] tracking-[0.2em] disabled:bg-white/15 disabled:text-white/40"
                    >
                        {busy ? 'redrawing…' : 'redraw that bit'}
                    </button>
                </form>
            )}
        </section>
    );
}
