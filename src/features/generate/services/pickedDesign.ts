/**
 * The design the Studio was entered with (ADR-0038).
 *
 * The Studio is the refinery: it is entered from a picked design, never from
 * cold. The surface itself takes the design as props; this module is the
 * fallback seam for entry points that can only hand it over through storage
 * (the design session's handoff card, a cut card's "fine-tune" action). Kept
 * in sessionStorage so a picked design does not outlive the tab that picked it.
 */

export const PICKED_DESIGN_STORAGE_KEY = 'tatt:studio-design';

export interface PickedDesign {
  id: string;
  imageUrl: string;
  prompt?: string;
  style?: string;
  bodyPart?: string;
}

export function readPickedDesign(): PickedDesign | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PICKED_DESIGN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.imageUrl !== 'string' || !parsed.imageUrl) return null;
    return {
      id: typeof parsed.id === 'string' && parsed.id ? parsed.id : parsed.imageUrl,
      imageUrl: parsed.imageUrl,
      prompt: typeof parsed.prompt === 'string' ? parsed.prompt : undefined,
      style: typeof parsed.style === 'string' ? parsed.style : undefined,
      bodyPart: typeof parsed.bodyPart === 'string' ? parsed.bodyPart : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * The `?design=` id the Studio route carries (`/studio?design=…`). Read from
 * the URL rather than from `useSearchParams` so the refinery surface stays
 * usable outside a Next router — the route itself owns the param.
 */
export function readPickedDesignId(): string | null {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('design');
  return id || null;
}

export function writePickedDesign(design: PickedDesign): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(PICKED_DESIGN_STORAGE_KEY, JSON.stringify(design));
  } catch {
    /* a full storage quota must not block entering the Studio */
  }
}
