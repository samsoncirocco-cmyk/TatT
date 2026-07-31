/**
 * The refinement loop behind gears 1 and 2 (ADR-0038).
 *
 * Region + typed instruction → the existing inpainting pipeline → before/after
 * → keep or revert. There is deliberately no new generation path here: every
 * fix goes through `inpaintTattooDesign`, which posts to `/api/predictions`,
 * which already carries the auth check, the generation rate limit, and the
 * global budget (checkBudget/recordSpend). The per-design fix allowance is a
 * second fence in front of that same pool, not a separate wallet.
 *
 * Two refusals, both spoken (never silent, never a paywall):
 * - allowance spent → the booking prompt, and no call is made;
 * - global budget spent → the honest "at capacity" line.
 */

import { useCallback, useState } from 'react';
import {
  inpaintTattooDesign,
  INPAINT_BUDGET_EXHAUSTED
} from '../../inpainting/services/inpaintingService';
import { buildRegionMask } from '../services/regionMask';
import { fixAllowanceState, recordFixUsed } from '../../../lib/studio-fix-allowance';
import {
  ALLOWANCE_SPENT_LINE,
  AT_CAPACITY_LINE,
  BEFORE_AFTER_LINE,
  KEPT_LINE,
  REFINEMENT_FAILED_LINE,
  REVERTED_LINE,
  WORKING_LINE,
  fixesLeftLine
} from '../services/refineryVoice';

/** Mask resolution — matches the width/height the inpainting model is sent. */
const MASK_SIZE = 1024;

export function useRefinement({ designId, imageUrl, onApply, initialLine = '' }) {
    const [allowance, setAllowance] = useState(() => fixAllowanceState(designId));
    const [status, setStatus] = useState('idle'); // idle | working | review
    const [pending, setPending] = useState(null); // { before, after }
    const [line, setLine] = useState(initialLine);
    const [atCapacity, setAtCapacity] = useState(false);

    const refine = useCallback(async ({ points, instruction }) => {
        const trimmed = (instruction || '').trim();
        if (!trimmed || !imageUrl || status === 'working') return null;

        // Both refusals happen before any paid call.
        if (atCapacity) {
            setLine(AT_CAPACITY_LINE);
            return null;
        }
        if (allowance.exhausted) {
            setLine(ALLOWANCE_SPENT_LINE);
            return null;
        }

        const maskCanvas = buildRegionMask(points, MASK_SIZE, MASK_SIZE);
        if (!maskCanvas) {
            setLine(REFINEMENT_FAILED_LINE);
            return null;
        }

        setStatus('working');
        setLine(WORKING_LINE);

        try {
            const result = await inpaintTattooDesign({
                imageUrl,
                maskCanvas,
                prompt: trimmed
            });

            // Only a render that came back counts against the allowance.
            const used = recordFixUsed(designId);
            setAllowance((prev) => ({
                ...prev,
                used,
                remaining: Math.max(0, prev.allowance - used),
                exhausted: prev.allowance - used <= 0
            }));

            setPending({ before: imageUrl, after: result });
            setStatus('review');
            setLine(BEFORE_AFTER_LINE);
            return result;
        } catch (error) {
            setStatus('idle');
            if (error?.code === INPAINT_BUDGET_EXHAUSTED) {
                setAtCapacity(true);
                setLine(AT_CAPACITY_LINE);
            } else {
                setLine(REFINEMENT_FAILED_LINE);
            }
            return null;
        }
    }, [allowance, atCapacity, designId, imageUrl, status]);

    const keep = useCallback(() => {
        if (!pending) return;
        onApply?.(pending.after);
        setPending(null);
        setStatus('idle');
        setLine(`${KEPT_LINE} ${fixesLeftLine(allowance.remaining)}`);
    }, [allowance.remaining, onApply, pending]);

    const revert = useCallback(() => {
        if (!pending) return;
        setPending(null);
        setStatus('idle');
        setLine(REVERTED_LINE);
    }, [pending]);

    return {
        allowance,
        atCapacity,
        status,
        pending,
        line,
        setLine,
        refine,
        keep,
        revert
    };
}

export default useRefinement;
