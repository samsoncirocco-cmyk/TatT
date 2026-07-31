/**
 * The one placement resolver.
 *
 * Placement arrives as free text from intake — "left arm", "inner left
 * forearm", "a kingdom hearts sleeve on my left arm" — never a bare enum.
 * Three separate functions used to interpret it, and two of them matched by
 * whole-string equality against a small keyed object:
 *
 *   - `getAnatomicalAspectRatio` (generation routing) matched phrases with
 *     word-boundary regexes and worked.
 *   - `getAspectRatioGuidance` (council) looked up `guidance[placement]`, so
 *     "left arm", "left forearm", "sleeve" and "inner forearm" all missed and
 *     returned the literal string 'balanced composition'.
 *   - `COUNCIL_SKILL_PACK.anatomicalFlow[placement]` had the same bug and
 *     returned 'body-part appropriate flow'.
 *
 * Net effect: every real conversational session produced prompts ending
 * "Composition follows balanced composition. Anatomical flow: body-part
 * appropriate flow." — placement contributed nothing at all. Only a bare
 * "forearm" ever hit, and no customer types that.
 *
 * So: one table, one matcher, three consumers. The regex/ranking approach
 * from routing is the one that worked, so it is the one that survives, and
 * the aspect-ratio half of this module is a deliberate byte-for-byte port —
 * routing's behavior must not shift while we fix the other two.
 */

// Type-only, so this never becomes a runtime cycle with the routing module
// inside that barrel — which imports this file back for the ratio matcher.
import type { AspectRatio } from '@/services/generation';

export type PlacementRegion = 'limb' | 'torso';

interface PlacementRule {
  /** Matched as `\bphrase(s)?\b` against the lowercased placement text. */
  phrase: string;
  region: PlacementRegion;
  /**
   * `null` means "this phrase has no aspect-ratio opinion" and the rule sits
   * out the ratio vote entirely. That is what keeps the guidance-only rules
   * below (shoulder, neck, ribcage, foot, sleeve, inner/outer forearm) from
   * changing a single routing decision: before this module existed they
   * matched nothing and fell through to the 9:16 default, and abstaining
   * reproduces that exactly rather than asserting a ratio nobody verified.
   */
  ratio: AspectRatio | null;
  /** Composition guidance — what shape the artwork should be. */
  composition: string;
  /** Anatomical flow — how the artwork should sit on the body. */
  flow: string;
}

const DEFAULT_ASPECT_RATIO: AspectRatio = '9:16';

/** Shared flow text, so limbs that behave alike cannot drift apart. */
const LIMB_FLOW = 'vertical flow, tapered composition, elongated, wraps around limb';
const JOINT_FLOW = 'radial composition, follows joint curvature, dynamic movement';
const WRAP_FLOW = 'wraps around the limb, curved flow, unbroken across the wrap';
const BAND_FLOW = 'banded flow, reads as a continuous ring around the limb';
const TORSO_FLOW = 'vertical flow, follows torso contour, symmetrical about the midline';

/**
 * Placement rules, most specific phrase first for readability only — the
 * matcher ranks them, it does not read them in order.
 *
 * The ratio-bearing entries are the ADR-0023 routing table verbatim. Do not
 * add, remove, or re-ratio one without a routing test to back it up.
 */
