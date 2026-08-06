/**
 * The bot's spoken line for the reveal moment.
 *
 * ADR-0012 requires axis selection to be LOGGED, never silent — but the log
 * is an audit artifact, not chat copy. A live session rendered the raw
 * `axisSelection.rationale` ("Questionnaire mode: intake left bold-fine and
 * minimal-ornate unresolved; the reveal varies both so the user's pick
 * answers them without being asked.") as a bot message, which is internal
 * machinery leaking to the user. The rationale stays on the session record
 * for auditing; THIS is what the user hears.
 */
import type { AxisSelection } from '@/services/intake/types';
import type { VariationAxis } from '@/services/intake/types';

/** How each axis is spoken about, consultant-voice — never the internal id. */
const AXIS_SPOKEN: Record<VariationAxis, string> = {
  'bold-fine': 'line weight',
  'color-blackwork': 'color versus black ink',
  'literal-abstract': 'literal versus abstract',
  'minimal-ornate': 'how much detail they carry',
};

export function revealNarration(axisSelection: AxisSelection): string {
  if (axisSelection.mode === 'compositional' || axisSelection.axes.length === 0) {
    return 'Style is locked in, so these two play with pose, framing, and negative space.';
  }
  const spoken = axisSelection.axes.map(
    (axis) => AXIS_SPOKEN[axis] ?? axis.replace(/-/g, ' vs ')
  );
  const split = spoken.length > 1 ? `${spoken[0]} and ${spoken[1]}` : spoken[0];
  return `I split these two on ${split} — your pick tells me which way to lean.`;
}
