/**
 * Identity grounding (sprint fix #4, second half).
 *
 * The failure this file exists for is real and dated: on 2026-08-05 a customer
 * opened with
 *
 *   "a kingdom hearts sleeve with roxas and sora fight link from zelda and
 *    boswer from mario"
 *
 * and was read back "roxas and sora" — a two-character cast for a
 * four-character tattoo, with nothing in the sentence revealing that anyone
 * had been dropped. Two independent grounding rejections did it, each
 * sufficient on its own:
 *
 *   1. "Link / The Legend of Zelda" — the SERIES could not be verified against
 *      a transcript that says "zelda", because the alias table was anime-only.
 *      An unverifiable franchise deleted the person.
 *   2. "Bowser" — the extractor corrected the customer's "boswer", and exact
 *      grounding deleted the character for the crime of being spelled right.
 *
 * The principle these tests pin: grounding verifies claims, it does not take
 * hostages.
 */
import { describe, it, expect } from 'vitest';
import { groundedCharacterIdentities } from '@/services/intake';

/** The 2026-08-05 opener, verbatim, misspelling included. */
const SMASH_TURN_1 =
  'a kingdom hearts sleeve with roxas and sora fight link from zelda and boswer from mario';

const CLAIMED = [
  { name: 'Roxas', series: 'Kingdom Hearts' },
  { name: 'Sora', series: 'Kingdom Hearts' },
  { name: 'Link', series: 'The Legend of Zelda' },
  { name: 'Bowser', series: 'Super Mario' },
];

describe('groundedCharacterIdentities — the 2026-08-05 cast', () => {
  it('keeps all four characters the customer named', () => {
    expect(groundedCharacterIdentities(CLAIMED, SMASH_TURN_1).map((i) => i.name)).toEqual([
      'Roxas',
      'Sora',
      'Link',
      'Bowser',
    ]);
  });
});

describe('an unverifiable series costs the series, never the person', () => {
  it('keeps a character whose franchise is not in the alias table', () => {
    const [identity] = groundedCharacterIdentities(
      [{ name: 'Chell', series: 'Portal 2 (Aperture Science)' }],
      'a chell piece from portal 2 aperture science on my arm'
    );

    expect(identity.name).toBe('Chell');
  });

  it('blanks the series rather than inventing or guessing one', () => {
    const [identity] = groundedCharacterIdentities(
      [{ name: 'Ripley', series: 'Some Franchise Nobody Named' }],
      'i want ripley on my forearm'
    );

    expect(identity.name).toBe('Ripley');
    expect(identity.series).toBe('');
  });

  it('does NOT resurrect a franchise the customer contradicted', () => {
    // A provider hedging one name across two franchises is a disambiguation,
    // not a coverage gap. The verified pairing wins outright — the name-only
    // twin must not survive as a second, sourceless person.
    expect(
      groundedCharacterIdentities(
        [
          { name: 'Sora', series: 'Kingdom Hearts' },
          { name: 'Sora', series: 'No Game No Life' },
        ],
        SMASH_TURN_1
      )
    ).toEqual([{ name: 'Sora', series: 'Kingdom Hearts' }]);
  });

  it('still keeps the series when the customer did name it', () => {
    expect(
      groundedCharacterIdentities([{ name: 'Sora', series: 'Kingdom Hearts' }], SMASH_TURN_1)
    ).toEqual([{ name: 'Sora', series: 'Kingdom Hearts' }]);
  });
});

describe('near-miss rescue — a typo must not delete a character', () => {
  it('rescues the claim the customer misspelled', () => {
    expect(
      groundedCharacterIdentities([{ name: 'Bowser', series: 'Super Mario' }], SMASH_TURN_1)
    ).toEqual([{ name: 'Bowser', series: 'Super Mario' }]);
  });

  it('REJECTS a distance-1 swap on a short name (ken/ren, both directions)', () => {
    // Both are real characters. At three letters, distance 1 is a coin flip
    // between "misspelled" and "a different person", and the guard's job is to
    // not guess there.
    expect(groundedCharacterIdentities([{ name: 'Ren', series: '' }], 'i want ken on my arm')).toEqual(
      []
    );
    expect(groundedCharacterIdentities([{ name: 'Ken', series: '' }], 'i want ren on my arm')).toEqual(
      []
    );
  });

  it('REJECTS a distance-1 swap that changes the first letter (mario/wario)', () => {
    // Long enough to clear the length gate; dies on the initial. This is the
    // difference between fixing a typo and inventing a second character.
    expect(
      groundedCharacterIdentities([{ name: 'Wario', series: 'Super Mario' }], SMASH_TURN_1)
    ).toEqual([]);
  });

  it('REJECTS a name the customer never wrote anything resembling', () => {
    // The behaviour the guard was written for, unchanged.
    expect(
      groundedCharacterIdentities([{ name: 'Sephiroth', series: 'Final Fantasy VII' }], SMASH_TURN_1)
    ).toEqual([]);
  });

  it('REJECTS distance 2, even on a long name with the right initial', () => {
    expect(
      groundedCharacterIdentities([{ name: 'Bowsette', series: 'Super Mario' }], SMASH_TURN_1)
    ).toEqual([]);
  });

  it('never lets one typed word ground two different characters', () => {
    // "boswer" can rescue Bowser. It must not then also rescue Bowzer.
    const result = groundedCharacterIdentities(
      [
        { name: 'Bowser', series: 'Super Mario' },
        { name: 'Bowzer', series: 'Super Mario' },
      ],
      SMASH_TURN_1
    );

    expect(result).toHaveLength(1);
  });

  it('does not rescue against a word an exactly-grounded character already used', () => {
    // "roxas" is Roxas. A claim one keystroke away cannot claim him too.
    const result = groundedCharacterIdentities(
      [
        { name: 'Roxas', series: 'Kingdom Hearts' },
        { name: 'Roxes', series: 'Kingdom Hearts' },
      ],
      SMASH_TURN_1
    );

    expect(result.map((i) => i.name)).toEqual(['Roxas']);
  });
});
