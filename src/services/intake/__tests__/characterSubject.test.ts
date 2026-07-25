import { describe, it, expect } from 'vitest';
import { characterSubjectFrom } from '../internal/characterSubject';

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
