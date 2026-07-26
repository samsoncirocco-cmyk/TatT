/**
 * The gate the discovery pipeline consults before ingesting an artist.
 * See docs/adr/0024 §3–4.
 *
 * A takedown that a later scrape undoes is not a takedown. Every path that can
 * create or refresh an `:Artist` node — the validator, the graph importer, the
 * image re-hoster — asks this module first.
 *
 * FAIL CLOSED. If the tombstone list cannot be loaded, `loadTombstoneGate`
 * throws and the ingest run aborts. It deliberately does NOT degrade to an
 * empty set: a permissive fallback would silently re-import every artist who
 * ever asked to be removed, which is the exact failure this whole mechanism
 * exists to prevent. Losing a scrape run is the cheaper mistake.
 */

/** Normalize "@Foo", an instagram URL, or "foo/" to a bare lowercase handle. */
export function normalizeInstagramHandle(raw) {
  if (!raw) return null;
  const clean = String(raw)
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase();
  return clean || null;
}

/**
 * Build a gate over an already-loaded list of tombstone keys.
 *
 * Candidates are checked handle-first: the crawler mints a fresh random id on
 * every run, so an id check alone would let a tombstoned artist straight back in.
 */
export function makeTombstoneGate(keys) {
  const set = new Set(keys ?? []);

  return {
    keyCount: set.size,

    /**
     * @returns {{blocked: boolean, matchedKey: string|null}}
     */
    isTombstoned({ instagram, artistId, sourceUrl } = {}) {
      const candidates = [];

      const handle = normalizeInstagramHandle(instagram);
      if (handle) candidates.push(`instagram:${handle}`);

      const id = artistId ? String(artistId).trim() : '';
      if (id) candidates.push(`artist:${id}`);

      const src = sourceUrl ? String(sourceUrl).trim() : '';
      if (src) candidates.push(`source:${src}`);

      for (const candidate of candidates) {
        if (set.has(candidate)) return { blocked: true, matchedKey: candidate };
      }
      return { blocked: false, matchedKey: null };
    },
  };
}

/**
 * Load the tombstone list through the supplied reader and build a gate.
 *
 * @param {() => Promise<string[]>} readKeys
 * @throws if the list cannot be read, or does not come back as an array.
 *         Callers must NOT catch-and-continue — see the module docblock.
 */
export async function loadTombstoneGate(readKeys) {
  let keys;
  try {
    keys = await readKeys();
  } catch (err) {
    throw new Error(
      `Could not load takedown tombstones: ${err?.message || err}. ` +
        'Refusing to continue — proceeding without the tombstone list would re-ingest ' +
        'artists who asked to be removed.',
    );
  }

  if (!Array.isArray(keys)) {
    throw new Error(
      'Could not load takedown tombstones: reader did not return an array ' +
        `(got ${keys === null ? 'null' : typeof keys}). Refusing to continue — an ` +
        'unreadable tombstone list must not be treated as an empty one.',
    );
  }

  return makeTombstoneGate(keys);
}

/** Cypher the ingest scripts use to read every tombstone key. */
export const TOMBSTONE_KEYS_CYPHER = 'MATCH (t:TakedownTombstone) RETURN t.key AS key';

/**
 * Convenience reader over a Neo4j session, for the ingest scripts.
 * Deliberately does not catch — see the module docblock.
 */
export function neo4jTombstoneReader(session) {
  return async () => {
    const result = await session.run(TOMBSTONE_KEYS_CYPHER);
    return result.records.map((r) => r.get('key')).filter(Boolean);
  };
}
