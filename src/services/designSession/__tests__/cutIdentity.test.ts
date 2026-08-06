import { describe, it, expect } from 'vitest';
import type { Variation } from '@/services/designSession/types';
import { cutIdentity } from '../cutIdentity';

const variation = (axisPosition: Record<string, string>): Variation => ({
  id: 'v1',
  axisPosition,
  prompt: 'a prompt',
});

/** Raw internals that must never surface in a cut's name or caption (TAT-47 defect 8). */
const RAW_TELEMETRY = [
  'bold-fine',
  'color-blackwork',
  'literal-abstract',
  'minimal-ornate',
  'axisPosition',
  'axis',
  'questionnaire',
  'compositional',
];

function expectDesignedOnly({ name, caption }: { name: string; caption: string }) {
  for (const raw of RAW_TELEMETRY) {
    expect(name.toLowerCase()).not.toContain(raw.toLowerCase());
    expect(caption.toLowerCase()).not.toContain(raw.toLowerCase());
  }
}

describe('cutIdentity', () => {
  it('names a two-axis quadrant cut from both poles', () => {
    const cut = cutIdentity(
      variation({ 'bold-fine': 'bold', 'color-blackwork': 'color' }),
      0
    );
    expect(cut.name).toBe('the bold, full-color one');
    expect(cut.caption).toBe('heavy lines, built to last — ink with a pulse');
  });

  it('names a single-axis cut', () => {
    expect(cutIdentity(variation({ 'bold-fine': 'fine' }), 0).name).toBe('the fine-line one');
    expect(cutIdentity(variation({ 'color-blackwork': 'blackwork' }), 0).name).toBe(
      'the blackwork one'
    );
  });

  it('gives every pole a designed name and caption — never raw axis telemetry', () => {
    const poles = ['bold', 'fine', 'color', 'blackwork', 'literal', 'abstract', 'minimal', 'ornate'];
    const axes = ['bold-fine', 'color-blackwork', 'literal-abstract', 'minimal-ornate'];
    for (const pole of poles) {
      const axis = axes.find((a) => a.includes(pole)) ?? 'bold-fine';
      const cut = cutIdentity(variation({ [axis]: pole }), 0);
      expect(cut.name).toMatch(/^the .+ one$/);
      expect(cut.caption.length).toBeGreaterThan(0);
      expectDesignedOnly(cut);
    }
  });

  it('names every compositional treatment', () => {
    const expected: Record<string, string> = {
      'centered emblem': 'the emblem',
      'dynamic flow': 'the mover',
      'negative space': 'the breather',
      'close crop': 'the close-up',
      'ensemble emblem': 'the emblem',
      'battle scene': 'the clash',
      'stacked tiers': 'the totem',
      'flowing procession': 'the procession',
      'vertical story': 'the story',
      'connected transitions': 'the run',
      'focal hierarchy': 'the anchor',
    };
    for (const [composition, name] of Object.entries(expected)) {
      const cut = cutIdentity(variation({ composition }), 0);
      expect(cut.name).toBe(name);
      expect(cut.caption.length).toBeGreaterThan(0);
      expectDesignedOnly(cut);
    }
  });

  it('falls back to a plain cut number on unknown poles — never the raw value', () => {
    const cut = cutIdentity(variation({ 'bold-fine': 'bold', 'new-axis': 'zigzag' }), 1);
    expect(cut).toEqual({ name: 'cut two', caption: '' });
    expect(cut.name).not.toContain('zigzag');
  });

  it('falls back on unknown compositional treatments and empty positions', () => {
    expect(cutIdentity(variation({ composition: 'brand new treatment' }), 2)).toEqual({
      name: 'cut three',
      caption: '',
    });
    expect(cutIdentity(variation({}), 3)).toEqual({ name: 'cut four', caption: '' });
  });
});