const PLACEMENT_RULES: readonly PlacementRule[] = [
  // ── Arms ────────────────────────────────────────────────────────────────
  {
    phrase: 'inner forearm',
    region: 'limb',
    ratio: null, // 'forearm' already carries 9:16 for any string containing this
    composition: 'vertical orientation on a narrow flat panel, a single column read (1:3 ratio)',
    flow: LIMB_FLOW,
  },
  {
    phrase: 'outer forearm',
    region: 'limb',
    ratio: null,
    composition: 'vertical orientation wrapping the outer curve of the arm (1:3 ratio)',
    flow: LIMB_FLOW,
  },
  {
    phrase: 'upper arm',
    region: 'limb',
    ratio: '9:16',
    composition: 'vertical orientation, wraps the curve of the upper arm (1:2 ratio)',
    flow: LIMB_FLOW,
  },
  {
    phrase: 'lower arm',
    region: 'limb',
    ratio: '9:16',
    composition: 'vertical orientation, tall narrow canvas (1:3 ratio)',
    flow: LIMB_FLOW,
  },
  {
    phrase: 'forearm',
    region: 'limb',
    ratio: '9:16',
    composition: 'vertical orientation, tall narrow canvas (1:3 ratio)',
    flow: LIMB_FLOW,
  },
  // Unspaced spellings customers actually type.
  {
    phrase: 'upperarm',
    region: 'limb',
    ratio: '9:16',
    composition: 'vertical orientation, wraps the curve of the upper arm (1:2 ratio)',
    flow: LIMB_FLOW,
  },
  {
    phrase: 'lowerarm',
    region: 'limb',
    ratio: '9:16',
    composition: 'vertical orientation, tall narrow canvas (1:3 ratio)',
    flow: LIMB_FLOW,
  },
  {
    phrase: 'bicep',
    region: 'limb',
    ratio: '9:16',
    composition: 'circular to oval, wraps around arm (1:1 ratio)',
    flow: WRAP_FLOW,
  },
  {
    phrase: 'tricep',
    region: 'limb',
    ratio: '9:16',
    composition: 'vertical panel on the back of the upper arm, wraps around arm (1:1 ratio)',
    flow: WRAP_FLOW,
  },
  {
    phrase: 'arm',
    region: 'limb',
    ratio: '9:16',
    composition: 'vertical orientation running the length of the arm, tall narrow canvas (1:2 ratio)',
    flow: LIMB_FLOW,
  },
  // ── Legs ────────────────────────────────────────────────────────────────
  {
    phrase: 'thigh',
    region: 'limb',
    ratio: '9:16',
    composition: 'vertical oval shape (1:2 ratio)',
    flow: LIMB_FLOW,
  },
  {
    phrase: 'calf',
    region: 'limb',
    ratio: '9:16',
    composition: 'vertical elongated (1:2 ratio)',
    flow: LIMB_FLOW,
  },
  {
    phrase: 'shin',
    region: 'limb',
    ratio: '9:16',
    composition: 'vertical orientation, elongated (1:3 ratio)',
    flow: LIMB_FLOW,
  },
  {
    phrase: 'leg',
    region: 'limb',
    ratio: '9:16',
    composition: 'vertical orientation running the length of the leg, elongated (1:2 ratio)',
    flow: LIMB_FLOW,
  },
  // ── Extremities — small and banded; square holds them better than portrait.
  {
    phrase: 'wrist',
    region: 'limb',
    ratio: '1:1',
    composition: 'narrow band wrapping the wrist, wider than tall (2:1 ratio)',
    flow: BAND_FLOW,
  },
  {
    phrase: 'ankle',
    region: 'limb',
    ratio: '1:1',
    composition: 'narrow band wrapping the ankle, wider than tall (2:1 ratio)',
    flow: BAND_FLOW,
  },
  {
    phrase: 'hand',
    region: 'limb',
    ratio: '1:1',
    composition: 'square to slightly tall (4:5 ratio)',
    flow: 'compact flow, follows the tendon lines, reads from the wrist outward',
  },
  {
    phrase: 'foot',
    region: 'limb',
    ratio: null,
    composition: 'horizontal landscape (3:2 ratio)',
    flow: 'flow follows the arch and the line of the toes',
  },
  // ── Joints ──────────────────────────────────────────────────────────────
  {
    phrase: 'shoulder',
    region: 'limb',
    ratio: null,
    composition: 'radial composition, follows joint curvature',
    flow: JOINT_FLOW,
  },
  {
    phrase: 'hip',
    region: 'torso',
    ratio: null,
    composition: 'radial composition sweeping over the hip curve (2:3 ratio)',
    flow: JOINT_FLOW,
  },
  // ── Torso — portrait, but wider than a limb. ────────────────────────────
  {
    phrase: 'chest',
    region: 'torso',
    ratio: '3:4',
    composition: 'square-ish format, slightly wider than tall (4:5 ratio)',
    flow: 'symmetrical, landscape, follows pectoral contour, centered focal point',
  },
  {
    phrase: 'stomach',
    region: 'torso',
    ratio: '3:4',
    composition: 'vertical, centred on the midline, follows the abdominal contour (4:5 ratio)',
    flow: TORSO_FLOW,
  },
  {
    phrase: 'sternum',
    region: 'torso',
    ratio: '3:4',
    composition: 'symmetrical vertical column on the centre line (1:2 ratio)',
    flow: TORSO_FLOW,
  },
  {
    phrase: 'back',
    region: 'torso',
    ratio: '3:4',
    composition: 'vertical rectangle, portrait orientation (2:3 ratio)',
    flow: 'symmetrical, massive scale, follows spine alignment, landscape',
  },
  {
    phrase: 'ribcage',
    region: 'torso',
    ratio: null,
    composition: 'vertical, follows torso contour (2:3 ratio)',
    flow: TORSO_FLOW,
  },
  {
    phrase: 'neck',
    region: 'torso',
    ratio: null,
    composition: 'vertical narrow column (1:4 ratio)',
    flow: 'vertical column flow, follows the neck line, tapered at both ends',
  },
];

