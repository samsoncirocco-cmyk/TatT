/**
 * Deterministic ranked-anime/main-character catalog builder.
 *
 * Source responsibilities are deliberately narrow:
 * - MyAnimeList's customer-supplied top-anime page selects the anime.
 * - manami-project's ODbL anime-offline-database maps MAL anime IDs to Kitsu.
 * - Kitsu's anime-character relationships supply role and character names.
 * - Jikan fills only gaps where Kitsu has no main-character result.
 *
 * Loaders are injected so production can cache HTTP responses and tests can use
 * local fixtures. No description or image field reaches the generated catalog.
 */
import { JSDOM } from 'jsdom';

const MAL_ORIGIN = 'https://myanimelist.net';
const MANAMI_REPOSITORY = 'https://github.com/manami-project/anime-offline-database';
const KITSU_ORIGIN = 'https://kitsu.io/api/edge';
const JIKAN_ORIGIN = 'https://api.jikan.moe/v4';
const MAL_SOURCE_PATTERN = /^https:\/\/myanimelist\.net\/anime\/(\d+)(?:\/|$)/;
const KITSU_SOURCE_PATTERN = /^https:\/\/(?:kitsu\.app|kitsu\.io)\/anime\/(\d+)(?:\/|$)/;

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} was not an object`);
  }
  return value;
}

function requirePositiveId(value, label) {
  const stringValue = String(value ?? '');
  if (!/^[1-9]\d*$/.test(stringValue)) throw new Error(`${label} was not a positive ID`);
  return stringValue;
}

function factualAliases(primary, candidates) {
  const aliases = [];
  const seen = new Set([primary.toLocaleLowerCase('en')]);
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const clean = candidate.replace(/\s+/g, ' ').trim();
    const key = clean.toLocaleLowerCase('en');
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    aliases.push(clean);
  }
  return aliases.sort((a, b) => a.localeCompare(b, 'en'));
}

export function parseJikanTopPage(payload) {
  const document = requireObject(payload, 'Jikan ranking response');
  if (!Array.isArray(document.data)) throw new Error('Jikan ranking response had no data array');
  return document.data.flatMap((raw, index) => {
    const item = requireObject(raw, `Jikan ranking item ${index}`);
    if (!Number.isSafeInteger(item.mal_id) || !item.title) {
      throw new Error(`Jikan ranking item ${index} was missing MAL id or title`);
    }
    // Jikan occasionally interleaves a newly released, not-yet-ranked entry
    // into the live top feed with rank=null. It is not part of the ranked
    // selection yet, so skip it and keep paging until we have N ranked shows.
    if (item.rank === null) return [];
    if (!Number.isSafeInteger(item.rank)) {
      throw new Error(`Jikan ranking item ${index} had an invalid rank`);
    }
    return [{
      id: `mal-anime-${item.mal_id}`,
      malId: item.mal_id,
      rank: item.rank,
      title: item.title,
      aliases: factualAliases(item.title, [item.title_english, item.title_japanese]),
      sourcePath: `/anime/${item.mal_id}`,
    }];
  });
}

/** Parse one 50-row page from the MAL ranking URL supplied by the customer. */
export function parseMalTopHtml(payload) {
  if (typeof payload !== 'string' || !payload.includes('ranking-list')) {
    throw new Error('MAL ranking response was not ranking HTML');
  }
  const document = new JSDOM(payload).window.document;
  const rows = [...document.querySelectorAll('tr.ranking-list')];
  if (rows.length === 0) throw new Error('MAL ranking HTML contained no rows');
  return rows.flatMap((row, index) => {
    const rankText = row.querySelector('td.rank span')?.textContent?.trim() ?? '';
    const rank = Number(rankText);
    const titleLink = [...row.querySelectorAll('td.title a')].find(
      (link) => /\/anime\/\d+\//.test(link.href) && link.textContent?.trim(),
    );
    const idMatch = titleLink?.href.match(/\/anime\/(\d+)\//);
    const title = titleLink?.textContent?.replace(/\s+/g, ' ').trim();
    if (!Number.isSafeInteger(rank) || rank < 1 || !idMatch || !title) {
      throw new Error(`MAL ranking HTML row ${index} was missing rank, anime ID, or title`);
    }
    const malId = Number(idMatch[1]);
    return [{
      id: `mal-anime-${malId}`,
      malId,
      rank,
      title,
      aliases: [],
      sourcePath: `/anime/${malId}`,
    }];
  });
}

function idsFromSources(sources, index) {
  if (!Array.isArray(sources)) {
    throw new Error(`anime-offline-database item ${index} had no sources array`);
  }
  let malId = null;
  let kitsuId = null;
  for (const source of sources) {
    if (typeof source !== 'string') continue;
    const malMatch = source.match(MAL_SOURCE_PATTERN);
    const kitsuMatch = source.match(KITSU_SOURCE_PATTERN);
    if (malMatch) malId = Number(malMatch[1]);
    if (kitsuMatch) kitsuId = kitsuMatch[1];
  }
  return { malId, kitsuId };
}

/**
 * Return MAL -> Kitsu cross references plus the source's license metadata.
 * Entries without both IDs are irrelevant to this pipeline and are omitted.
 */
export function parseAnimeOfflineDatabase(payload) {
  const document = requireObject(payload, 'anime-offline-database response');
  if (!Array.isArray(document.data)) {
    throw new Error('anime-offline-database response had no data array');
  }
  const license = requireObject(document.license, 'anime-offline-database license');
  if (typeof license.name !== 'string' || typeof license.url !== 'string') {
    throw new Error('anime-offline-database license was incomplete');
  }
  if (typeof document.lastUpdate !== 'string' || Number.isNaN(Date.parse(document.lastUpdate))) {
    throw new Error('anime-offline-database lastUpdate was invalid');
  }

  const mappings = new Map();
  for (const [index, raw] of document.data.entries()) {
    const item = requireObject(raw, `anime-offline-database item ${index}`);
    const ids = idsFromSources(item.sources, index);
    if (ids.malId === null || ids.kitsuId === null) continue;
    if (mappings.has(ids.malId) && mappings.get(ids.malId) !== ids.kitsuId) {
      throw new Error(`Conflicting Kitsu mappings for MAL anime ${ids.malId}`);
    }
    mappings.set(ids.malId, ids.kitsuId);
  }

  return {
    mappings,
    provenance: {
      repository:
        typeof document.repository === 'string' ? document.repository : MANAMI_REPOSITORY,
      lastUpdate: document.lastUpdate,
      license: { name: license.name, url: license.url },
    },
  };
}

function nextKitsuPath(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error('Kitsu next-page link was not a string');
  const url = new URL(value, KITSU_ORIGIN);
  if (url.origin !== new URL(KITSU_ORIGIN).origin || !url.pathname.startsWith('/api/edge/')) {
    throw new Error(`Refusing unexpected Kitsu next-page URL: ${value}`);
  }
  return `${url.pathname.slice('/api/edge'.length)}${url.search}`;
}

/**
 * Parse a JSON:API page and join animeCharacters to included characters.
 */
export function parseKitsuAnimeCharacterPage(payload) {
  const document = requireObject(payload, 'Kitsu anime-character response');
  if (!Array.isArray(document.data)) {
    throw new Error('Kitsu anime-character response had no data array');
  }
  const included = Array.isArray(document.included) ? document.included : [];
  const charactersById = new Map(
    included
      .filter((item) => item?.type === 'characters')
      .map((item, index) => {
        const character = requireObject(item, `Kitsu included character ${index}`);
        return [requirePositiveId(character.id, `Kitsu included character ${index}.id`), character];
      }),
  );

  const characters = [];
  for (const [index, raw] of document.data.entries()) {
    const relationship = requireObject(raw, `Kitsu anime-character item ${index}`);
    if (relationship.type !== 'animeCharacters') continue;
    if (relationship.attributes?.role !== 'main') continue;
    const characterId = requirePositiveId(
      relationship.relationships?.character?.data?.id,
      `Kitsu anime-character item ${index}.character.id`,
    );
    const character = charactersById.get(characterId);
    if (!character) {
      throw new Error(`Kitsu response did not include main character ${characterId}`);
    }
    const attributes = requireObject(
      character.attributes,
      `Kitsu included character ${characterId}.attributes`,
    );
    const name = attributes.canonicalName ?? attributes.name;
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error(`Kitsu character ${characterId} had no canonical name`);
    }
    const localizedNames =
      attributes.names && typeof attributes.names === 'object'
        ? Object.values(attributes.names)
        : [];
    const otherNames = Array.isArray(attributes.otherNames) ? attributes.otherNames : [];
    characters.push({
      id: `kitsu-character-${characterId}`,
      kitsuId: characterId,
      name: name.replace(/\s+/g, ' ').trim(),
      aliases: factualAliases(name, [
        attributes.name,
        ...localizedNames,
        ...otherNames,
      ]),
      role: 'main',
      source: 'Kitsu',
      sourcePath: `/characters/${characterId}`,
    });
  }

  return {
    characters: characters.sort((a, b) => Number(a.kitsuId) - Number(b.kitsuId)),
    nextPath: nextKitsuPath(document.links?.next),
  };
}

/**
 * Parse Jikan's anime-character response as a deliberately narrow fallback.
 * Only exact Main relationships and the character's MAL ID/name survive.
 */
export function parseJikanAnimeCharacters(payload) {
  const document = requireObject(payload, 'Jikan anime-character response');
  if (!Array.isArray(document.data)) {
    throw new Error('Jikan anime-character response had no data array');
  }
  const byMalId = new Map();
  for (const [index, raw] of document.data.entries()) {
    const relationship = requireObject(raw, `Jikan anime-character item ${index}`);
    if (relationship.role !== 'Main') continue;
    const character = requireObject(
      relationship.character,
      `Jikan anime-character item ${index}.character`,
    );
    if (!Number.isSafeInteger(character.mal_id) || character.mal_id < 1) {
      throw new Error(`Jikan anime-character item ${index} had no valid character MAL id`);
    }
    if (typeof character.name !== 'string' || !character.name.trim()) {
      throw new Error(`Jikan character ${character.mal_id} had no name`);
    }
    const name = character.name.replace(/\s+/g, ' ').trim();
    const existing = byMalId.get(character.mal_id);
    if (existing && existing.name !== name) {
      throw new Error(`Conflicting Jikan names for character ${character.mal_id}`);
    }
    if (existing) continue;
    byMalId.set(character.mal_id, {
      id: `mal-character-${character.mal_id}`,
      malId: character.mal_id,
      name,
      aliases: [],
      role: 'main',
      source: 'Jikan',
      sourcePath: `/characters/${character.mal_id}`,
    });
  }
  return [...byMalId.values()].sort((a, b) => a.malId - b.malId);
}

function assertUnique(entries, field, label) {
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry[field])) throw new Error(`Duplicate ${label}: ${entry[field]}`);
    seen.add(entry[field]);
  }
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function loadAllKitsuCharacters(entry, loadKitsuPage) {
  let sourcePath =
    '/anime-characters' +
    `?filter%5BanimeId%5D=${entry.kitsuId}&include=character` +
    '&page%5Blimit%5D=20&page%5Boffset%5D=0';
  const byId = new Map();
  const visited = new Set();
  while (sourcePath) {
    if (visited.has(sourcePath)) throw new Error(`Kitsu pagination loop for anime ${entry.kitsuId}`);
    visited.add(sourcePath);
    const page = parseKitsuAnimeCharacterPage(await loadKitsuPage(sourcePath, entry));
    for (const character of page.characters) byId.set(character.kitsuId, character);
    sourcePath = page.nextPath;
  }
  return [...byId.values()].sort((a, b) => Number(a.kitsuId) - Number(b.kitsuId));
}

/**
 * Build a catalog. Failed runs are resumable when the injected loaders cache
 * their source snapshots.
 */
export async function buildMalCatalog({
  limit = 1000,
  retrievedAt,
  loadRankingPage,
  loadMappingDatabase,
  loadKitsuPage,
  loadJikanCharacters,
  skipJikanFallback = false,
  concurrency = 2,
  onAnimeComplete = () => {},
}) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('limit must be a positive integer');
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error('concurrency must be a positive integer');
  }
  if (!retrievedAt || Number.isNaN(Date.parse(retrievedAt))) {
    throw new Error('retrievedAt must be an ISO-compatible timestamp');
  }
  if (
    typeof loadRankingPage !== 'function' ||
    typeof loadMappingDatabase !== 'function' ||
    typeof loadKitsuPage !== 'function' ||
    (!skipJikanFallback && typeof loadJikanCharacters !== 'function')
  ) {
    throw new Error(
      'ranking, mapping, and Kitsu loaders are required; Jikan is required unless skipped',
    );
  }

  const animeByMalId = new Map();
  for (let offset = 0; animeByMalId.size < limit; offset += 50) {
    const page = Math.floor(offset / 50) + 1;
    const sourcePath = `/topanime.php?limit=${offset}`;
    const payload = await loadRankingPage(sourcePath, page);
    const pageEntries =
      typeof payload === 'string' ? parseMalTopHtml(payload) : parseJikanTopPage(payload);
    if (pageEntries.length === 0) {
      throw new Error(`MAL ranking page ${sourcePath} returned no entries before reaching ${limit}`);
    }
    for (const entry of pageEntries) {
      const existing = animeByMalId.get(entry.malId);
      if (!existing || entry.rank < existing.rank) animeByMalId.set(entry.malId, entry);
    }
  }

  const selected = [...animeByMalId.values()]
    .sort((a, b) => a.rank - b.rank || a.malId - b.malId)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, selectionPosition: index + 1 }));
  assertUnique(selected, 'malId', 'anime MAL id');

  const mapping = parseAnimeOfflineDatabase(await loadMappingDatabase());
  const mapped = selected.map((entry) => {
    const kitsuId = mapping.mappings.get(entry.malId);
    return kitsuId ? { ...entry, kitsuId } : { ...entry, kitsuId: null };
  });

  const enriched = await mapConcurrent(mapped, concurrency, async (entry) => {
    const kitsuCharacters = entry.kitsuId
      ? await loadAllKitsuCharacters(entry, loadKitsuPage)
      : [];
    const characters = kitsuCharacters.length > 0 || skipJikanFallback
      ? kitsuCharacters
      : parseJikanAnimeCharacters(
        await loadJikanCharacters(`/anime/${entry.malId}/characters`, entry),
      );
    // IDs are source-qualified, so deduplication never treats a Kitsu ID as a
    // MAL character ID (or merges two people merely because names match).
    const deduplicated = [...new Map(
      characters.map((character) => [character.id, character]),
    ).values()];
    const result = {
      ...entry,
      characterSource: kitsuCharacters.length > 0
        ? 'Kitsu'
        : deduplicated.length > 0
          ? 'Jikan'
          : null,
      characters: deduplicated,
    };
    await onAnimeComplete(result);
    return result;
  });

  const characterIds = new Set(enriched.flatMap((entry) => entry.characters.map((character) => character.id)));
  const mappedAnime = enriched.filter((entry) => entry.kitsuId !== null).length;
  return {
    schemaVersion: 3,
    provenance: {
      ranking: {
        source: 'MyAnimeList',
        origin: MAL_ORIGIN,
        rankingPath: '/topanime.php',
        adapter: 'MyAnimeList ranking HTML',
        retrievedAt: new Date(retrievedAt).toISOString(),
        selection: `top ${limit} ranked anime at retrieval time`,
      },
      mapping: {
        source: 'manami-project anime-offline-database',
        ...mapping.provenance,
        rule: 'match exact MAL and Kitsu anime IDs from source URLs',
      },
      characters: {
        primary: {
          source: 'Kitsu',
          origin: KITSU_ORIGIN,
          rule: 'animeCharacters relationship role equals main',
        },
        fallback: {
          source: 'Jikan',
          origin: JIKAN_ORIGIN,
          enabled: !skipJikanFallback,
          rule: skipJikanFallback
            ? 'disabled by operator; Kitsu gaps remain empty'
            : 'used only when Kitsu returns zero mains or has no mapping; role equals Main',
          retainedFields: ['character.mal_id', 'character.name'],
        },
      },
    },
    counts: {
      anime: enriched.length,
      mappedAnime,
      unmappedAnime: enriched.length - mappedAnime,
      uniqueCharacters: characterIds.size,
      appearances: enriched.reduce((total, entry) => total + entry.characters.length, 0),
      kitsuAppearances: enriched.reduce(
        (total, entry) => total + entry.characters.filter((character) => character.source === 'Kitsu').length,
        0,
      ),
      jikanFallbackAppearances: enriched.reduce(
        (total, entry) => total + entry.characters.filter((character) => character.source === 'Jikan').length,
        0,
      ),
      jikanFallbackAnime: enriched.filter((entry) => entry.characterSource === 'Jikan').length,
    },
    anime: enriched,
  };
}

export function serializeCompactCatalog(catalog) {
  return `${JSON.stringify(catalog)}\n`;
}
