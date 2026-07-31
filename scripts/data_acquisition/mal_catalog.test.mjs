import { describe, expect, it, vi } from 'vitest';
import {
  buildMalCatalog,
  parseJikanCharacterPage,
  parseJikanTopPage,
  serializeCompactCatalog,
} from './mal_catalog.mjs';
import { cacheName, parseArgs, run } from './build_mal_character_catalog.mjs';

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

const charactersFixture = {
  data: [
    {
      character: { mal_id: 11, name: 'Elric, Edward' },
      role: 'Main',
    },
    {
      character: { mal_id: 12, name: 'Rockbell, Winry' },
      role: 'Supporting',
    },
  ],
};

describe('Jikan/MAL response parsers', () => {
  it('extracts stable MAL anime IDs, ranks, factual title aliases, and source paths', () => {
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

  it('keeps only Main roles and generates a deterministic natural-order alias', () => {
    expect(parseJikanCharacterPage(charactersFixture)).toEqual([
      {
        id: 'mal-character-11',
        malId: 11,
        name: 'Elric, Edward',
        aliases: ['Edward Elric'],
        role: 'main',
        sourcePath: '/character/11',
      },
    ]);
  });

  it('fails loudly on malformed responses instead of emitting an empty catalog', () => {
    expect(() => parseJikanTopPage({ status: 429 })).toThrow(/data array/);
    expect(() => parseJikanCharacterPage('<html>Access denied</html>')).toThrow(/not an object/);
  });
});

describe('catalog builder', () => {
  it('sorts by rank, reports deduplicated counts, and is byte-deterministic', async () => {
    const loadRankingPage = vi.fn(async () => rankingFixture);
    const loadCharacterPage = vi.fn(async () => charactersFixture);
    const catalog = await buildMalCatalog({
      limit: 2,
      retrievedAt: '2026-07-30T12:00:00-07:00',
      loadRankingPage,
      loadCharacterPage,
      concurrency: 2,
    });

    expect(catalog.anime.map((anime) => anime.rank)).toEqual([1, 2]);
    expect(catalog.counts).toEqual({ anime: 2, uniqueCharacters: 1, appearances: 2 });
    expect(catalog.provenance).toMatchObject({
      source: 'MyAnimeList',
      adapter: 'Jikan v4',
      retrievedAt: '2026-07-30T19:00:00.000Z',
    });
    expect(serializeCompactCatalog(catalog)).toBe(`${JSON.stringify(catalog)}\n`);
    expect(loadRankingPage).toHaveBeenCalledWith('/top/anime?page=1&limit=25', 1);
    expect(loadCharacterPage).toHaveBeenCalledTimes(2);
  });

  it('rejects ranking pages that repeat a MAL id', async () => {
    const duplicate = {
      data: rankingFixture.data.map((entry) => ({ ...entry, mal_id: 5114 })),
    };
    await expect(
      buildMalCatalog({
        limit: 2,
        retrievedAt: '2026-07-30T19:00:00Z',
        loadRankingPage: async () => duplicate,
        loadCharacterPage: async () => charactersFixture,
      }),
    ).rejects.toThrow(/Duplicate anime MAL id/);
  });
});

describe('CLI safeguards', () => {
  it('fails closed before touching the network without source-terms authorization', async () => {
    await expect(run([])).rejects.toThrow(/written MAL permission or a licensed feed/);
  });

  it('maps only expected source paths to cache files', () => {
    expect(cacheName('/top/anime?page=2&limit=25')).toBe('ranking-02.json');
    expect(cacheName('/anime/5114/characters')).toBe('anime-5114-characters.json');
    expect(() => cacheName('/../../.env.local')).toThrow(/unsafe or unexpected/);
  });

  it('parses an explicit terms acknowledgment and rate-limited run configuration', () => {
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
      ]),
    ).toMatchObject({
      limit: 1000,
      concurrency: 3,
      delayMs: 1100,
      asOf: '2026-07-30T19:00:00Z',
      acknowledgeSourceTerms: true,
    });
  });
});
