import { describe, expect, it } from 'vitest';
import {
  createCharacterCatalogMatcher,
  type GeneratedCharacterCatalog,
} from './catalogMatcher';

function anime(
  title: string,
  selectionPosition: number,
  characters: { id: string; name: string; aliases?: string[] }[],
) {
  return {
    title,
    aliases: [],
    selectionPosition,
    characters: characters.map((character) => ({ ...character, role: 'main' as const })),
  };
}

const fixture: GeneratedCharacterCatalog = {
  schemaVersion: 2,
  anime: [
    anime('Cowboy Bebop', 1, [
      { id: 'kitsu-character-1', name: 'Spike Spiegel', aliases: ['Spike'] },
    ]),
    anime('Death Note', 2, [
      { id: 'kitsu-character-2', name: 'Light Yagami', aliases: ['Light'] },
    ]),
    anime('Series Alpha', 3, [
      { id: 'kitsu-character-3', name: 'Akira A', aliases: ['Akira'] },
    ]),
    anime('Series Beta', 4, [
      { id: 'kitsu-character-4', name: 'Akira B', aliases: ['Akira'] },
    ]),
    anime('Unicode Heroes', 5, [
      { id: 'kitsu-character-5', name: 'Éclair', aliases: ['エクレア'] },
    ]),
  ],
};

describe('generated character catalog matcher', () => {
  it('accepts schema v3 source-qualified Jikan fallback identities', () => {
    const v3: GeneratedCharacterCatalog = {
      schemaVersion: 3,
      anime: [{
        ...anime('Frieren: Beyond Journey’s End', 1, [{
          id: 'mal-character-188176',
          name: 'Frieren',
        }]),
        characterSource: 'Jikan',
        characters: [{
          id: 'mal-character-188176',
          name: 'Frieren',
          aliases: [],
          role: 'main',
          source: 'Jikan',
          sourcePath: '/characters/188176',
        }],
      }],
    };

    expect(createCharacterCatalogMatcher(v3)('a Frieren tattoo')).toEqual([
      expect.objectContaining({
        characterId: 'mal-character-188176',
        name: 'frieren',
        series: 'Frieren: Beyond Journey’s End',
      }),
    ]);
  });

  it('rejects unknown future schemas instead of silently disabling detection', () => {
    expect(() =>
      createCharacterCatalogMatcher({
        schemaVersion: 4,
        anime: [],
      } as unknown as GeneratedCharacterCatalog)
    ).toThrow(/Unsupported character catalog schema: 4/);
  });

  it('rejects malformed supported catalogs instead of silently dropping rows', () => {
    expect(() =>
      createCharacterCatalogMatcher({
        schemaVersion: 3,
        anime: [{ title: 'Broken', selectionPosition: 1 }],
      } as unknown as GeneratedCharacterCatalog)
    ).toThrow(/anime 0 was malformed/);
  });

  it('recognizes a generated character and uses only a factual fallback description', () => {
    const match = createCharacterCatalogMatcher(fixture)('Spike Spiegel portrait')[0];

    expect(match).toEqual({
      characterId: 'kitsu-character-1',
      name: 'spike spiegel',
      series: 'Cowboy Bebop',
      description: 'Spike Spiegel, a main character from Cowboy Bebop',
    });
    expect(match.description).not.toMatch(/hair|eyes|costume|wearing/i);
  });

  it('uses the curated visual description as an overlay when identity and series align', () => {
    const matcher = createCharacterCatalogMatcher(fixture, [{
      name: 'spike',
      aliases: ['spike spiegel'],
      series: 'Cowboy Bebop',
      description: 'curated visual anchors',
    }]);

    expect(matcher('Spike Spiegel')[0]).toMatchObject({
      name: 'spike',
      series: 'Cowboy Bebop',
      description: 'curated visual anchors',
    });
  });

  it('rejects a colliding alias until the series identifies exactly one character', () => {
    const matcher = createCharacterCatalogMatcher(fixture);

    expect(matcher('an Akira tattoo')).toEqual([]);
    expect(matcher('Akira from Series Beta')).toEqual([
      expect.objectContaining({
        characterId: 'kitsu-character-4',
        name: 'akira b',
        series: 'Series Beta',
      }),
    ]);
  });

  it('refuses a unique name when the customer named a different franchise', () => {
    const matcher = createCharacterCatalogMatcher(fixture);

    // Silence about franchises still enriches: one Spike, no contradiction.
    expect(matcher('a Spike Spiegel sleeve')[0]?.characterId).toBe('kitsu-character-1');
    // A named catalog series that is not his makes the guess wrong.
    expect(matcher('a Death Note sleeve with Spike')).toEqual([]);
  });

  it('treats a franchise the anime catalog cannot hold as a franchise', () => {
    const matcher = createCharacterCatalogMatcher(fixture);

    // The production failure: a game franchise leaves the catalog no series
    // signal at all, so the only same-named anime character got accepted.
    expect(matcher('a kingdom hearts sleeve with Spike, Riku and Roxas')).toEqual([]);
  });

  it('still enriches when the named franchise IS the character’s series', () => {
    const matcher = createCharacterCatalogMatcher(fixture);

    expect(
      matcher('a Cowboy Bebop sleeve with Spike')[0],
    ).toMatchObject({ characterId: 'kitsu-character-1', series: 'Cowboy Bebop' });
  });

  it('does not turn an ordinary prose word into a character', () => {
    const matcher = createCharacterCatalogMatcher(fixture);

    expect(matcher('use a light grey wash with delicate shading')).toEqual([]);
    expect(matcher('Light from Death Note holding an apple')).toEqual([
      expect.objectContaining({ characterId: 'kitsu-character-2' }),
    ]);
  });

  it('uses Unicode-safe token matching for accented and non-Latin names', () => {
    const matcher = createCharacterCatalogMatcher(fixture);

    expect(matcher('ÉCLAIR in a floral frame')[0]?.characterId).toBe('kitsu-character-5');
    expect(matcher('エクレア のタトゥー')[0]?.characterId).toBe('kitsu-character-5');
    expect(matcher('préÉclairpost')).toEqual([]);
  });

  it('indexes a large catalog once, preserves an ensemble, and honors the caller cap', () => {
    const catalog: GeneratedCharacterCatalog = {
      schemaVersion: 2,
      anime: Array.from({ length: 1_000 }, (_, index) =>
        anime(`Show ${index}`, index + 1, [{
          id: `character-${index}`,
          name: `HeroName${index}`,
        }])
      ),
    };
    const matcher = createCharacterCatalogMatcher(catalog);
    const request = Array.from({ length: 13 }, (_, index) => `HeroName${index}`).join(' and ');

    expect(matcher(request, 12)).toHaveLength(12);
    expect(matcher(request, 12).map((match) => match.characterId)).toEqual(
      Array.from({ length: 12 }, (_, index) => `character-${index}`),
    );
  });
});
