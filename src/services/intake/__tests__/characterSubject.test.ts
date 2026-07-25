import { describe, it, expect } from 'vitest';
import {
  characterSubjectFrom,
  charactersIn,
  characterLabelFor,
  subjectPhraseFor,
} from '../internal/characterSubject';

describe('characterSubjectFrom — deterministic subject backfill', () => {
  it('builds a costume-anchored subject from a single named character', () => {
    const subject = characterSubjectFrom('goku from dragon ball z charging a kamehameha');

    expect(subject).toBeDefined();
    expect(subject!.toLowerCase()).toContain('goku');
    // The database anchors carry costume/visual detail, not just the name.
    expect(subject!.length).toBeGreaterThan(40);
  });

  it('keeps two characters as a scene rather than collapsing to one', () => {
    const subject = characterSubjectFrom('deku and todoroki fighting each other');

    expect(subject).toBeDefined();
    expect(subject!.toLowerCase()).toContain('midoriya');
    expect(subject!.toLowerCase()).toContain('todoroki');
  });

  it('distinguishes lookalike white-haired characters by costume anchors', () => {
    const killua = characterSubjectFrom('killua zoldyck with his lightning');

    expect(killua!.toLowerCase()).toContain('killua');
    expect(killua!.toLowerCase()).not.toContain('gojo');
  });

  it('returns undefined when nothing specific is named', () => {
    expect(characterSubjectFrom('something about strength and my grandmother')).toBeUndefined();
    expect(characterSubjectFrom('')).toBeUndefined();
  });
});

describe('characterSubjectFrom — false-positive guards', () => {
  it('does not turn ordinary English words into characters', () => {
    expect(characterSubjectFrom('keep it simple, black and grey')).toBeUndefined();
    expect(characterSubjectFrom('something about power and pain')).toBeUndefined();
    expect(characterSubjectFrom('a cloud over the mountains')).toBeUndefined();
  });

  it('accepts an ambiguous name when its series is named too', () => {
    const subject = characterSubjectFrom('power from chainsaw man');

    expect(subject).toBeDefined();
    expect(subject!.toLowerCase()).toContain('power');
  });
});

describe('charactersIn — structured matches', () => {
  it('returns name, series and description separately', () => {
    const [goku] = charactersIn('goku from dragon ball z charging a kamehameha');

    expect(goku.name).toBe('goku');
    expect(goku.series).toBe('Dragon Ball');
    // The costume anchors the prompts depend on stay on `description`.
    expect(goku.description.toLowerCase()).toContain('orange gi');
  });

  it('returns an empty array when nothing is named', () => {
    expect(charactersIn('keep it simple, black and grey')).toEqual([]);
    expect(charactersIn('')).toEqual([]);
  });
});

describe('characterLabelFor — the playback-facing short label', () => {
  it('names the character and series without the costume prose', () => {
    const label = characterLabelFor(charactersIn('goku charging a kamehameha'));

    expect(label).toBe('Goku (Dragon Ball)');
    // The whole point: the unreadable costume description must NOT be here.
    expect(label!.toLowerCase()).not.toContain('orange gi');
    expect(label!.toLowerCase()).not.toContain('spiky');
  });

  it('joins two characters from the same series under one series note', () => {
    const label = characterLabelFor(charactersIn('deku and todoroki fighting each other'));

    expect(label).toContain('Todoroki');
    expect(label).toContain('(My Hero Academia)');
    expect(label!.length).toBeLessThan(60);
  });

  it('is undefined when no character was named', () => {
    expect(characterLabelFor([])).toBeUndefined();
  });
});

describe('subjectPhraseFor — the prompt-facing anchors', () => {
  it('still carries the full costume description (unchanged contract)', () => {
    const matches = charactersIn('goku charging a kamehameha');

    expect(subjectPhraseFor(matches)).toBe(characterSubjectFrom('goku charging a kamehameha'));
    expect(subjectPhraseFor(matches)!.toLowerCase()).toContain('orange gi');
  });

  it('is undefined for no matches', () => {
    expect(subjectPhraseFor([])).toBeUndefined();
  });
});
