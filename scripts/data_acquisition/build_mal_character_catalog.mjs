#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  buildMalCatalog,
  parseMalTopHtml,
  serializeCompactCatalog,
} from './mal_catalog.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = resolve(SCRIPT_DIR, '../../src/data/generated/mal-character-catalog.json');
const DEFAULT_CACHE = resolve(SCRIPT_DIR, '../../.tmp/mal-character-catalog');
const MAL_ORIGIN = 'https://myanimelist.net';
const KITSU_ORIGIN = 'https://kitsu.io/api/edge';
const JIKAN_ORIGIN = 'https://api.jikan.moe/v4';
const MANAMI_SNAPSHOT =
  'https://github.com/manami-project/anime-offline-database/releases/latest/download/anime-offline-database-minified.json';
const USER_AGENT = 'TatTTester character catalog builder/2.0 (https://tatttester.com)';

function usage() {
  return `Build a resumable ranked-anime/main-character catalog.

Usage:
  node scripts/data_acquisition/build_mal_character_catalog.mjs [options]

Options:
  --limit N          Ranked anime entries to include (default: 1000)
  --out PATH         Generated compact JSON path
  --cache-dir PATH   Source cache/checkpoint directory
  --concurrency N    Kitsu anime records processed concurrently (default: 2)
  --delay-ms N       Minimum delay per source between requests (default: 1100)
  --refresh          Ignore cached responses and fetch all sources again
  --as-of ISO        Fixed provenance timestamp for a new cache
  --acknowledge-source-terms
                     Confirm authorization and source terms were reviewed
  --skip-jikan-fallback
                     Build from MAL/manami/Kitsu only; leave Kitsu gaps empty
  --help             Show this help

The supplied MAL top-anime ranking selects the shows. manami-project maps MAL anime IDs to Kitsu
IDs. Kitsu supplies main-character relationships and factual names. Jikan fills
only shows with no Kitsu main cast. Interrupted runs resume from reduced source
caches; no descriptions or images are retained.
`;
}

