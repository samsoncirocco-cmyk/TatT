/**
 * host-artist-images.mjs — turn expiring scraped image URLs into durable,
 * self-hosted portfolio images on real artist cards.
 *
 * Standalone, data-agnostic, idempotent. NOT deployed app code — it is an
 * operator tool run by hand (or from a scheduler) against the live graph.
 *
 * For each artist it downloads a handful of source image URLs, uploads them
 * to GCS at a stable path, and writes the resulting PUBLIC https URLs onto
 * the Neo4j Artist node so the /artists UI can render real work.
 *
 * ── Input shape (the scraper writes one JSON file per artist) ──────────────
 * A directory of *.json files, each:
 *   {
 *     "artistId": "artist_1234",        // required — Neo4j Artist.id
 *     "handle":   "ink.by.sam",         // optional — for logging only
 *     "images":   ["https://…", "https://…"]  // required — source URLs,
 *                                              // typically expiring cdninstagram
 *   }
 * Files missing artistId or a non-empty images[] are skipped and logged.
 *
 * ── What it writes to each Artist node ─────────────────────────────────────
 *   a.portfolioImages     = [ public https://storage.googleapis.com/… URLs ]
 *   a.portfolioImageCount = size(portfolioImages)
 *   a.portfolioSource     = 'instagram'   (--source)
 *   a.portfolioUpdatedAt  = <ms epoch>    (--timestamp, defaults to now)
 *
 * Idempotent: GCS objects live at artists/<artistId>/<index>.<ext>, so a
 * re-run overwrites the same objects and re-SETs the array cleanly. Artists
 * whose images all fail are left image-less (honest), never half-written.
 *
 * ── Credentials ────────────────────────────────────────────────────────────
 * GCS: uses the standard Google auth chain — set GOOGLE_APPLICATION_CREDENTIALS
 *      to the service-account key file, or rely on Application Default
 *      Credentials (gcloud auth application-default login). GCP_PROJECT_ID and
 *      GCS_BUCKET_NAME / GCS_BUCKET honored (default bucket: tatt-pro-assets).
 * Neo4j: NEO4J_URI, NEO4J_USERNAME/NEO4J_USER, NEO4J_PASSWORD, NEO4J_DATABASE.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *   node scripts/host-artist-images.mjs --input ./scraped-images
 *   node scripts/host-artist-images.mjs --input ./scraped-images --limit 50
 *   node scripts/host-artist-images.mjs --input ./scraped-images --dry-run
 *
 * Flags:
 *   --input <dir>         directory of per-artist JSON files (required)
 *   --limit <n>           process at most n artist files
 *   --dry-run             download + resolve GCS paths/URLs and LOG them, but
 *                         never upload to GCS or write to Neo4j
 *   --timestamp <ms>      value for portfolioUpdatedAt (default: Date.now())
 *   --source <name>       value for portfolioSource (default: instagram)
 *   --bucket <name>       GCS bucket override (default: env or tatt-pro-assets)
 *   --max-per-artist <n>  cap images uploaded per artist (default: 8)
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from 'dotenv';
import {
  filterTombstoned,
  loadTombstoneGate,
  neo4jTombstoneReader,
} from './lib/takedown-tombstone.mjs';

config();
config({ path: '.env.local', override: false });

const DEFAULT_BUCKET = 'tatt-pro-assets';
const DEFAULT_MAX_PER_ARTIST = 8;
const FETCH_TIMEOUT_MS = 10_000;

// ─── Pure helpers (unit-tested; no I/O, no heavy imports) ───────────────────

/**
 * Map an HTTP content-type to the file extension we store under.
 * Returns null for anything that is not a supported image type, so the
 * caller skips it rather than storing a mislabeled or non-image object.
 */
export function extFromContentType(contentType) {
  if (!contentType || typeof contentType !== 'string') return null;
  const type = contentType.split(';')[0].trim().toLowerCase();
  switch (type) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/png':
      return 'png';
    default:
      return null;
  }
}

/** Artist ids flow into a GCS object path — allow only safe path characters. */
export function isSafeArtistId(artistId) {
  return typeof artistId === 'string' && /^[A-Za-z0-9_-]+$/.test(artistId);
}

/** Stable GCS object path for one artist image: artists/<artistId>/<index>.<ext> */
export function gcsObjectPath(artistId, index, ext) {
  if (!isSafeArtistId(artistId)) {
    throw new Error(`Unsafe artistId for GCS path: ${JSON.stringify(artistId)}`);
  }
  return `artists/${artistId}/${index}.${ext}`;
}

