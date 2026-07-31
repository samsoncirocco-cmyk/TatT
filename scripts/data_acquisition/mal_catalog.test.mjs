import { describe, expect, it, vi } from 'vitest';
import {
  buildMalCatalog,
  parseAnimeOfflineDatabase,
  parseJikanAnimeCharacters,
  parseJikanTopPage,
  parseKitsuAnimeCharacterPage,
  parseMalTopHtml,
  serializeCompactCatalog,
} from './mal_catalog.mjs';
import { cacheName, parseArgs } from './build_mal_character_catalog.mjs';

const rankingFixture = {
  data: [
    {
      mal_id: 20,
      rank: 2,
      title: 'Naruto',
      title_english: 'Naruto',
      title_japanese: 'ナルト',
    },
    {
      mal_id: 5114,
      rank: 1,
      title: 'Fullmetal Alchemist: Brotherhood',
      title_english: 'Fullmetal Alchemist: Brotherhood',
      title_japanese: '鋼の錬金術師',
    },
  ],
};

const mappingFixture = {
  license: {
    name: 'Open Data Commons Open Database License (ODbL) v1.0 + Database Contents License (DbCL) v1.0',
    url: 'https://github.com/manami-project/anime-offline-database/blob/2026-27/LICENSE',
  },
  repository: 'https://github.com/manami-project/anime-offline-database',
  lastUpdate: '2026-07-03',
  data: [
    {
      title: 'Ignored title',
      picture: 'https://example.test/ignored.jpg',
      sources: [
        'https://myanimelist.net/anime/5114',
        'https://kitsu.app/anime/11061',
      ],
    },
    {
      sources: [
        'https://myanimelist.net/anime/20',
        'https://kitsu.app/anime/11',
      ],
    },
    {
      sources: ['https://myanimelist.net/anime/999'],
    },
  ],
};

const kitsuCharactersFixture = {
  data: [
    {
      id: '900',
      type: 'animeCharacters',
      attributes: { role: 'main' },
      relationships: {
        character: { data: { type: 'characters', id: '11' } },
      },
    },
    {
      id: '901',
      type: 'animeCharacters',
      attributes: { role: 'supporting' },
      relationships: {
        character: { data: { type: 'characters', id: '12' } },
      },
    },
  ],
  included: [
    {
      id: '11',
      type: 'characters',
      attributes: {
        canonicalName: 'Edward Elric',
        name: 'Edward Elric',
        names: { en: 'Edward Elric', ja_jp: 'エドワード・エルリック' },
        otherNames: ['Ed', 'Fullmetal Alchemist'],
        description: 'must never enter the catalog',
        image: { original: 'https://example.test/must-not-enter.jpg' },
      },
    },
    {
      id: '12',
      type: 'characters',
      attributes: { canonicalName: 'Winry Rockbell' },
    },
  ],
  links: { next: null },
};

const jikanCharactersFixture = {
  data: [
    {
      role: 'Main',
      character: {
        mal_id: 11,
        name: 'Edward Elric',
        images: { jpg: { image_url: 'https://example.test/must-not-enter.jpg' } },
        url: 'https://myanimelist.net/character/11',
      },
      favorites: 999,
      voice_actors: [{ person: { name: 'must not enter' } }],
    },
    {
      role: 'Supporting',
      character: { mal_id: 12, name: 'Winry Rockbell' },
    },
  ],
};