function parseArgs(argv) {
  const options = {
    limit: 1000,
    out: DEFAULT_OUT,
    cacheDir: DEFAULT_CACHE,
    concurrency: 2,
    delayMs: 1100,
    refresh: false,
    asOf: null,
    acknowledgeSourceTerms: false,
    skipJikanFallback: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') return { help: true };
    if (arg === '--refresh') {
      options.refresh = true;
      continue;
    }
    if (arg === '--acknowledge-source-terms') {
      options.acknowledgeSourceTerms = true;
      continue;
    }
    if (arg === '--skip-jikan-fallback') {
      options.skipJikanFallback = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`Missing value after ${arg}`);
    if (arg === '--limit') options.limit = Number(value);
    else if (arg === '--out') options.out = resolve(value);
    else if (arg === '--cache-dir') options.cacheDir = resolve(value);
    else if (arg === '--concurrency') options.concurrency = Number(value);
    else if (arg === '--delay-ms') options.delayMs = Number(value);
    else if (arg === '--as-of') options.asOf = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  if (!Number.isSafeInteger(options.delayMs) || options.delayMs < 0) {
    throw new Error('--delay-ms must be a non-negative integer');
  }
  return options;
}

async function atomicWrite(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, contents);
  await rename(temporary, path);
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function cacheName(sourcePath) {
  const ranking = sourcePath.match(/^\/topanime\.php\?limit=(\d+)$/);
  if (ranking) {
    const page = Math.floor(Number(ranking[1]) / 50) + 1;
    return `ranking-${String(page).padStart(2, '0')}.json`;
  }
  if (sourcePath === 'anime-offline-database-minified.json') return 'anime-offline-database.json';
  const jikanCharacters = sourcePath.match(/^\/anime\/([1-9]\d*)\/characters$/);
  if (jikanCharacters) return `mal-anime-${jikanCharacters[1]}-characters.json`;
  const url = new URL(`${KITSU_ORIGIN}${sourcePath}`);
  const allowedKitsuParams = new Set([
    'filter[animeId]',
    'include',
    'page[limit]',
    'page[offset]',
  ]);
  const hasOnlyAllowedParams = [...url.searchParams.keys()]
    .every((key) => allowedKitsuParams.has(key));
  const kitsuId = url.searchParams.get('filter[animeId]');
  const offset = url.searchParams.get('page[offset]');
  if (
    url.origin === new URL(KITSU_ORIGIN).origin &&
    url.pathname === '/api/edge/anime-characters' &&
    hasOnlyAllowedParams &&
    /^[1-9]\d*$/.test(kitsuId ?? '') &&
    url.searchParams.get('include') === 'character' &&
    url.searchParams.get('page[limit]') === '20' &&
    /^\d+$/.test(offset ?? '')
  ) {
    return `anime-${kitsuId}-characters-${offset.padStart(4, '0')}.json`;
  }
  throw new Error(`Refusing unsafe or unexpected source path: ${sourcePath}`);
}

function compactMalRanking(html) {
  const entries = parseMalTopHtml(html);
  return {
    data: entries.map((anime) => ({
      mal_id: anime.malId,
      rank: anime.rank,
      title: anime.title,
    })),
  };
}

function compactMappingDatabase(document) {
  if (!document || !Array.isArray(document.data)) return document;
  return {
    license: document.license,
    repository: document.repository,
    lastUpdate: document.lastUpdate,
    data: document.data.map((anime) => ({ sources: anime.sources })),
  };
}

function compactKitsuCharacters(document) {
  if (!document || !Array.isArray(document.data)) return document;
  return {
    data: document.data.map((relationship) => ({
      id: relationship.id,
      type: relationship.type,
      attributes: { role: relationship.attributes?.role },
      relationships: {
        character: { data: relationship.relationships?.character?.data },
      },
    })),
    included: Array.isArray(document.included)
      ? document.included
        .filter((item) => item?.type === 'characters')
        .map((character) => ({
          id: character.id,
          type: character.type,
          attributes: {
            canonicalName: character.attributes?.canonicalName,
            name: character.attributes?.name,
            names: character.attributes?.names,
            otherNames: character.attributes?.otherNames,
          },
        }))
      : [],
    links: { next: document.links?.next ?? null },
  };
}

function compactJikanCharacters(document) {
  if (!document || !Array.isArray(document.data)) return document;
  return {
    data: document.data.map((relationship) => ({
      role: relationship.role,
      character: {
        mal_id: relationship.character?.mal_id,
        name: relationship.character?.name,
      },
    })),
  };
}

function createCachedLoader({
  cacheDir,
  cacheNamespace,
  origin,
  absoluteUrl = null,
  accept = 'application/json',
  delayMs,
  refresh,
  compact,
  readResponse = (response) => response.json(),
}) {
  let requestGate = Promise.resolve();
  let lastRequestAt = 0;

  return async function load(sourcePath) {
    const cachePath = resolve(cacheDir, 'snapshots', cacheNamespace, cacheName(sourcePath));
    if (!refresh) {
      try {
        return JSON.parse(await readFile(cachePath, 'utf8'));
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }

    let release;
    const previous = requestGate;
    requestGate = new Promise((resolveGate) => {
      release = resolveGate;
    });
    await previous;
    try {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const waitMs = Math.max(0, delayMs - (Date.now() - lastRequestAt));
        if (waitMs) await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
        lastRequestAt = Date.now();

        const response = await fetch(absoluteUrl ?? `${origin}${sourcePath}`, {
          headers: { accept, 'user-agent': USER_AGENT },
          redirect: 'follow',
          signal: AbortSignal.timeout(30_000),
        });
        if (response.ok) {
          const document = compact(await readResponse(response));
          await atomicWrite(cachePath, `${JSON.stringify(document)}\n`);
          return document;
        }

        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === 5) {
          throw new Error(`Source returned HTTP ${response.status} for ${sourcePath}`);
        }
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfter = retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);
        const backoffMs = Number.isFinite(retryAfter) && retryAfter >= 0
          ? Math.max(1000, retryAfter * 1000)
          : Math.min(30_000, 1000 * 2 ** attempt);
        process.stderr.write(
          `Source HTTP ${response.status}; retrying ${sourcePath} in ${backoffMs}ms\n`,
        );
        await new Promise((resolveWait) => setTimeout(resolveWait, backoffMs));
      }
      throw new Error(`Source retries exhausted for ${sourcePath}`);
    } finally {
      release();
    }
  };
}

