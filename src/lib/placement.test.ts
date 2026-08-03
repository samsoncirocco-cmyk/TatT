import { describe, it, expect } from 'vitest';
import {
  resolvePlacement,
  getAnatomicalAspectRatio,
  ANATOMICAL_FLOW,
} from './placement';

/**
 * The tautology guard. These are the two strings the old exact-match lookups
 * fell through to; no resolved placement may ever contain them again.
 */
const TAUTOLOGIES = ['balanced composition', 'body-part appropriate flow'];

describe('resolvePlacement — conversational placements', () => {
  // Every one of these missed the old object lookup and produced the
  // tautology. They are the entire reason this module exists.
  const conversational = [
    'left arm',
    'left forearm',
    'inner forearm',
    'inner left forearm',
    'right bicep',
    'back of the calf',
    'sleeve',
    'half sleeve',
    'full sleeve',
    'kingdom hearts sleeve on my left arm',
  ];

  it.each(conversational)('resolves real guidance for %j', placement => {
    const { composition, flow } = resolvePlacement(placement);

    expect(composition.length).toBeGreaterThan(20);
    expect(flow.length).toBeGreaterThan(20);
    for (const tautology of TAUTOLOGIES) {
      expect(composition).not.toContain(tautology);
      expect(flow).not.toContain(tautology);
    }
  });

  it('ranks the more specific phrase first', () => {
    expect(resolvePlacement('inner forearm').matchedPhrase).toBe('inner forearm');
    expect(resolvePlacement('left forearm').matchedPhrase).toBe('forearm');
    expect(resolvePlacement('left arm').matchedPhrase).toBe('arm');
    expect(resolvePlacement('upper arm').matchedPhrase).toBe('upper arm');
  });

  it('falls back to something that says a real thing', () => {
    const { composition, flow, matchedPhrase } = resolvePlacement('earlobes');

    expect(matchedPhrase).toBeNull();
    for (const tautology of TAUTOLOGIES) {
      expect(composition).not.toContain(tautology);
      expect(flow).not.toContain(tautology);
    }
    // The fallback ratio is portrait, so the fallback guidance must agree.
    expect(composition).toContain('taller than wide');
  });

  it('falls back on empty and missing placement without throwing', () => {
    for (const input of ['', '   ', undefined, null]) {
      const resolved = resolvePlacement(input);
      expect(resolved.matchedPhrase).toBeNull();
      expect(resolved.composition).not.toContain('balanced composition');
    }
  });

  it('is case-insensitive and whitespace-tolerant', () => {
    expect(resolvePlacement('  LEFT FOREARM  ')).toEqual(resolvePlacement('left forearm'));
  });
});

describe('resolvePlacement — sleeve composition', () => {
  const sleeves = ['sleeve', 'half sleeve', 'full sleeve', 'quarter sleeve', 'full arm', 'leg sleeve'];

  it.each(sleeves)('treats %j as sleeve-scale work', placement => {
    const { isSleeve, composition, flow } = resolvePlacement(placement);

    expect(isSleeve).toBe(true);
    // A sleeve is not a poster: the four things that separate it from a
    // standalone emblem must all be asked for.
    expect(composition).toContain('vertical story');
    expect(composition).toMatch(/transition/);
    expect(composition).toMatch(/focal hierarchy/);
    expect(composition).toMatch(/wraps continuously/);
    expect(composition).toContain('rather than a standalone emblem');
    expect(flow).toContain('vertical story flow');
  });

  it('reads the sleeve signal out of the brief when the placement is a bare body part', () => {
    // The verified intake: placement 'left arm', meaning 'a kingdom hearts
    // sleeve'. Reading placement alone loses the scale of the request.
    const resolved = resolvePlacement('left arm', 'a kingdom hearts sleeve');

    expect(resolved.isSleeve).toBe(true);
    expect(resolved.composition).toContain('vertical story');
    // The brief must never move the ratio — that stays the placement's job.
    expect(resolved.aspectRatio).toBe('9:16');
  });

  it('does not mistake the idiom for a sleeve', () => {
    expect(resolvePlacement('chest', 'wears his heart on his sleeve').isSleeve).toBe(false);
    expect(resolvePlacement('chest', 'wears his heart on his sleeve').composition).toContain('4:5');
  });

  it('leaves a non-sleeve placement alone', () => {
    expect(resolvePlacement('left forearm').isSleeve).toBe(false);
    expect(resolvePlacement('chest', 'a memorial for my father').isSleeve).toBe(false);
  });
});

/**
 * Regression guard. The aspect-ratio half of this module is a port of logic
 * that already worked; the guidance fixes must not have moved it. Adding a
 * guidance-only rule (shoulder, neck, foot, ribcage, hip, inner forearm) is
 * exactly the kind of change that could, which is why those rules abstain
 * from the ratio vote.
 */
describe('getAnatomicalAspectRatio — unchanged routing behavior', () => {
  const cases: Array<[string | undefined, string]> = [
    ['left arm', '9:16'],
    ['left forearm', '9:16'],
    ['inner forearm', '9:16'],
    ['sleeve', '9:16'],
    ['half sleeve', '9:16'],
    ['arm sleeve', '9:16'],
    ['leg sleeve', '9:16'],
    ['forearm', '9:16'],
    ['upper arm', '9:16'],
    ['both forearms', '9:16'],
    ['back of the arm', '9:16'],
    ['back of the calf', '9:16'],
    ['back of the hand', '1:1'],
    ['wrist', '1:1'],
    ['ankles', '1:1'],
    ['chest', '3:4'],
    ['back', '3:4'],
    ['upper left back', '3:4'],
    // Guidance-only phrases stayed on the default, as they were before.
    ['shoulder', '9:16'],
    ['neck', '9:16'],
    ['foot', '9:16'],
    ['ribcage', '9:16'],
    ['hip', '9:16'],
    ['somewhere undecided', '9:16'],
    ['', '9:16'],
    [undefined, '9:16'],
  ];

  it.each(cases)('%j → %s', (placement, ratio) => {
    expect(getAnatomicalAspectRatio(placement)).toBe(ratio);
    expect(resolvePlacement(placement).aspectRatio).toBe(ratio);
  });
});

describe('ANATOMICAL_FLOW projection', () => {
  it('keeps the keys the council skill pack published', () => {
    for (const key of ['forearm', 'shin', 'chest', 'back', 'shoulder', 'hip']) {
      expect(ANATOMICAL_FLOW[key]).toBeTruthy();
    }
  });
});