describe('source parsers', () => {
  it('parses the customer-supplied MAL ranking page directly', () => {
    expect(
      parseMalTopHtml(`
        <table><tr class="ranking-list">
          <td class="rank"><span>501</span></td>
          <td class="title">
            <a href="https://myanimelist.net/anime/42894/Natsume">Natsume Yuujinchou</a>
          </td>
        </tr></table>
      `),
    ).toEqual([
      expect.objectContaining({
        malId: 42894,
        rank: 501,
        title: 'Natsume Yuujinchou',
      }),
    ]);
  });

  it('uses Jikan only for stable MAL anime IDs, reported ranks, and factual titles', () => {
    expect(parseJikanTopPage(rankingFixture)).toEqual([
      {
        id: 'mal-anime-20',
        malId: 20,
        rank: 2,
        title: 'Naruto',
        aliases: ['ナルト'],
        sourcePath: '/anime/20',
      },
      {
        id: 'mal-anime-5114',
        malId: 5114,
        rank: 1,
        title: 'Fullmetal Alchemist: Brotherhood',
        aliases: ['鋼の錬金術師'],
        sourcePath: '/anime/5114',
      },
    ]);
  });

  it('maps exact MAL IDs to Kitsu IDs and preserves ODbL provenance', () => {
    const parsed = parseAnimeOfflineDatabase(mappingFixture);
    expect([...parsed.mappings]).toEqual([
      [5114, '11061'],
      [20, '11'],
    ]);
    expect(parsed.provenance).toEqual({
      repository: 'https://github.com/manami-project/anime-offline-database',
      lastUpdate: '2026-07-03',
      license: mappingFixture.license,
    });
  });

  it('keeps only Kitsu main roles and factual character names and aliases', () => {
    expect(parseKitsuAnimeCharacterPage(kitsuCharactersFixture)).toEqual({
      characters: [
        {
          id: 'kitsu-character-11',
          kitsuId: '11',
          name: 'Edward Elric',
          aliases: ['Ed', 'Fullmetal Alchemist', 'エドワード・エルリック'],
          role: 'main',
          source: 'Kitsu',
          sourcePath: '/characters/11',
        },
      ],
      nextPath: null,
    });
    expect(JSON.stringify(parseKitsuAnimeCharacterPage(kitsuCharactersFixture)))
      .not.toMatch(/description|image|ignored\.jpg|must-not-enter/);
  });

  it('keeps only exact Jikan Main roles and MAL character identity fields', () => {
    expect(parseJikanAnimeCharacters(jikanCharactersFixture)).toEqual([
      {
        id: 'mal-character-11',
        malId: 11,
        name: 'Edward Elric',
        aliases: [],
        role: 'main',
        source: 'Jikan',
        sourcePath: '/characters/11',
      },
    ]);
    expect(JSON.stringify(parseJikanAnimeCharacters(jikanCharactersFixture)))
      .not.toMatch(/image|voice|favorite|must-not-enter|Winry/);
  });

  it('deduplicates Jikan identities by MAL ID and rejects conflicting names', () => {
    const main = jikanCharactersFixture.data[0];
    expect(parseJikanAnimeCharacters({ data: [main, { ...main }] })).toHaveLength(1);
    expect(() =>
      parseJikanAnimeCharacters({
        data: [
          main,
          {
            role: 'Main',
            character: { mal_id: 11, name: 'A different person' },
          },
        ],
      }),
    ).toThrow(/Conflicting Jikan names/);
  });

  it('normalizes and validates Kitsu pagination links', () => {
    const parsed = parseKitsuAnimeCharacterPage({
      data: [],
      links: {
        next:
          'https://kitsu.io/api/edge/anime-characters?include=character' +
          '&page%5Blimit%5D=20&page%5Boffset%5D=20&filter%5BanimeId%5D=11061',
      },
    });
    expect(parsed.nextPath).toContain('/anime-characters?');
    expect(() =>
      parseKitsuAnimeCharacterPage({
        data: [],
        links: { next: 'https://attacker.test/steal' },
      }),
    ).toThrow(/unexpected Kitsu/);
  });

  it('fails loudly on malformed source responses', () => {
    expect(() => parseJikanTopPage({ status: 429 })).toThrow(/data array/);
    expect(() => parseAnimeOfflineDatabase({ data: [] })).toThrow(/license/);
    expect(() => parseKitsuAnimeCharacterPage('<html>Access denied</html>'))
      .toThrow(/not an object/);
    expect(() => parseJikanAnimeCharacters({ status: 429 })).toThrow(/data array/);
  });

  it('skips live feed entries that MAL has not ranked yet', () => {
    expect(
      parseJikanTopPage({
        data: [
          { mal_id: 55016, rank: null, title: 'Idol' },
          { mal_id: 5114, rank: 1, title: 'Fullmetal Alchemist: Brotherhood' },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        malId: 5114,
        rank: 1,
        title: 'Fullmetal Alchemist: Brotherhood',
      }),
    ]);
  });
});