async function run(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  if (!options.acknowledgeSourceTerms) {
    throw new Error(
      'Live acquisition is disabled until an operator confirms required ' +
      'authorization and reviews the MAL, manami, Kitsu, and Jikan terms with ' +
      '--acknowledge-source-terms',
    );
  }

  await mkdir(options.cacheDir, { recursive: true });
  const statePath = resolve(options.cacheDir, 'state.json');
  let state = options.refresh ? null : await readJson(statePath);
  if (!state) {
    const retrievedAt = options.asOf ?? new Date().toISOString();
    if (Number.isNaN(Date.parse(retrievedAt))) throw new Error('--as-of must be an ISO-compatible timestamp');
    state = {
      schemaVersion: 3,
      retrievedAt: new Date(retrievedAt).toISOString(),
      cacheNamespace: `snapshot-${new Date(retrievedAt).toISOString().replace(/[^0-9A-Za-z]/g, '-')}`,
      requestedLimit: options.limit,
      completedAnimeIds: [],
    };
    await atomicWrite(statePath, `${JSON.stringify(state, null, 2)}\n`);
  } else if (![2, 3].includes(state.schemaVersion)) {
    throw new Error('Cache uses an older schema; choose another --cache-dir or use --refresh');
  } else if (state.requestedLimit !== options.limit) {
    throw new Error(
      `Cache was created for limit ${state.requestedLimit}; reuse that limit or choose another --cache-dir`,
    );
  }
  if (state.schemaVersion === 2) {
    state.schemaVersion = 3;
    await atomicWrite(statePath, `${JSON.stringify(state, null, 2)}\n`);
  }

  const completed = new Set(state.completedAnimeIds);
  let stateWrite = Promise.resolve();
  const rankingLoader = createCachedLoader({
    ...options,
    cacheNamespace: state.cacheNamespace,
    origin: MAL_ORIGIN,
    compact: compactMalRanking,
    readResponse: (response) => response.text(),
  });
  const mappingLoader = createCachedLoader({
    ...options,
    cacheNamespace: state.cacheNamespace,
    origin: '',
    absoluteUrl: MANAMI_SNAPSHOT,
    compact: compactMappingDatabase,
  });
  const kitsuLoader = createCachedLoader({
    ...options,
    cacheNamespace: state.cacheNamespace,
    origin: KITSU_ORIGIN,
    accept: 'application/vnd.api+json',
    compact: compactKitsuCharacters,
  });
  const jikanLoader = options.skipJikanFallback
    ? undefined
    : createCachedLoader({
      ...options,
      cacheNamespace: state.cacheNamespace,
      origin: JIKAN_ORIGIN,
      compact: compactJikanCharacters,
    });
  const catalog = await buildMalCatalog({
    limit: options.limit,
    retrievedAt: state.retrievedAt,
    loadRankingPage: rankingLoader,
    loadMappingDatabase: () => mappingLoader('anime-offline-database-minified.json'),
    loadKitsuPage: kitsuLoader,
    loadJikanCharacters: jikanLoader,
    skipJikanFallback: options.skipJikanFallback,
    concurrency: options.concurrency,
    onAnimeComplete: async (anime) => {
      if (completed.has(anime.malId)) return;
      completed.add(anime.malId);
      state.completedAnimeIds = [...completed].sort((a, b) => a - b);
      const snapshot = `${JSON.stringify(state, null, 2)}\n`;
      stateWrite = stateWrite.then(() => atomicWrite(statePath, snapshot));
      await stateWrite;
      process.stderr.write(
        `Cataloged ${completed.size}/${options.limit}: #${anime.rank} ${anime.title} (${anime.characters.length} main)\n`,
      );
    },
  });

  await atomicWrite(options.out, serializeCompactCatalog(catalog));
  process.stdout.write(
    `Wrote ${catalog.counts.anime} anime and ${catalog.counts.uniqueCharacters} unique main characters to ${options.out}\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

export { cacheName, createCachedLoader, parseArgs, run };
