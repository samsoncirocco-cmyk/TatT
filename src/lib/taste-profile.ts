/**
 * taste-profile — "your ink identity (so far)".
 *
 * Derives a taste summary from data ALREADY on this device: the local
 * design library (style signal extracted from saved prompts via
 * design-style-signal) and pinned artists whose styles happen to be
 * cached locally in the persisted match deck. Pure functions, no I/O.
 *
 * BOUNDARY (ADR-0022, log now / personalize later): everything here
 * computes client-side from localStorage-backed state. No new APIs, no
 * server-side taste profile, nothing leaves the device. The cross-session
 * / SMS "global taste" lane owns any server profile — this module must
 * never grow a fetch.
 */

import {
  stylesFromDescriptors,
  type CanonicalStyle,
} from "./design-style-signal";
import { resolveCanonicalStyle } from "./style-vocabulary";
import { artistSlug } from "./artist-slug";

/** Below this many local data points the card does not render at all —
 *  no cold-start fakery, no "profiles" invented from a single save. */
export const MIN_TASTE_DATA_POINTS = 2;

/** At or below this many data points the card labels itself an early read. */
export const EARLY_READ_MAX_DATA_POINTS = 4;

/** Max styles carried into the smart-match handoff — mirrors the
 *  MAX_SIGNAL_STYLES cap in design-style-signal. */
const MAX_TASTE_STYLES = 3;

export type TasteDesignInput = {
  prompt: string;
  title?: string;
};

/** One pinned artist's locally-known styles (already canonical or not). */
export type TastePinInput = {
  styles: string[];
};

export type StyleLeaning = {
  style: CanonicalStyle;
  count: number;
};

export type PaletteLeaning = "blackwork" | "color";

export type TasteProfile = {
  /** Designs + pins that fed the read (the honest denominator). */
  dataPoints: number;
  designCount: number;
  pinCount: number;
  /** Top style leanings, strongest first, capped at MAX_TASTE_STYLES. */
  topStyles: StyleLeaning[];
  /** Black-ink vs color leaning from the prompts; null when nothing says. */
  palette: PaletteLeaning | null;
  /** One derived in-voice line, e.g. "you keep coming back to blackwork — 4 of 6 saves". */
  line: string;
  /** True while the read is still small-n; the card says so out loud. */
  earlyRead: boolean;
};

// Palette leaning is read from the prompt text itself — TattDesign carries
// no structured palette metadata, so only explicit wording counts. One vote
// per design, never per keyword.
const BLACK_INK_PATTERN =
  /blackwork|black\s?work|black\s*(?:&|and|n)\s*gr[ae]y|black\s?ink|linework|dotwork|fine[\s-]?line|single[\s-]?needle/i;
const COLOR_PATTERN =
  /water[\s-]?colou?r|colou?rful|full[\s-]?colou?r|in\s+colou?r|vibrant|rainbow|pastel/i;

/**
 * Cross-reference the persisted match deck with pinned favorites to
 * recover the styles of pinned artists — using only what the device
 * already knows. Favorites store profile slugs (`<kebab-name>--<id>`),
 * the match store keys by artistId; artistSlug bridges the two exactly
 * the way the swipe deck built the pin in the first place.
 */
export function pinnedArtistStyles(
  matches: Array<{ artistId: string; artistName: string; styles?: string[]; tags?: string[] }>,
  favoriteSlugs: string[],
): TastePinInput[] {
  if (!matches.length || !favoriteSlugs.length) return [];
  const pinned = new Set(favoriteSlugs);
  const out: TastePinInput[] = [];
  for (const m of matches) {
    if (!pinned.has(artistSlug(m.artistName, m.artistId))) continue;
    const styles = m.styles?.length ? m.styles : (m.tags ?? []);
    if (styles.length) out.push({ styles });
  }
  return out;
}

function unitWord(pinCount: number): string {
  return pinCount > 0 ? "saves & pins" : "saves";
}

/**
 * Derive the taste profile, or null when there is not enough local signal
 * to say anything honest (fewer than MIN_TASTE_DATA_POINTS data points,
 * or no design/pin maps to a canonical style). Null means: no card.
 */
export function deriveTasteProfile(
  designs: TasteDesignInput[],
  pins: TastePinInput[] = [],
): TasteProfile | null {
  // Count each style once per design / once per pinned artist.
  const counts = new Map<CanonicalStyle, number>();
  const bump = (style: CanonicalStyle) =>
    counts.set(style, (counts.get(style) ?? 0) + 1);

  let blackVotes = 0;
  let colorVotes = 0;

  for (const d of designs) {
    const text = [d.prompt, d.title ?? ""].join(" ");
    for (const style of stylesFromDescriptors([text])) bump(style);
    if (BLACK_INK_PATTERN.test(text)) blackVotes += 1;
    if (COLOR_PATTERN.test(text)) colorVotes += 1;
  }

  // Pins only count as data points when they carry a style the canonical
  // vocabulary recognizes — a pin the device knows nothing about is not
  // a taste signal.
  let pinCount = 0;
  for (const pin of pins) {
    const canonical = new Set<CanonicalStyle>();
    for (const raw of pin.styles) {
      const style = resolveCanonicalStyle(raw);
      if (style) canonical.add(style);
    }
    if (canonical.size === 0) continue;
    pinCount += 1;
    for (const style of canonical) bump(style);
  }

  const designCount = designs.length;
  const dataPoints = designCount + pinCount;
  if (dataPoints < MIN_TASTE_DATA_POINTS) return null;

  // Strongest first; ties keep insertion order (first style seen wins),
  // which is stable and honest — no invented ranking within a tie.
  const topStyles: StyleLeaning[] = [...counts.entries()]
    .map(([style, count]) => ({ style, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TASTE_STYLES);

  // Enough saves but none of them map to a style the graph can answer
  // with — there is no read to show, so show nothing.
  if (topStyles.length === 0) return null;

  const palette: PaletteLeaning | null =
    blackVotes > colorVotes ? "blackwork" : colorVotes > blackVotes ? "color" : null;

  // The one derived in-voice line. Three honest shapes: a dead heat names
  // both sides, a single hit only "leans", and a real streak gets the
  // "keep coming back" claim.
  const unit = unitWord(pinCount);
  const [first, second] = topStyles;
  let line: string;
  if (second && second.count === first.count) {
    line = `torn between ${first.style.toLowerCase()} and ${second.style.toLowerCase()} — ${first.count} each`;
  } else if (first.count === 1) {
    line = `leaning ${first.style.toLowerCase()} — 1 of ${dataPoints} ${unit}`;
  } else {
    line = `you keep coming back to ${first.style.toLowerCase()} — ${first.count} of ${dataPoints} ${unit}`;
  }

  return {
    dataPoints,
    designCount,
    pinCount,
    topStyles,
    palette,
    line,
    earlyRead: dataPoints <= EARLY_READ_MAX_DATA_POINTS,
  };
}

/**
 * Build the /smart-match handoff URL carrying the profile's top styles —
 * the same ?styles= contract the deck entry point already parses
 * (parseStylesParam accepts canonical names verbatim).
 */
export function smartMatchUrlForTaste(profile: TasteProfile): string {
  const styles = profile.topStyles.map((s) => s.style);
  if (styles.length === 0) return "/smart-match";
  return `/smart-match?${new URLSearchParams({ styles: styles.join(",") }).toString()}`;
}