/** Public URL for a stored object (matches gcs-service.ts public URL shape). */
export function publicUrl(bucket, objectPath) {
  return `https://storage.googleapis.com/${bucket}/${objectPath}`;
}

/** Validate + normalize one parsed artist-image record from the input dir. */
export function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const artistId = raw.artistId;
  if (!isSafeArtistId(artistId)) return null;
  const images = Array.isArray(raw.images)
    ? raw.images.filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
    : [];
  if (images.length === 0) return null;
  return { artistId, handle: typeof raw.handle === 'string' ? raw.handle : null, images };
}

/**
 * Shape the Neo4j write that persists hosted portfolio URLs onto an Artist.
 * Pure: returns { query, params } so it is unit-testable without a driver.
 */
export function buildArtistUpdate(artistId, urls, source, updatedAt) {
  const query = `
    MATCH (a:Artist {id: $artistId})
    SET a.portfolioImages = $urls,
        a.portfolioImageCount = size($urls),
        a.portfolioSource = $source,
        a.portfolioUpdatedAt = $updatedAt
    RETURN a.id AS id, size($urls) AS count
  `;
  return { query, params: { artistId, urls, source, updatedAt } };
}

/** Minimal flag parser: --input dir --limit 5 --dry-run --timestamp 123 … */
export function parseArgs(argv) {
  const opts = {
    input: null,
    limit: Infinity,
    dryRun: false,
    timestamp: Date.now(),
    source: 'instagram',
    bucket: process.env.GCS_BUCKET_NAME || process.env.GCS_BUCKET || DEFAULT_BUCKET,
    maxPerArtist: DEFAULT_MAX_PER_ARTIST,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case '--input': opts.input = next(); break;
      case '--limit': opts.limit = Math.max(0, Math.trunc(Number(next())) || 0); break;
      case '--dry-run': opts.dryRun = true; break;
      case '--timestamp': opts.timestamp = Math.trunc(Number(next())) || Date.now(); break;
      case '--source': opts.source = next(); break;
      case '--bucket': opts.bucket = next(); break;
      case '--max-per-artist': opts.maxPerArtist = Math.max(1, Math.trunc(Number(next())) || DEFAULT_MAX_PER_ARTIST); break;
      default: break;
    }
  }
  return opts;
}

// ─── I/O (not unit-tested; exercised by the end-to-end round-trip) ──────────

