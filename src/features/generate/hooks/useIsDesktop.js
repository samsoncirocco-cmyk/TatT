/**
 * Is there room for the full bench? (ADR-0038)
 *
 * Layer stacks and blend modes want pixels and a cursor, so gear 3 is
 * desktop-only and says so out loud rather than shipping a cramped phone
 * imitation. Measured in JS rather than by a CSS breakpoint because the
 * decision is not "hide it" — it is "offer a different, honest sentence".
 *
 * Starts false so the server render and the first paint agree with the phone
 * majority; the effect corrects it on a desktop.
 */

import { useEffect, useState } from 'react';

export const DESKTOP_MIN_WIDTH = 1024;

export function useIsDesktop(minWidth = DESKTOP_MIN_WIDTH) {
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const measure = () => setIsDesktop(window.innerWidth >= minWidth);
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [minWidth]);

    return isDesktop;
}

export default useIsDesktop;
