/**
 * Artist takedown — planner and executor. See docs/adr/0024.
 *
 * This is the only code in the repo that deletes an artist's data. It is
 * therefore built to refuse:
 *
 *   - `executeTakedown` is a DRY RUN unless explicitly told otherwise, and even
 *     then requires the caller to echo back the artist id.
 *   - A pending held deposit blocks removal outright — deleting the artist
 *     would orphan real customer money (ADR 0005).
 *   - The tombstone is written FIRST. If the run dies half way, the artist ends
 *     up blocked from re-ingest rather than deleted-and-rescrapeable, which is
 *     the failure mode that matters.
 *   - A partial failure is reported as a failure. Never "mostly removed".
 *
 * Every store is reached through an injected dependency, so this module cannot
 * touch anything on its own — the wiring lives in scripts/execute-takedown.mjs.
 *
 * Removal semantics (ADR 0024 §1–2):
 *   GCS images        → hard delete   (the actual re-hosted photographs)
 *   Supabase embedding→ hard delete   (derived from their work, drives matching)
 *   :Artist node      → soft delete + scrub, NOT hard delete (money, audit,
 *                       and so a re-import MERGEs onto a removedAt husk rather
 *                       than a blank slate)
 *   :TakedownTombstone→ permanent, keyed on the instagram handle
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
 * Identifiers the removal must be remembered under.
 *
 * The handle leads deliberately: national-dataset ids are derived from it, but
 * the crawler mints random ids, so an id-keyed tombstone would not survive a
 * re-crawl. Mirrors `tombstoneKeysFor` in src/lib/takedown.ts — duplicated
 * rather than imported because scripts run as plain node without a TS loader.
 */
export function tombstoneKeysFor({ artistId, instagram, sourcePages }) {
  const keys = [];
  const handle = normalizeInstagramHandle(instagram);
  if (handle) keys.push({ key: `instagram:${handle}`, keyType: 'instagram' });
  keys.push({ key: `artist:${artistId}`, keyType: 'artist' });

  const seen = new Set();
  for (const page of sourcePages ?? []) {
    const url = typeof page === 'string' ? page.trim() : '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    keys.push({ key: `source:${url}`, keyType: 'source' });
  }
  return keys;
}

/**
 * Describe what a takedown WOULD remove. Read-only — calling this never
 * mutates anything, which is what makes `--dry-run` trustworthy.
 */
export async function planTakedown(deps, { artistId, scope = 'all', reason = null } = {}) {
  const plan = {
    artistId,
    scope,
    reason,
    found: false,
    alreadyRemoved: false,
    artist: null,
    gcsObjects: [],
    embeddingRows: 0,
    tombstoneKeys: [],
    willSuppressNode: scope === 'all',
    pendingRelays: [],
    blockers: [],
    warnings: [],
  };

  const artist = await deps.readArtist(artistId);
  if (!artist) {
    plan.blockers.push(`Artist ${artistId} not found in the graph — nothing to plan.`);
    return plan;
  }

  plan.found = true;
  plan.artist = artist;
  plan.alreadyRemoved = Boolean(artist.removedAt);

  plan.tombstoneKeys = tombstoneKeysFor({
    artistId,
    instagram: artist.instagram,
    sourcePages: artist.sourcePages,
  });

  plan.gcsObjects = (await deps.listGcsObjects(`artists/${artistId}/`)) ?? [];
  plan.embeddingRows = (await deps.countEmbeddings(artistId)) ?? 0;

  const pending = (await deps.listPendingRelays(artistId)) ?? [];
  plan.pendingRelays = pending;
  if (pending.length) {
    const total = pending.reduce((s, p) => s + (p.amountCents ?? 0), 0);
    plan.blockers.push(
      `${pending.length} pending held deposit(s) totalling ${(total / 100).toFixed(2)} ` +
        `reference this artist. Removing the node would orphan real customer money — ` +
        `refund or transfer them first (see docs/adr/0005), then re-run.`,
    );
  }

  if (!plan.tombstoneKeys.some((k) => k.keyType === 'instagram')) {
    plan.warnings.push(
      'No instagram handle on this artist — the tombstone can only be keyed on the ' +
        'artist id, which the crawler does NOT reproduce across runs. A re-crawl may ' +
        're-ingest this artist under a new id. Verify manually after the next scrape.',
    );
  }

  // Things a database filter genuinely cannot reach. Said out loud rather than
  // quietly left undone.
  plan.warnings.push(
    'src/data/featured-artists.json is a committed static snapshot used by the ' +
      'homepage. Re-run scripts/pick-featured-artists.mjs and redeploy if this ' +
      'artist appears in it — no database filter removes them from that file.',
  );
  if (plan.gcsObjects.length) {
    plan.warnings.push(
      'CDN and browser caches may serve the deleted storage.googleapis.com URLs ' +
        'for a while after the objects are gone.',
    );
  }

  return plan;
}

