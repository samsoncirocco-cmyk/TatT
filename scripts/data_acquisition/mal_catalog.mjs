/**
 * Deterministic MyAnimeList catalog builder backed by Jikan's read-only v4
 * adapter. Jikan exposes MAL ranking and character relationships without
 * credentials; the generated identities remain MAL identities.
 *
 * The public interface accepts page loaders rather than creating network
 * clients. Production uses a disk-cached fetch adapter; tests use fixtures.
 */

const MAL_ORIGIN = 'https://myanimelist.net';
const JIKAN_ORIGIN = 'https://api.jikan.moe/v4';

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} was not an object`);
  }
  return value;
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
  return document.data.map((raw, index) => {
    const item = requireObject(raw, `Jikan ranking item ${index}`);
    if (!Number.isSafeInteger(item.mal_id) || !Number.isSafeInteger(item.rank) || !item.title) {
      throw new Error(`Jikan ranking item ${index} was missing MAL id, rank, or title`);
    }
    return {
      id: `mal-anime-${item.mal_id}`,
      malId: item.mal_id,
      rank: item.rank,
      title: item.title,
      aliases: factualAliases(item.title, [item.title_english, item.title_japanese]),
      sourcePath: `/anime/${item.mal_id}`,
    };
  });
}

export function parseJikanCharacterPage(payload) {
  const document = requireObject(payload, 'Jikan character response');
  if (!Array.isArray(document.data)) throw new Error('Jikan character response had no data array');
  const byId = new Map();
  for (const [index, raw] of document.data.entries()) {
    const item = requireObject(raw, `Jikan character item ${index}`);
    if (item.role !== 'Main') continue;
    const character = requireObject(item.character, `Jikan character item ${index}.character`);
    if (!Number.isSafeInteger(character.mal_id) || typeof character.name !== 'string') {
      throw new Error(`Jikan character item ${index} was missing MAL id or name`);
    }
    const naturalOrder = [];
    if (character.name.includes(',')) {
      const parts = character.name.split(',').map((part) => part.trim()).filter(Boolean);
      if (parts.length === 2) naturalOrder.push(`${parts[1]} ${parts[0]}`);
    }
    byId.set(character.mal_id, {
      id: `mal-character-${character.mal_id}`,
      malId: character.mal_id,
      name: character.name,
      aliases: factualAliases(character.name, naturalOrder),
      role: 'main',
      sourcePath: `/character/${character.mal_id}`,
    });
  }

  return [...byId.values()].sort((a, b) => a.malId - b.malId);
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

/**
 * Build a catalog. Loaders receive stable source paths and may fetch, cache, or
 * return fixture content. A failed run is resumable when loaders cache pages.
 */
export async function buildMalCatalog({
  limit = 1000,
  retrievedAt,
  loadRankingPage,
  loadCharacterPage,
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
  if (typeof loadRankingPage !== 'function' || typeof loadCharacterPage !== 'function') {
    throw new Error('ranking and character page loaders are required');
  }

  const anime = [];
  for (let offset = 0; anime.length < limit; offset += 25) {
    const page = Math.floor(offset / 25) + 1;
    const sourcePath = `/top/anime?page=${page}&limit=25`;
    const pageEntries = parseJikanTopPage(await loadRankingPage(sourcePath, page));
    if (pageEntries.length === 0) {
      throw new Error(`MAL ranking page ${sourcePath} returned no entries before reaching ${limit}`);
    }
    anime.push(...pageEntries);
  }

  const selected = anime
    .sort((a, b) => a.rank - b.rank || a.malId - b.malId)
    .slice(0, limit);
  assertUnique(selected, 'rank', 'anime rank');
  assertUnique(selected, 'malId', 'anime MAL id');

  const enriched = await mapConcurrent(selected, concurrency, async (entry) => {
    const sourcePath = `/anime/${entry.malId}/characters`;
    const characters = parseJikanCharacterPage(await loadCharacterPage(sourcePath, entry));
    const result = { ...entry, characters };
    await onAnimeComplete(result);
    return result;
  });

  const characterIds = new Set(enriched.flatMap((entry) => entry.characters.map((character) => character.id)));
  return {
    schemaVersion: 1,
    provenance: {
      source: 'MyAnimeList',
      origin: MAL_ORIGIN,
      rankingPath: '/topanime.php',
      adapter: 'Jikan v4',
      adapterOrigin: JIKAN_ORIGIN,
      retrievedAt: new Date(retrievedAt).toISOString(),
      selection: `top ${limit} ranked anime at retrieval time`,
      characterRule: 'role marked Main on each anime character page',
    },
    counts: {
      anime: enriched.length,
      uniqueCharacters: characterIds.size,
      appearances: enriched.reduce((total, entry) => total + entry.characters.length, 0),
    },
    anime: enriched,
  };
}

export function serializeCompactCatalog(catalog) {
  return `${JSON.stringify(catalog)}\n`;
}
