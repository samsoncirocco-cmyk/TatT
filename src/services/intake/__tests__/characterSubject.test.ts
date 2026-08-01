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

  it('accepts an ambiguous name when an unambiguous castmate pins the series', () => {
    // "cell" alone is an ordinary word, but Gohan pins Dragon Ball — the
    // evocation answer "gohan and cell's beam struggle" names no series
    // (TAT-51), and dropping Cell would truncate the cast.
    const matches = charactersIn("gohan and cell's beam struggle");

    expect(matches.map((m) => m.name)).toEqual(['gohan', 'cell']);
    expect(matches.every((m) => m.series === 'Dragon Ball')).toBe(true);
  });

  it('does not treat a homonym as cast just because a castmate matched', () => {
    // Gohan pins Dragon Ball, but "prison cell" is the common noun — not Cell.
    const matches = charactersIn('gohan in a prison cell');

    expect(matches.map((m) => m.name)).toEqual(['gohan']);
    expect(matches.some((m) => m.name === 'cell')).toBe(false);
  });

  it('still rejects ambiguous names with no castmate and no series', () => {
    expect(charactersIn('a healthy cell under a microscope')).toEqual([]);
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

  it('recognizes a main character from the generated top-1000 catalog', () => {
    const [reinhard] = charactersIn(
      'Reinhard von Lohengramm from Ginga Eiyuu Densetsu in a throne-room scene'
    );

    expect(reinhard).toEqual({
      name: 'reinhard von lohengramm',
      series: 'Ginga Eiyuu Densetsu',
      description:
        'Reinhard von Lohengramm, a main character from Ginga Eiyuu Densetsu',
    });
  });

  /*
   * Founder-reported (2026-07-30): a Kingdom Hearts sleeve resolved "Sora"
   * to the No Game No Life character — the only Sora in the anime catalog,
   * accepted because the name is unique there. Kingdom Hearts is a game and
   * is not in the catalog at all, so nothing ever contradicted the guess.
   */
  it('does not enrich a catalog name the customer’s franchise contradicts', () => {
    const matches = charactersIn(
      'a kingdom hearts sleeve with Roxas, Sora, Axel and Riku sparring with their Keyblades'
    );

    expect(matches.map((match) => match.series)).not.toContain('No Game No Life');
    expect(
      characterSubjectFrom(
        'a kingdom hearts sleeve with Roxas, Sora, Axel and Riku sparring'
      ) ?? ''
    ).not.toMatch(/no game no life/i);
  });

  it('does not guess a source for a bare name shared across media', () => {
    expect(charactersIn('a sleeve with Sora')).toEqual([]);
    expect(charactersIn('KH Sora')).toEqual([]);
  });

  it('enriches the same shared name when its matching series is explicit', () => {
    expect(charactersIn('No Game No Life Sora')[0]).toMatchObject({
      name: 'sora',
      series: 'No Game No Life',
    });
    expect(charactersIn('NGNL Sora')[0]).toMatchObject({
      name: 'sora',
      series: 'No Game No Life',
    });
  });

  it('keeps enriching an unambiguous catalog name', () => {
    expect(charactersIn('deku from my hero academia')[0]?.series).toBe(
      'My Hero Academia'
    );
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
  it('carries the full costume description, and is the base of the full subject', () => {
    const matches = charactersIn('goku charging a kamehameha');
    const anchors = subjectPhraseFor(matches)!;
    const full = characterSubjectFrom('goku charging a kamehameha')!;

    expect(anchors.toLowerCase()).toContain('orange gi');
    // subjectPhraseFor is who the character IS; characterSubjectFrom adds
    // what they are DOING, so the anchors lead the full subject.
    expect(full.startsWith(anchors)).toBe(true);
    expect(full.toLowerCase()).toContain('charging a kamehameha');
  });

  it('is undefined for no matches', () => {
    expect(subjectPhraseFor([])).toBeUndefined();
  });
});

describe('characterSubjectFrom — the moment rides along with the anchors', () => {
  it('keeps the action the user asked for', () => {
    const subject = characterSubjectFrom('goku from dragon ball z charging a kamehameha');

    expect(subject).toBeDefined();
    expect(subject!.toLowerCase()).toContain('goku');
    expect(subject!.toLowerCase()).toContain('charging a kamehameha');
  });

  it('omits the moment clause when the user described no action', () => {
    const subject = characterSubjectFrom('a tattoo of levi ackerman');

    expect(subject).toBeDefined();
    expect(subject!.toLowerCase()).toContain('levi');
  });
});
