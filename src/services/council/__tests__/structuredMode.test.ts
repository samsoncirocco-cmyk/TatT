/**
 * Structured-input mode tests (ADR-0015 / ADR-0012).
 *
 * Structured mode is template-based, so no provider is ever called — every
 * test stubs global fetch and asserts the network stays untouched.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enhance, enhanceStructured } from '../index';
import type { IntakeRecord } from '../../intake/types';

const baseRecord: IntakeRecord = {
  placement: 'forearm',
  styleTags: ['neo-traditional'],
  meaning: 'a phoenix for my grandmother, rebirth after loss',
  references: [],
  ambiguousAxes: [],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('enhanceStructured - questionnaire mode (2 ambiguous axes)', () => {
  const record: IntakeRecord = {
    ...baseRecord,
    ambiguousAxes: ['bold-fine', 'color-blackwork'],
  };

  it('returns four variations covering all four quadrants of the two axes', async () => {
    const result = await enhanceStructured(record);

    expect(result.axisSelection.mode).toBe('questionnaire');
    expect(result.axisSelection.axes).toHaveLength(2);
    expect(result.axisSelection.axes).toEqual(
      expect.arrayContaining(['bold-fine', 'color-blackwork'])
    );

    expect(result.variations).toHaveLength(4);
    const quadrants = result.variations.map(v => JSON.stringify(v.axisPosition));
    expect(new Set(quadrants).size).toBe(4);
    for (const variation of result.variations) {
      expect(Object.keys(variation.axisPosition).sort()).toEqual(
        ['bold-fine', 'color-blackwork'].sort()
      );
    }
  });

  it('produces divergent prompts per quadrant reflecting each pole', async () => {
    const result = await enhanceStructured(record);

    const detailedPrompts = result.variations.map(v => v.prompts.detailed);
    expect(new Set(detailedPrompts).size).toBe(4);

    for (const variation of result.variations) {
      const pos = variation.axisPosition as Record<string, string>;
      const prompt = (variation.prompts.detailed || '').toLowerCase();
      if (pos['bold-fine'] === 'bold') expect(prompt).toContain('bold');
      if (pos['bold-fine'] === 'fine') expect(prompt).toContain('fine-line');
      if (pos['color-blackwork'] === 'color') expect(prompt).toContain('color');
      if (pos['color-blackwork'] === 'blackwork') expect(prompt).toContain('blackwork');
    }
  });

  it('pushes the opposite pole into each variation negative prompt', async () => {
    const result = await enhanceStructured(record);

    for (const variation of result.variations) {
      const pos = variation.axisPosition as Record<string, string>;
      const negative = (variation.negativePrompt || '').toLowerCase();
      expect(negative.length).toBeGreaterThan(0);
      if (pos['color-blackwork'] === 'blackwork') {
        expect(negative).toContain('color');
      }
      if (pos['color-blackwork'] === 'color') {
        expect(negative).toContain('monochrome');
      }
    }
  });

  it('carries placement guidance and meaning into the prompts', async () => {
    const result = await enhanceStructured(record);

    for (const variation of result.variations) {
      const ultra = variation.prompts.ultra || '';
      expect(ultra).toContain('forearm');
      expect(ultra).toContain('phoenix');
      expect(ultra).toContain('neo-traditional');
      // forearm aspect guidance from getAspectRatioGuidance
      expect(ultra.toLowerCase()).toContain('vertical');
    }
  });
});

describe('enhanceStructured - more than 2 ambiguous axes', () => {
  it('picks the two most visually consequential axes by documented priority', async () => {
    const result = await enhanceStructured({
      ...baseRecord,
      ambiguousAxes: ['minimal-ornate', 'bold-fine', 'literal-abstract', 'color-blackwork'],
    });

    // Priority: color-blackwork > literal-abstract > bold-fine > minimal-ornate
    expect(result.axisSelection.mode).toBe('questionnaire');
    expect(result.axisSelection.axes).toEqual(['color-blackwork', 'literal-abstract']);
    expect(result.axisSelection.rationale).toContain('bold-fine');
    expect(result.axisSelection.rationale).toContain('minimal-ornate');
  });

  it('pads a single ambiguous axis to two and says so in the rationale', async () => {
    const result = await enhanceStructured({
      ...baseRecord,
      ambiguousAxes: ['minimal-ornate'],
    });

    expect(result.axisSelection.mode).toBe('questionnaire');
    expect(result.axisSelection.axes).toHaveLength(2);
    expect(result.axisSelection.axes).toContain('minimal-ornate');
    expect(result.axisSelection.rationale.toLowerCase()).toContain('padded');
  });
});

describe('enhanceStructured - compositional fallback (empty ambiguousAxes)', () => {
  it('locks style and varies composition across four distinct treatments', async () => {
    const result = await enhanceStructured(baseRecord);

    expect(result.axisSelection.mode).toBe('compositional');
    expect(result.axisSelection.axes).toEqual([]);

    expect(result.variations).toHaveLength(4);
    const compositions = result.variations.map(
      v => (v.axisPosition as { composition: string }).composition
    );
    expect(compositions.every(Boolean)).toBe(true);
    expect(new Set(compositions).size).toBe(4);

    // Style locks: every variation carries the same style spec.
    for (const variation of result.variations) {
      expect(variation.prompts.simple).toContain('neo-traditional');
    }
    const detailedPrompts = result.variations.map(v => v.prompts.detailed);
    expect(new Set(detailedPrompts).size).toBe(4);
  });
});

describe('enhanceStructured - rationale is logged, never silent (ADR-0012)', () => {
  it('always returns a non-empty rationale and emits it via onDiscussionUpdate', async () => {
    for (const ambiguousAxes of [
      [] as IntakeRecord['ambiguousAxes'],
      ['bold-fine', 'color-blackwork'] as IntakeRecord['ambiguousAxes'],
    ]) {
      const onDiscussionUpdate = vi.fn();
      const result = await enhanceStructured(
        { ...baseRecord, ambiguousAxes },
        { onDiscussionUpdate }
      );

      expect(result.axisSelection.rationale.length).toBeGreaterThan(0);
      expect(onDiscussionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'axis-selection',
          mode: result.axisSelection.mode,
          rationale: result.axisSelection.rationale,
        })
      );
    }
  });

  it('works without a callback (rationale still in the result)', async () => {
    const result = await enhanceStructured(baseRecord);
    expect(result.axisSelection.rationale.length).toBeGreaterThan(0);
  });
});

describe('enhanceStructured - offline and non-invasive', () => {
  it('never calls a provider (template-based, no network)', async () => {
    await enhanceStructured({
      ...baseRecord,
      ambiguousAxes: ['literal-abstract', 'minimal-ornate'],
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('leaves the classic enhance() export untouched', () => {
    expect(typeof enhance).toBe('function');
  });
});
