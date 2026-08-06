/**
 * The settled-axis derivation (ADR-0049): which ladder rungs the brief has
 * already committed one pole of, so no round — round one or a charged
 * refine — ever spreads them. Deliberately conservative: explicit evidence
 * only, and an axis the intake listed as ambiguous is never settled.
 */
import { describe, it, expect } from 'vitest';
import type { IntakeRecord } from '../types';
import { resolvePalette, settledAxes } from '../settledAxes';

const record = (overrides: Partial<IntakeRecord>): IntakeRecord => ({
  placement: 'forearm',
  styleTags: [],
  meaning: 'strength after a rough year',
  references: [],
  ambiguousAxes: [],
  ...overrides,
});

describe('settledAxes — the palette rung (the live-bug axis)', () => {
  it('a blackwork-resolved brief settles color-blackwork', () => {
    expect(settledAxes(record({ styleTags: ['blackwork'] }))).toContain('color-blackwork');
    expect(settledAxes(record({ styleTags: ['black-and-grey'] }))).toContain(
      'color-blackwork'
    );
  });

  it('a full-color-resolved brief settles color-blackwork just the same', () => {
    expect(settledAxes(record({ styleTags: ['color'] }))).toContain('color-blackwork');
    expect(settledAxes(record({ styleTags: ['watercolor'] }))).toContain('color-blackwork');
  });

  it('an unresolved palette settles nothing — the question stays askable', () => {
    expect(resolvePalette(['illustrative'])).toBe('unresolved');
    expect(settledAxes(record({ styleTags: ['illustrative'] }))).toEqual([]);
  });

  it('never settles an axis the intake explicitly listed as ambiguous', () => {
    // Line-style shorthand: 'fine-line' reads monochrome to resolvePalette,
    // but the intake left the palette question open — so the rung stays
    // spreadable. Skipping it would silently remove a refinement the
    // customer never answered.
    const shorthand = record({
      styleTags: ['fine-line'],
      ambiguousAxes: ['bold-fine', 'color-blackwork'],
    });
    expect(settledAxes(shorthand)).toEqual([]);
  });

  it('respects a deliberately reopened axis (the customer asked to SEE the split)', () => {
    // applyAxisSpread reopens the axis by listing it ambiguous again; the
    // lingering tag evidence must not re-close it.
    const reopened = record({
      styleTags: ['fine-line'],
      ambiguousAxes: ['bold-fine'],
      requestedAxis: 'bold-fine',
    });
    expect(settledAxes(reopened)).not.toContain('bold-fine');
  });
});

describe('settledAxes — the other rungs, explicit commitments only', () => {
  it('fine-line settles bold-fine', () => {
    expect(settledAxes(record({ styleTags: ['fine-line'] }))).toContain('bold-fine');
  });

  it('a named subject settles literal-abstract (IP rule: recognizable is the point)', () => {
    expect(
      settledAxes(record({ subject: 'Son Goku from Dragon Ball Z' }))
    ).toContain('literal-abstract');
    expect(settledAxes(record({ subject: '   ' }))).not.toContain('literal-abstract');
  });

  it('realism/portrait and abstract/surrealism settle literal-abstract', () => {
    expect(settledAxes(record({ styleTags: ['realism'] }))).toContain('literal-abstract');
    expect(settledAxes(record({ styleTags: ['abstract'] }))).toContain('literal-abstract');
  });

  it('minimalist and ornamental settle minimal-ornate', () => {
    expect(settledAxes(record({ styleTags: ['minimalist'] }))).toContain('minimal-ornate');
    expect(settledAxes(record({ styleTags: ['ornamental'] }))).toContain('minimal-ornate');
  });

  it('an empty brief settles nothing', () => {
    expect(settledAxes(record({}))).toEqual([]);
  });
});