/**
 * A sleeve is not a poster. Every other placement here describes a panel the
 * artwork sits inside; a sleeve describes a piece that has to run the length
 * of a limb, wrap all the way around it, and hold together as one story from
 * shoulder to wrist. Handing a sleeve request "centered emblematic
 * composition" produces four standalone medallions, which is what a
 * "kingdom hearts sleeve" request actually came back as.
 */
const SLEEVE_COMPOSITION =
  'a sleeve composition rather than a standalone emblem: one continuous vertical ' +
  'story running the length of the limb, elements joined by flowing transitions ' +
  '(smoke, water, drapery, foliage) instead of floating apart, a clear focal ' +
  'hierarchy with one dominant subject supported by secondary elements above and ' +
  'below it, and artwork that wraps continuously around the limb with no flat ' +
  'front-facing panel';

const SLEEVE_FLOW =
  'vertical story flow along the limb, connected transitions between elements, ' +
  'focal hierarchy from dominant subject down to supporting detail, continuous ' +
  'wrap around the arm with no seam or hard edge';

/**
 * Fallback for a placement we genuinely do not recognise.
 *
 * It must not be a tautology. "balanced composition" and "body-part
 * appropriate flow" told the model nothing while looking like they had; this
 * says the one thing that is true of an unmatched placement — the router will
 * render it 9:16, so ask for artwork that suits a tall frame on skin.
 */
const FALLBACK_COMPOSITION =
  'a portrait-oriented composition, taller than wide, proportioned to read clearly at tattoo scale';
const FALLBACK_FLOW =
  'flow that follows the contour of the placement, tapering toward the edges of the design';

const SLEEVE_PATTERN = /\b(?:sleeves?|full[ -]arm|full[ -]leg)\b/;
/**
 * "wears his heart on his sleeve" is a real tattoo meaning, and the meaning
 * text is one of the places we look for the sleeve signal. Disqualify the
 * idiom rather than mis-scale the piece.
 */
const SLEEVE_IDIOM_PATTERN = /\bon (?:my|your|his|her|their|the)\s+sleeve\b/;

export interface PlacementGuidance {
  /** Render aspect ratio (ADR-0023). */
  aspectRatio: AspectRatio;
  /** Composition guidance — what shape the artwork should be. */
  composition: string;
  /** Anatomical flow — how the artwork should sit on the body. */
  flow: string;
  /** True when the request reads as sleeve-scale work. */
  isSleeve: boolean;
  /** The rule phrase that won, or `null` when nothing matched. */
  matchedPhrase: string | null;
  region: PlacementRegion | null;
}

/** Limb outranks torso outright; ties inside a region go to the longer phrase. */
const outranksForRatio = (candidate: PlacementRule, incumbent: PlacementRule): boolean => {
  if (candidate.region !== incumbent.region) return candidate.region === 'limb';
  return candidate.phrase.length > incumbent.phrase.length;
};

