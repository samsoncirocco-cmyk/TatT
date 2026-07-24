/**
 * Subtle placement×style cautions for the artist brief (ADR-0014).
 *
 * Hard conflicts get the tempt-and-confront moment in the UI; the
 * genuinely subtle cases land here instead — flagged in the brief where
 * the consult is better equipped to judge the marginal call. A small
 * hand-written table, deliberately not exhaustive: every row is a known
 * longevity concern, not a guess.
 */

interface PlacementCaution {
  /** Matches the intake placement text. */
  placement: RegExp;
  /** Matches the style context (style tags + picked poles). */
  style: RegExp;
  note: string;
}

const CAUTION_TABLE: PlacementCaution[] = [
  {
    placement: /rib/i,
    style: /fine|micro|delicate|single.?needle|realis/i,
    note:
      'Ribs flex with every breath and the skin there is thin — fine-line and ' +
      'high-detail work can soften faster than elsewhere. Worth discussing line ' +
      'weight and detail density at the consult.',
  },
  {
    placement: /finger|knuckle/i,
    style: /./, // any style: finger skin turnover affects everything
    note:
      'Finger skin regenerates fast and takes constant friction — ink commonly ' +
      'blurs or drops out here and touch-ups are the norm. The consult should ' +
      'set longevity expectations.',
  },
  {
    placement: /\bhand|palm/i,
    style: /fine|micro|delicate|realis/i,
    note:
      'Hands see sun and washing all day — delicate detail and photo-real ' +
      'gradients weather quickly here. The consult should confirm the chosen ' +
      'level of detail will hold.',
  },
  {
    placement: /foot|ankle/i,
    style: /fine|micro|delicate/i,
    note:
      'Feet take constant friction from footwear and fade sooner than most ' +
      'placements — fine detail may need earlier touch-ups. Flag longevity at ' +
      'the consult.',
  },
];

/**
 * Cautions matching this session's placement and style context. The style
 * context is the intake's style tags plus the picked variation's poles
 * (a 'fine' pole pick raises the same detail concern a fine-line tag does).
 * Empty array when nothing subtle applies.
 */
export function derivePlacementNotes(
  placement: string,
  styleTags: string[],
  pickedAxisPosition: Record<string, string>
): string[] {
  const styleContext = [...styleTags, ...Object.values(pickedAxisPosition)]
    .join(' ')
    .toLowerCase();

  return CAUTION_TABLE.filter(
    caution => caution.placement.test(placement) && caution.style.test(styleContext)
  ).map(caution => caution.note);
}
