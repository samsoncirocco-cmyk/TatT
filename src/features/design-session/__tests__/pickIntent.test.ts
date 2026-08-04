import { describe, it, expect } from 'vitest';
import {
  parsePickIntent,
  parsePickOrdinals,
  isBarePickReference,
} from '../services/pickIntent';

const CUTS = 4;

describe('parsePickIntent', () => {
  it('reads a bare digit', () => {
    expect(parsePickIntent('3', CUTS)).toBe(3);
    expect(parsePickIntent('1', CUTS)).toBe(1);
  });

  it('reads a digit inside a sentence', () => {
    expect(parsePickIntent('I like 2 the most', CUTS)).toBe(2);
    expect(parsePickIntent('go with 4 please', CUTS)).toBe(4);
  });

  it('reads ordinal words', () => {
    expect(parsePickIntent('the third one', CUTS)).toBe(3);
    expect(parsePickIntent('first', CUTS)).toBe(1);
    expect(parsePickIntent('the second', CUTS)).toBe(2);
  });

  it('reads qualified numbers', () => {
    expect(parsePickIntent('cut 2', CUTS)).toBe(2);
    expect(parsePickIntent('number 1', CUTS)).toBe(1);
    expect(parsePickIntent('#3', CUTS)).toBe(3);
    expect(parsePickIntent('option four', CUTS)).toBe(4);
  });

  it('resolves "the last one" against the delivered cut count', () => {
    expect(parsePickIntent('the last one', CUTS)).toBe(4);
    expect(parsePickIntent('the last one', 3)).toBe(3);
  });

  // The whole reason "one" is not in the bare-word table: every web cut name
  // ends in it, so a bare "one" is a pronoun far more often than cut 1.
  it('does not read a bare "one" as cut 1', () => {
    expect(parsePickIntent('the bold one', CUTS)).toBeNull();
    expect(parsePickIntent('that one', CUTS)).toBeNull();
    expect(parsePickIntent('the fine-line, full-color one', CUTS)).toBeNull();
  });

  it('still reads "one" when a qualifier makes it unambiguous', () => {
    expect(parsePickIntent('cut one', CUTS)).toBe(1);
    expect(parsePickIntent('number one', CUTS)).toBe(1);
  });

  // Reading "not 3" as a pick of 3 is the worst failure this gate can have.
  it('treats a rejection as naming nothing', () => {
    expect(parsePickIntent('not 3', CUTS)).toBeNull();
    expect(parsePickIntent('anything but the second', CUTS)).toBeNull();
    expect(parsePickIntent('no, not that one', CUTS)).toBeNull();
    expect(parsePickIntent('I hate 4', CUTS)).toBeNull();
    expect(parsePickIntent('none of them', CUTS)).toBeNull();
  });

  it('returns null when several cuts are named — the caller asks again', () => {
    expect(parsePickIntent('2 and 3', CUTS)).toBeNull();
    expect(parsePickIntent('1, 2 and 4', CUTS)).toBeNull();
    expect(parsePickIntent('the first and the last', CUTS)).toBeNull();
  });

  it('returns null on out-of-range numbers', () => {
    expect(parsePickIntent('5', CUTS)).toBeNull();
    expect(parsePickIntent('9', CUTS)).toBeNull();
    expect(parsePickIntent('3', 2)).toBeNull();
  });

  it('ignores numbers embedded in longer numbers', () => {
    expect(parsePickIntent('make it 35 percent bigger', CUTS)).toBeNull();
    expect(parsePickIntent('2024', CUTS)).toBeNull();
  });

  it('returns null when no cut is named', () => {
    expect(parsePickIntent('yes', CUTS)).toBeNull();
    expect(parsePickIntent('these look amazing', CUTS)).toBeNull();
    expect(parsePickIntent('', CUTS)).toBeNull();
    expect(parsePickIntent('   ', CUTS)).toBeNull();
  });

  it('handles a zero cut count without throwing', () => {
    expect(parsePickIntent('1', 0)).toBeNull();
  });
});

describe('isBarePickReference', () => {
  it('accepts a choice and nothing more', () => {
    expect(isBarePickReference('3', CUTS)).toBe(true);
    expect(isBarePickReference('the third one', CUTS)).toBe(true);
    expect(isBarePickReference('cut 2', CUTS)).toBe(true);
    expect(isBarePickReference("I'll take 3", CUTS)).toBe(true);
    expect(isBarePickReference('go with number 4 please', CUTS)).toBe(true);
    expect(isBarePickReference('the last one', CUTS)).toBe(true);
    expect(isBarePickReference('2!', CUTS)).toBe(true);
    // Preference intensifiers are filler, not instructions — otherwise
    // "I like 2 the most" falls through to a paid critique.
    expect(isBarePickReference('I like 2 the most', CUTS)).toBe(true);
    expect(isBarePickReference('2 is my favorite', CUTS)).toBe(true);
  });

  // The distinction that keeps a pick from spending a render: an instruction
  // mentioning a cut is a critique, not a choice.
  it('rejects an instruction that happens to name a cut', () => {
    expect(isBarePickReference('make 2 bolder', CUTS)).toBe(false);
    expect(isBarePickReference('2 but thinner lines', CUTS)).toBe(false);
    expect(isBarePickReference('can you redo 3 without the skull', CUTS)).toBe(false);
    expect(isBarePickReference('3 is missing riku', CUTS)).toBe(false);
    expect(isBarePickReference('the third one needs more contrast', CUTS)).toBe(false);
  });

  it('rejects anything that names no single cut', () => {
    expect(isBarePickReference('these look great', CUTS)).toBe(false);
    expect(isBarePickReference('2 and 3', CUTS)).toBe(false);
    expect(isBarePickReference('not 3', CUTS)).toBe(false);
  });
});

describe('parsePickOrdinals', () => {
  it('returns every distinct cut named, ascending', () => {
    expect(parsePickOrdinals('2 and 3', CUTS)).toEqual([2, 3]);
    expect(parsePickOrdinals('4 and 1', CUTS)).toEqual([1, 4]);
  });

  it('de-duplicates a cut named two ways', () => {
    expect(parsePickOrdinals('the third one, cut 3', CUTS)).toEqual([3]);
  });

  it('returns an empty array when nothing is named', () => {
    expect(parsePickOrdinals('yes please', CUTS)).toEqual([]);
  });
});