const matches = (rule: PlacementRule, text: string): boolean =>
  new RegExp(`\\b${rule.phrase}s?\\b`).test(text);

/**
 * Placement → aspect ratio (ADR-0023).
 *
 * Two placements can both match, and the limb ALWAYS wins over the torso —
 * "back of the arm" is an arm piece, "back of the calf" is a calf piece.
 * Region precedence is unconditional, not a length tiebreak: phrase length is
 * not a proxy for anatomical specificity, and using it as one silently routed
 * "back of the arm" and "back of the leg" to the torso because "back" (4)
 * outranks "arm" and "leg" (3).
 *
 * Within a region the longest phrase wins, so "upper arm" beats "arm". Word
 * boundaries keep "forearm" from matching the "arm" rule, and the optional
 * trailing "s" keeps plurals ("hands", "wrists") matching.
 */
export const getAnatomicalAspectRatio = (bodyPart?: string | null): AspectRatio => {
  const text = (bodyPart || '').toLowerCase();
  if (!text) return DEFAULT_ASPECT_RATIO;

  let best: PlacementRule | undefined;
  for (const rule of PLACEMENT_RULES) {
    if (rule.ratio === null) continue; // abstains from the ratio vote
    if (!matches(rule, text)) continue;
    if (!best || outranksForRatio(rule, best)) best = rule;
  }

  return best?.ratio ?? DEFAULT_ASPECT_RATIO;
};

/**
 * Pick the rule whose phrase is the most specific match for the guidance
 * text. Unlike the ratio vote this is pure phrase length: "inner forearm"
 * beats "forearm" beats "arm", and "shoulder blade" work should read as a
 * shoulder piece rather than a back piece. Region precedence would get that
 * second case wrong, which is why the two votes are scored differently
 * instead of sharing one comparator.
 */
const bestGuidanceRule = (text: string): PlacementRule | null => {
  let best: PlacementRule | null = null;
  for (const rule of PLACEMENT_RULES) {
    if (!matches(rule, text)) continue;
    if (!best || rule.phrase.length > best.phrase.length) best = rule;
  }
  return best;
};

const readsAsSleeve = (text: string): boolean =>
  SLEEVE_PATTERN.test(text) && !SLEEVE_IDIOM_PATTERN.test(text);

/**
 * Resolve everything the prompt builders need to know about a placement.
 *
 * @param placement Freeform placement text from intake.
 * @param brief     Optional extra text from the same request — in practice
 *                  the customer's stated meaning. Consulted ONLY for the
 *                  sleeve signal, because sleeve is a statement about scale
 *                  and it routinely lives in the brief rather than the
 *                  placement tag: "a kingdom hearts sleeve" + placement
 *                  "left arm" is one request, and reading the placement
 *                  alone loses half of it. Nothing else is taken from here —
 *                  the brief must never be able to move the aspect ratio.
 */
export function resolvePlacement(
  placement?: string | null,
  brief?: string | null
): PlacementGuidance {
  const text = (placement || '').toLowerCase();
  const aspectRatio = getAnatomicalAspectRatio(text);
  const rule = text ? bestGuidanceRule(text) : null;
  const isSleeve = readsAsSleeve(text) || readsAsSleeve((brief || '').toLowerCase());

  return {
    aspectRatio,
    composition: isSleeve ? SLEEVE_COMPOSITION : rule?.composition ?? FALLBACK_COMPOSITION,
    flow: isSleeve ? SLEEVE_FLOW : rule?.flow ?? FALLBACK_FLOW,
    isSleeve,
    matchedPhrase: rule?.phrase ?? null,
    region: rule?.region ?? null,
  };
}

/**
 * Legacy projection of the rules table, keyed by phrase — the shape
 * `COUNCIL_SKILL_PACK.anatomicalFlow` has always had. It exists so the config
 * object keeps its published contract; the exact-match lookup it was built
 * for is the bug this module replaces, so call `resolvePlacement` instead.
 */
export const ANATOMICAL_FLOW: Record<string, string> = Object.fromEntries(
  PLACEMENT_RULES.map(rule => [rule.phrase, rule.flow])
);