/** Download one image URL with a hard timeout; return { buffer, ext } or null. */
async function downloadImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) {
      console.log(`      ✗ ${res.status} ${res.statusText} — ${url}`);
      return null;
    }
    const ext = extFromContentType(res.headers.get('content-type'));
    if (!ext) {
      console.log(`      ✗ unsupported content-type "${res.headers.get('content-type')}" — ${url}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) {
      console.log(`      ✗ empty body — ${url}`);
      return null;
    }
    return { buffer, ext };
  } catch (err) {
    const msg = err?.name === 'AbortError' ? `timeout after ${FETCH_TIMEOUT_MS}ms` : (err?.message || String(err));
    console.log(`      ✗ ${msg} — ${url}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Read + validate every *.json file in the input directory. */
async function loadRecords(inputDir) {
  const entries = await readdir(inputDir);
  const jsonFiles = entries.filter((f) => f.toLowerCase().endsWith('.json')).sort();
  const records = [];
  for (const file of jsonFiles) {
    const full = path.join(inputDir, file);
    try {
      const raw = JSON.parse(await readFile(full, 'utf8'));
      const rec = normalizeRecord(raw);
      if (rec) records.push(rec);
      else console.log(`  ⚠ skipping ${file}: missing artistId or usable images[]`);
    } catch (err) {
      console.log(`  ⚠ skipping ${file}: ${err.message}`);
    }
  }
  return records;
}

const CONTENT_TYPE = { jpg: 'image/jpeg', webp: 'image/webp', png: 'image/png' };

async function processArtist(rec, gcsBucket, opts) {
  const { artistId, handle, images } = rec;
  const urls = [];
  const capped = images.slice(0, opts.maxPerArtist);
  console.log(`\n▸ ${artistId}${handle ? ` (@${handle})` : ''} — ${capped.length} image(s)`);

  for (let index = 0; index < capped.length; index++) {
    const sourceUrl = capped[index];
    const dl = await downloadImage(sourceUrl);
    if (!dl) continue;
    const objectPath = gcsObjectPath(artistId, index, dl.ext);
    const url = publicUrl(opts.bucket, objectPath);
    if (opts.dryRun) {
      console.log(`      ● WOULD upload ${dl.buffer.length}B → gs://${opts.bucket}/${objectPath}`);
      console.log(`        → ${url}`);
      urls.push(url);
      continue;
    }
    try {
      await gcsBucket.file(objectPath).save(dl.buffer, {
        resumable: false,
        metadata: {
          contentType: CONTENT_TYPE[dl.ext],
          metadata: { artistId, source: opts.source, index: String(index) },
        },
        public: true,
      });
      console.log(`      ✓ ${dl.buffer.length}B → ${url}`);
      urls.push(url);
    } catch (err) {
      console.log(`      ✗ GCS upload failed (${err.message}) — ${objectPath}`);
    }
  }

  return { artistId, handle, urls };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.input) {
    console.error('ERROR: --input <dir> is required (directory of per-artist JSON files).');
    process.exit(1);
  }

  console.log('host-artist-images');
  console.log(`  input:        ${opts.input}`);
  console.log(`  bucket:       ${opts.bucket}`);
  console.log(`  source:       ${opts.source}`);
  console.log(`  updatedAt:    ${opts.timestamp}`);
  console.log(`  maxPerArtist: ${opts.maxPerArtist}`);
  console.log(`  limit:        ${opts.limit === Infinity ? 'all' : opts.limit}`);
  console.log(`  dryRun:       ${opts.dryRun}`);

  const records = (await loadRecords(opts.input)).slice(0, opts.limit);
  console.log(`\nLoaded ${records.length} artist record(s) to process.`);
  if (records.length === 0) return;

  // Lazy-load heavy clients so the pure helpers stay importable in unit tests.
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: process.env.GCP_PROJECT_ID,
  });
  const gcsBucket = opts.dryRun ? null : storage.bucket(opts.bucket);

  let driver = null;
  let session = null;
  if (!opts.dryRun) {
    const neo4j = (await import('neo4j-driver')).default;
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USERNAME || process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
    );
    session = driver.session(process.env.NEO4J_DATABASE ? { database: process.env.NEO4J_DATABASE } : undefined);
  }

  // Takedown gate. Without this, a stale scraped-images directory re-uploads a
  // removed artist's photographs to GCS and re-SETs portfolioImages, silently
  // undoing a takedown (docs/adr/0025). Skipped on a dry run only because a dry
  // run has no session and uploads nothing.
  let allowedRecords = records;
  if (session) {
    const gate = await loadTombstoneGate(neo4jTombstoneReader(session));
    const { allowed, blocked } = filterTombstoned(gate, records);
    allowedRecords = allowed;
    console.log(`Takedown gate: ${gate.keyCount} tombstone key(s) loaded.`);
    if (blocked.length) {
      console.log(`⛔ Skipping ${blocked.length} tombstoned artist(s):`);
      for (const b of blocked) {
        console.log(`    - ${b.record.id ?? '(no id)'} (matched ${b.matchedKey})`);
      }
    }
  }

  const summary = { processed: 0, hosted: 0, skipped: 0, imagesUploaded: 0 };
  try {
    for (const rec of allowedRecords) {
      summary.processed++;
      const { artistId, urls } = await processArtist(rec, gcsBucket, opts);
      if (urls.length === 0) {
        console.log(`      ⤷ no images hosted — leaving ${artistId} image-less`);
        summary.skipped++;
        continue;
      }
      summary.imagesUploaded += urls.length;
      const { query, params } = buildArtistUpdate(artistId, urls, opts.source, opts.timestamp);
      if (opts.dryRun) {
        console.log(`      ⤷ WOULD SET portfolioImages[${urls.length}] on ${artistId}`);
        summary.hosted++;
        continue;
      }
      const result = await session.executeWrite((tx) => tx.run(query, params));
      const matched = result.records.length > 0;
      console.log(`      ⤷ ${matched ? 'SET' : 'NO MATCH for'} portfolioImages[${urls.length}] on ${artistId}`);
      if (matched) summary.hosted++;
      else summary.skipped++;
    }
  } finally {
    if (session) await session.close();
    if (driver) await driver.close();
  }

  console.log('\n─── summary ───');
  console.log(`  processed:       ${summary.processed}`);
  console.log(`  hosted:          ${summary.hosted}`);
  console.log(`  skipped:         ${summary.skipped}`);
  console.log(`  images uploaded: ${summary.imagesUploaded}`);
}

// Run only when invoked directly, so unit tests can import the pure helpers.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}