describe('catalog builder', () => {
  it('joins ranked MAL anime to Kitsu mains with honest coverage and provenance', async () => {
    const loadRankingPage = vi.fn(async () => rankingFixture);
    const loadMappingDatabase = vi.fn(async () => mappingFixture);
    const loadKitsuPage = vi.fn(async () => kitsuCharactersFixture);
    const loadJikanCharacters = vi.fn(async () => jikanCharactersFixture);
    const catalog = await buildMalCatalog({
      limit: 2,
      retrievedAt: '2026-07-30T12:00:00-07:00',
      loadRankingPage,
      loadMappingDatabase,
      loadKitsuPage,
      loadJikanCharacters,
      concurrency: 2,
    });

    expect(catalog.anime.map(({ rank, selectionPosition, kitsuId }) => ({
      rank,
      selectionPosition,
      kitsuId,
    }))).toEqual([
      { rank: 1, selectionPosition: 1, kitsuId: '11061' },
      { rank: 2, selectionPosition: 2, kitsuId: '11' },
    ]);
    expect(catalog.counts).toEqual({
      anime: 2,
      mappedAnime: 2,
      unmappedAnime: 0,
      uniqueCharacters: 1,
      appearances: 2,
      kitsuAppearances: 2,
      jikanFallbackAppearances: 0,
      jikanFallbackAnime: 0,
    });
    expect(catalog.provenance).toMatchObject({
      ranking: {
        source: 'MyAnimeList',
        adapter: 'MyAnimeList ranking HTML',
        retrievedAt: '2026-07-30T19:00:00.000Z',
      },
      mapping: {
        source: 'manami-project anime-offline-database',
        license: mappingFixture.license,
      },
      characters: {
        primary: { source: 'Kitsu' },
        fallback: {
          source: 'Jikan',
          retainedFields: ['character.mal_id', 'character.name'],
        },
      },
    });
    expect(serializeCompactCatalog(catalog)).toBe(`${JSON.stringify(catalog)}\n`);
    expect(loadRankingPage).toHaveBeenCalledWith('/topanime.php?limit=0', 1);
    expect(loadMappingDatabase).toHaveBeenCalledOnce();
    expect(loadKitsuPage).toHaveBeenCalledTimes(2);
    expect(loadJikanCharacters).not.toHaveBeenCalled();
  });

  it('deduplicates MAL IDs and allows duplicate reported ranks during a live snapshot', async () => {
    const duplicateRanks = {
      data: [
        rankingFixture.data[0],
        { ...rankingFixture.data[0], rank: 3 },
        { ...rankingFixture.data[1], rank: 2 },
      ],
    };
    const catalog = await buildMalCatalog({
      limit: 2,
      retrievedAt: '2026-07-30T19:00:00Z',
      loadRankingPage: async () => duplicateRanks,
      loadMappingDatabase: async () => mappingFixture,
      loadKitsuPage: async () => kitsuCharactersFixture,
      loadJikanCharacters: vi.fn(),
    });
    expect(catalog.anime.map((anime) => anime.malId)).toEqual([20, 5114]);
    expect(catalog.anime.map((anime) => anime.rank)).toEqual([2, 2]);
    expect(catalog.anime.map((anime) => anime.selectionPosition)).toEqual([1, 2]);
  });

  it('retains ranked anime with no Kitsu mapping and reports zero mains honestly', async () => {
    const catalog = await buildMalCatalog({
      limit: 1,
      retrievedAt: '2026-07-30T19:00:00Z',
      loadRankingPage: async () => ({
        data: [{ mal_id: 999, rank: 1, title: 'Unmapped' }],
      }),
      loadMappingDatabase: async () => mappingFixture,
      loadKitsuPage: vi.fn(),
      loadJikanCharacters: async () => ({ data: [] }),
    });
    expect(catalog.counts).toMatchObject({ mappedAnime: 0, unmappedAnime: 1 });
    expect(catalog.anime[0]).toMatchObject({
      malId: 999,
      kitsuId: null,
      characterSource: null,
      characters: [],
    });
  });

  it('uses Jikan only when Kitsu has zero mains and keeps source-qualified IDs', async () => {
    const loadJikanCharacters = vi.fn(async () => jikanCharactersFixture);
    const catalog = await buildMalCatalog({
      limit: 1,
      retrievedAt: '2026-07-30T19:00:00Z',
      loadRankingPage: async () => ({
        data: [{ mal_id: 5114, rank: 1, title: 'Fullmetal Alchemist: Brotherhood' }],
      }),
      loadMappingDatabase: async () => mappingFixture,
      loadKitsuPage: async () => ({ data: [], included: [], links: { next: null } }),
      loadJikanCharacters,
    });
    expect(loadJikanCharacters).toHaveBeenCalledWith(
      '/anime/5114/characters',
      expect.objectContaining({ malId: 5114, kitsuId: '11061' }),
    );
    expect(catalog.anime[0]).toMatchObject({
      characterSource: 'Jikan',
      characters: [
        expect.objectContaining({
          id: 'mal-character-11',
          malId: 11,
          source: 'Jikan',
        }),
      ],
    });
    expect(catalog.counts).toMatchObject({
      kitsuAppearances: 0,
      jikanFallbackAppearances: 1,
      jikanFallbackAnime: 1,
    });
  });

  it('can leave Kitsu gaps empty without requiring or calling a Jikan loader', async () => {
    const catalog = await buildMalCatalog({
      limit: 1,
      retrievedAt: '2026-07-30T19:00:00Z',
      loadRankingPage: async () => ({
        data: [{ mal_id: 5114, rank: 1, title: 'Fullmetal Alchemist: Brotherhood' }],
      }),
      loadMappingDatabase: async () => mappingFixture,
      loadKitsuPage: async () => ({ data: [], included: [], links: { next: null } }),
      skipJikanFallback: true,
    });
    expect(catalog.anime[0]).toMatchObject({
      malId: 5114,
      kitsuId: '11061',
      characterSource: null,
      characters: [],
    });
    expect(catalog.provenance.characters.fallback).toMatchObject({
      source: 'Jikan',
      enabled: false,
      rule: 'disabled by operator; Kitsu gaps remain empty',
    });
    expect(catalog.counts).toMatchObject({
      appearances: 0,
      kitsuAppearances: 0,
      jikanFallbackAppearances: 0,
      jikanFallbackAnime: 0,
    });
  });
});

