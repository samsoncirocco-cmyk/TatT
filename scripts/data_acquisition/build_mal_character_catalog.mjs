#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  buildMalCatalog,
  serializeCompactCatalog,
} from './mal_catalog.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = resolve(SCRIPT_DIR, '../../src/data/generated/mal-character-catalog.json');
const DEFAULT_CACHE = resolve(SCRIPT_DIR, '../../.tmp/mal-character-catalog');
const JIKAN_ORIGIN = 'https://api.jikan.moe/v4';
const USER_AGENT = 'TatTTester character catalog builder/1.0 (https://tatttester.com)';

function usage() {
  return `Build a resumable MyAnimeList anime/main-character catalog.

Usage:
  node scripts/data_acquisition/build_mal_character_catalog.mjs [options]

Options:
  --limit N          Ranked anime entries to include (default: 1000)
  --out PATH         Generated compact JSON path
  --cache-dir PATH   HTML cache/checkpoint directory
  --concurrency N    Character records processed concurrently (default: 2)
  --delay-ms N       Minimum delay between live requests (default: 1100)
  --refresh          Ignore cached responses and fetch all pages again
  --as-of ISO        Fixed provenance timestamp for a new cache
  --acknowledge-source-terms
                     Confirm authorization to acquire/reuse MAL-derived data
  --help             Show this help

Interrupted runs are resumed from cached pages. Delete the cache or use
--refresh to intentionally take a new ranking snapshot.
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
  const ranking = sourcePath.match(/^\/top\/anime\?page=(\d+)&limit=25$/);
  if (ranking) return `ranking-${ranking[1].padStart(2, '0')}.json`;
  const anime = sourcePath.match(/^\/anime\/(\d+)\/characters$/);
  if (anime) return `anime-${anime[1]}-characters.json`;
  throw new Error(`Refusing unsafe or unexpected Jikan path: ${sourcePath}`);
}

function compactResponse(sourcePath, document) {
  if (!document || !Array.isArray(document.data)) return document;
  if (sourcePath.startsWith('/top/anime?')) {
    return {
      data: document.data.map((anime) => ({
        mal_id: anime.mal_id,
        rank: anime.rank,
        title: anime.title,
        title_english: anime.title_english,
        title_japanese: anime.title_japanese,
      })),
    };
  }
  return {
    data: document.data.map((appearance) => ({
      role: appearance.role,
      character: {
        mal_id: appearance.character?.mal_id,
        name: appearance.character?.name,
      },
    })),
  };
}

function createCachedLoader({ cacheDir, cacheNamespace, delayMs, refresh }) {
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

        const response = await fetch(`${JIKAN_ORIGIN}${sourcePath}`, {
          headers: { accept: 'application/json', 'user-agent': USER_AGENT },
          redirect: 'follow',
          signal: AbortSignal.timeout(30_000),
        });
        if (response.ok) {
          const document = compactResponse(sourcePath, await response.json());
          await atomicWrite(cachePath, `${JSON.stringify(document)}\n`);
          return document;
        }

        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === 5) {
          throw new Error(`Jikan returned HTTP ${response.status} for ${sourcePath}`);
        }
        const retryAfter = Number(response.headers.get('retry-after'));
        const backoffMs = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : Math.min(30_000, 1000 * 2 ** attempt);
        process.stderr.write(
          `Jikan HTTP ${response.status}; retrying ${sourcePath} in ${backoffMs}ms\n`,
        );
        await new Promise((resolveWait) => setTimeout(resolveWait, backoffMs));
      }
      throw new Error(`Jikan retries exhausted for ${sourcePath}`);
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
      'Live acquisition is disabled until an operator confirms written MAL permission or a licensed feed with --acknowledge-source-terms',
    );
  }

  await mkdir(options.cacheDir, { recursive: true });
  const statePath = resolve(options.cacheDir, 'state.json');
  let state = options.refresh ? null : await readJson(statePath);
  if (!state) {
    const retrievedAt = options.asOf ?? new Date().toISOString();
    if (Number.isNaN(Date.parse(retrievedAt))) throw new Error('--as-of must be an ISO-compatible timestamp');
    state = {
      schemaVersion: 1,
      retrievedAt: new Date(retrievedAt).toISOString(),
      cacheNamespace: `snapshot-${new Date(retrievedAt).toISOString().replace(/[^0-9A-Za-z]/g, '-')}`,
      requestedLimit: options.limit,
      completedAnimeIds: [],
    };
    await atomicWrite(statePath, `${JSON.stringify(state, null, 2)}\n`);
  } else if (state.requestedLimit !== options.limit) {
    throw new Error(
      `Cache was created for limit ${state.requestedLimit}; reuse that limit or choose another --cache-dir`,
    );
  }

  const completed = new Set(state.completedAnimeIds);
  let stateWrite = Promise.resolve();
  const load = createCachedLoader({ ...options, cacheNamespace: state.cacheNamespace });
  const catalog = await buildMalCatalog({
    limit: options.limit,
    retrievedAt: state.retrievedAt,
    loadRankingPage: load,
    loadCharacterPage: load,
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
