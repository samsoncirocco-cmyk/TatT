import { describe, it, expect } from 'vitest';
import {
  hasRegion,
  isTapGesture,
  pathLength,
  regionBounds,
  TAP_PATH_THRESHOLD,
  toSvgPoints,
} from './regionMask';

describe('region gestures — no precision pointing required (ADR-0038)', () => {
  it('reads a single touch as a tap', () => {
    expect(isTapGesture([{ x: 0.5, y: 0.5 }])).toBe(true);
  });

  it('still reads a jittery thumb tap as a tap, not a one-pixel scribble', () => {
    const jitter = [
      { x: 0.5, y: 0.5 },
      { x: 0.503, y: 0.501 },
      { x: 0.502, y: 0.504 },
    ];
    expect(pathLength(jitter)).toBeLessThan(TAP_PATH_THRESHOLD);
    expect(isTapGesture(jitter)).toBe(true);
  });

  it('reads a drawn loop as a lasso', () => {
    const loop = [
      { x: 0.2, y: 0.2 },
      { x: 0.6, y: 0.2 },
      { x: 0.6, y: 0.6 },
      { x: 0.2, y: 0.6 },
    ];
    expect(isTapGesture(loop)).toBe(false);
  });

  it('has no region until something is selected', () => {
    expect(hasRegion([])).toBe(false);
    expect(hasRegion([{ x: 0.1, y: 0.1 }])).toBe(true);
  });
});

describe('regionBounds', () => {
  it('returns null with nothing selected', () => {
    expect(regionBounds([])).toBeNull();
  });

  it('boxes the drawn points and clamps to the canvas', () => {
    expect(
      regionBounds([
        { x: -0.2, y: 0.3 },
        { x: 0.8, y: 1.4 },
      ])
    ).toEqual({ x: 0, y: 0.3, width: 0.8, height: 0.7 });
  });
});

describe('toSvgPoints', () => {
  it('scales normalized points into the drawing viewbox', () => {
    expect(
      toSvgPoints(
        [
          { x: 0, y: 0.5 },
          { x: 1, y: 1 },
        ],
        100,
        100
      )
    ).toBe('0,50 100,100');
  });
});