describe('CLI safeguards', () => {
  it('maps only expected source paths to cache files', () => {
    expect(cacheName('/topanime.php?limit=50')).toBe('ranking-02.json');
    expect(cacheName('anime-offline-database-minified.json'))
      .toBe('anime-offline-database.json');
    expect(cacheName('/anime/5114/characters'))
      .toBe('mal-anime-5114-characters.json');
    expect(
      cacheName(
        '/anime-characters?filter%5BanimeId%5D=11061&include=character' +
        '&page%5Blimit%5D=20&page%5Boffset%5D=20',
      ),
    ).toBe('anime-11061-characters-0020.json');
    expect(() => cacheName('/../../.env.local')).toThrow(/unsafe or unexpected/);
    expect(() =>
      cacheName(
        '/anime-characters?filter%5BanimeId%5D=11061&include=character' +
        '&page%5Blimit%5D=20&page%5Boffset%5D=0&evil=true',
      ),
    ).toThrow(/unsafe or unexpected/);
  });

  it('parses a rate-limited, resumable run configuration', () => {
    expect(
      parseArgs([
        '--limit',
        '1000',
        '--out',
        './catalog.json',
        '--cache-dir',
        './cache',
        '--concurrency',
        '3',
        '--delay-ms',
        '1100',
        '--as-of',
        '2026-07-30T19:00:00Z',
        '--acknowledge-source-terms',
        '--skip-jikan-fallback',
      ]),
    ).toMatchObject({
      limit: 1000,
      concurrency: 3,
      delayMs: 1100,
      asOf: '2026-07-30T19:00:00Z',
      acknowledgeSourceTerms: true,
      skipJikanFallback: true,
    });
  });

  it('requires explicit source-terms acknowledgment before acquisition', async () => {
    await expect(
      import('./build_mal_character_catalog.mjs').then(({ run }) =>
        run(['--limit', '1', '--cache-dir', './irrelevant-cache']),
      ),
    ).rejects.toThrow(/acknowledge-source-terms/);
  });
});