/**
 * Carry out a plan.
 *
 * DRY RUN BY DEFAULT. To actually remove, the caller must pass BOTH
 * `execute: true` and `confirm` equal to the artist id — so a stray `--execute`
 * on the wrong line cannot delete the wrong artist.
 */
export async function executeTakedown(deps, plan, options = {}) {
  const { execute = false, confirm = null } = options;

  const wouldRemove = {
    gcsObjects: plan.gcsObjects.length,
    embeddingRows: plan.embeddingRows,
    tombstoneKeys: plan.tombstoneKeys.length,
    nodeSuppressed: plan.willSuppressNode,
  };

  if (!execute) {
    return { dryRun: true, executed: false, ok: true, wouldRemove, failures: [] };
  }

  if (confirm !== plan.artistId) {
    return {
      dryRun: false,
      executed: false,
      ok: false,
      wouldRemove,
      failures: [],
      error:
        `Refusing to execute: --confirm must exactly match the artist id. ` +
        `Expected "${plan.artistId}", got ${JSON.stringify(confirm)}.`,
    };
  }

  if (!plan.found) {
    return {
      dryRun: false, executed: false, ok: false, wouldRemove, failures: [],
      error: `Refusing to execute: artist ${plan.artistId} was not found.`,
    };
  }

  if (plan.blockers.length) {
    return {
      dryRun: false, executed: false, ok: false, wouldRemove, failures: [],
      error: `Refusing to execute — ${plan.blockers.join(' ')}`,
    };
  }

  // Tombstone FIRST. Everything after this is destructive; if we crash part way
  // the artist must be left un-rescrapeable rather than merely deleted.
  let tombstoned = false;
  try {
    tombstoned = await deps.writeTombstones(plan.tombstoneKeys, {
      artistId: plan.artistId,
      scope: plan.scope,
      reason: plan.reason,
    });
  } catch (err) {
    tombstoned = false;
    console.error('[takedown] tombstone write threw:', err?.message || err);
  }

  if (!tombstoned) {
    return {
      dryRun: false, executed: false, ok: false, wouldRemove, failures: [],
      error:
        'Refusing to remove anything: the tombstone could not be written. Without it a ' +
        'later scrape would silently resurrect this artist, which is worse than not ' +
        'having removed them at all.',
    };
  }

  const failures = [];
  const removed = {
    gcsObjects: 0,
    embeddingRows: 0,
    nodeSuppressed: false,
    tombstoneKeys: plan.tombstoneKeys.length,
  };

  // 1. The re-hosted photographs — the actual harm.
  if (plan.gcsObjects.length) {
    try {
      const res = await deps.deleteGcsObjects(plan.gcsObjects);
      removed.gcsObjects = res?.deleted ?? 0;
      for (const f of res?.failed ?? []) {
        failures.push(`GCS delete failed for ${f.path}: ${f.error}`);
      }
    } catch (err) {
      failures.push(`GCS delete threw: ${err?.message || err}`);
    }
  }

  // 2. The embedding derived from their work.
  if (plan.embeddingRows > 0) {
    try {
      const ok = await deps.deleteEmbedding(plan.artistId);
      removed.embeddingRows = ok ? plan.embeddingRows : 0;
      if (!ok) failures.push('Supabase embedding delete reported failure.');
    } catch (err) {
      failures.push(`Supabase embedding delete threw: ${err?.message || err}`);
    }
  }

  // 3. The node — soft delete + scrub, only under scope=all.
  if (plan.willSuppressNode) {
    try {
      const ok = await deps.suppressArtist(plan.artistId, { reason: plan.reason });
      removed.nodeSuppressed = Boolean(ok);
      if (!ok) failures.push('Artist node suppression reported failure.');
    } catch (err) {
      failures.push(`Artist node suppression threw: ${err?.message || err}`);
    }
  }

  return {
    dryRun: false,
    executed: true,
    ok: failures.length === 0,
    removed,
    wouldRemove,
    failures,
    warnings: plan.warnings,
  };
}
