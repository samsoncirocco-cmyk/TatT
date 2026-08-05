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
    expect(nextRoundAxis('questionnaire', 0)).toBe('bold-fine');
    expect(nextRoundAxis('questionnaire', 1)).toBe('color-blackwork');
    expect(nextRoundAxis('questionnaire', 2)).toBe('literal-abstract');
    expect(nextRoundAxis('questionnaire', 3)).toBe('minimal-ornate');
  });

  it('re-rolls on locked poles past the ladder — no hard round cap', () => {
    expect(nextRoundAxis('questionnaire', 4)).toBe(REROLL_AXIS);
    expect(nextRoundAxis('questionnaire', 17)).toBe(REROLL_AXIS);
  });

  it('keeps compositional sessions on framing rounds', () => {
    expect(nextRoundAxis('compositional', 0)).toBe(COMPOSITION_AXIS);
    expect(nextRoundAxis('compositional', 5)).toBe(COMPOSITION_AXIS);
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
    expect(refineInviteLine('questionnaire', 1)).toBe(
      'Good eye. Refine it? Next round is full-color vs blackwork — 1 credit.'
    );
    expect(refineInviteLine('questionnaire', 2)).toBe(
      'Good eye. Refine it? Next round is literal vs abstract — 1 credit.'
    );
  });

  it('still invites past the ladder and on compositional sessions', () => {
    expect(refineInviteLine('questionnaire', 4)).toContain('re-roll');
    expect(refineInviteLine('compositional', 1)).toContain('framings');
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
