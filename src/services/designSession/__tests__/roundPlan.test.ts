/**
 * The pick-to-refine round plan (ADR-0049) — pure, shared by the
 * orchestrator and the reveal UI, so the ladder and its copy are pinned
 * here once for both.
 */
import { describe, it, expect } from 'vitest';
import {
  ROUND_AXIS_LADDER,
  REROLL_AXIS,
  COMPOSITION_AXIS,
  nextRoundAxis,
  roundAxisLabel,
  refineInviteLine,
  currentRound,
  isLadderAxis,
} from '../roundPlan';

describe('the axis ladder (ADR-0049 acceptance order)', () => {
  it('walks bold-fine → color-blackwork → literal-abstract → minimal-ornate', () => {
    expect(ROUND_AXIS_LADDER).toEqual([
      'bold-fine',
      'color-blackwork',
      'literal-abstract',
      'minimal-ornate',
    ]);
    expect(nextRoundAxis('questionnaire', [])).toBe('bold-fine');
    expect(nextRoundAxis('questionnaire', ['bold-fine'])).toBe('color-blackwork');
    expect(nextRoundAxis('questionnaire', ['bold-fine', 'color-blackwork'])).toBe(
      'literal-abstract'
    );
    expect(
      nextRoundAxis('questionnaire', ['bold-fine', 'color-blackwork', 'literal-abstract'])
    ).toBe('minimal-ornate');
  });

  it('skips rungs already spread — round one may lead with a requested axis', () => {
    // The customer asked to SEE color vs blackwork, so round one spread it;
    // the ladder resumes on the rungs not yet asked (never repeats one).
    expect(nextRoundAxis('questionnaire', ['color-blackwork'])).toBe('bold-fine');
    expect(nextRoundAxis('questionnaire', ['color-blackwork', 'bold-fine'])).toBe(
      'literal-abstract'
    );
  });

  it('skips rungs the brief already settled — never a round the brief contradicts', () => {
    // A blackwork-resolved brief (settledAxes derived it from the intake):
    // round two after bold-fine skips color-blackwork, so no credit is ever
    // spent on a prompt that says "zero color" and "vibrant full-color" at
    // once (ADR-0049).
    expect(nextRoundAxis('questionnaire', ['bold-fine'], ['color-blackwork'])).toBe(
      'literal-abstract'
    );
    // Settled rungs are skipped at round one too.
    expect(nextRoundAxis('questionnaire', [], ['bold-fine', 'color-blackwork'])).toBe(
      'literal-abstract'
    );
    // An unresolved brief (empty settled set) walks the full ladder.
    expect(nextRoundAxis('questionnaire', ['bold-fine'], [])).toBe('color-blackwork');
  });

  it('falls through to the re-roll when every remaining rung is asked or settled', () => {
    expect(
      nextRoundAxis(
        'questionnaire',
        ['bold-fine', 'literal-abstract'],
        ['color-blackwork', 'minimal-ornate']
      )
    ).toBe(REROLL_AXIS);
    expect(nextRoundAxis('questionnaire', [], [...ROUND_AXIS_LADDER])).toBe(REROLL_AXIS);
  });

  it('re-rolls on locked poles past the ladder — no hard round cap', () => {
    const allRungs = [...ROUND_AXIS_LADDER];
    expect(nextRoundAxis('questionnaire', allRungs)).toBe(REROLL_AXIS);
    expect(nextRoundAxis('questionnaire', [...allRungs, REROLL_AXIS, REROLL_AXIS])).toBe(
      REROLL_AXIS
    );
  });

  it('keeps compositional sessions on framing rounds', () => {
    expect(nextRoundAxis('compositional', [])).toBe(COMPOSITION_AXIS);
    expect(nextRoundAxis('compositional', [COMPOSITION_AXIS])).toBe(COMPOSITION_AXIS);
  });

  it('knows which axes a round can lock', () => {
    for (const axis of ROUND_AXIS_LADDER) expect(isLadderAxis(axis)).toBe(true);
    expect(isLadderAxis(REROLL_AXIS)).toBe(false);
    expect(isLadderAxis(COMPOSITION_AXIS)).toBe(false);
  });
});

describe('round copy is computed from the ladder, never hardcoded', () => {
  it('speaks each axis by its pole labels', () => {
    expect(roundAxisLabel('bold-fine')).toBe('bold vs fine-line');
    expect(roundAxisLabel('color-blackwork')).toBe('full-color vs blackwork');
    expect(roundAxisLabel('literal-abstract')).toBe('literal vs abstract');
    expect(roundAxisLabel('minimal-ornate')).toBe('minimal vs ornate');
  });

  it('builds the decided post-pick invitation from the NEXT axis', () => {
    // After round one, the next round is the second rung.
    expect(refineInviteLine('questionnaire', ['bold-fine'])).toBe(
      'Good eye. Refine it? Next round is full-color vs blackwork — 1 credit.'
    );
    expect(refineInviteLine('questionnaire', ['bold-fine', 'color-blackwork'])).toBe(
      'Good eye. Refine it? Next round is literal vs abstract — 1 credit.'
    );
    // A requested axis led round one: the invite offers the first unasked rung.
    expect(refineInviteLine('questionnaire', ['color-blackwork'])).toBe(
      'Good eye. Refine it? Next round is bold vs fine-line — 1 credit.'
    );
    // A settled rung is skipped in the invite too — the copy must promise
    // the axis the charged round will actually spread (ADR-0049).
    expect(refineInviteLine('questionnaire', ['bold-fine'], ['color-blackwork'])).toBe(
      'Good eye. Refine it? Next round is literal vs abstract — 1 credit.'
    );
  });

  it('still invites past the ladder and on compositional sessions', () => {
    expect(refineInviteLine('questionnaire', [...ROUND_AXIS_LADDER])).toContain('re-roll');
    expect(refineInviteLine('compositional', [COMPOSITION_AXIS])).toContain('framings');
  });
});

describe('currentRound', () => {
  it('returns the last (live) round, or nothing before rounds exist', () => {
    expect(currentRound(undefined)).toBeUndefined();
    expect(currentRound([])).toBeUndefined();
    const rounds = [
      { round: 1, axis: 'bold-fine', variationIds: ['v1', 'v2'], frozen: true },
      { round: 2, axis: 'color-blackwork', variationIds: ['v3', 'v4'] },
    ];
    expect(currentRound(rounds)?.round).toBe(2);
  });
});
