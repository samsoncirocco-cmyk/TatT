/**
 * Plan/apply an Instagram refresh-state ledger.
 *
 * The write set is intentionally tiny. Scrapes may record reachability and
 * freshness; they may not overwrite identity, artist-managed profile values,
 * verification, payments, or the immutable Instagram handle.
 */

const ALLOWED_STATUSES = new Set(['active', 'not_found', 'private', 'transient']);
const HANDLE = /^[a-z0-9._]{1,30}$/;

export const APPLY_REFRESH_STATUS_CYPHER = `
  MATCH (a:Artist)
  WHERE
    ($artistId IS NOT NULL AND a.id = $artistId)
    OR toLower(coalesce(a.instagram, '')) = $handle
    OR EXISTS {
      MATCH (a)-[:HAS_INSTAGRAM]->(ig:Instagram)
      WHERE toLower(coalesce(ig.handle, '')) = $handle
    }
  SET a.lastRefreshStatus = $lastRefreshStatus,
      a.lastRefreshAt = $lastRefreshAt,
      a.lastRefreshReason = $lastRefreshReason,
      a.consecutiveDeadRefreshes = $consecutiveDeadRefreshes,
      a.stale = $stale
  FOREACH (_ IN CASE WHEN $looksBookable IS NULL THEN [] ELSE [1] END |
    SET a.looksBookable = $looksBookable,
        a.bookabilityReason = $bookabilityReason
  )
  FOREACH (_ IN CASE WHEN $lastSeenAt IS NULL THEN [] ELSE [1] END |
    SET a.lastSeenAt = $lastSeenAt
  )
  RETURN a.id AS id
`;

function normalizeHandle(raw) {
  const handle = String(raw ?? '').trim().replace(/^@/, '').toLowerCase();
  return HANDLE.test(handle) ? handle : null;
}

export function normalizeLedgerEntry(handleKey, raw) {
  if (!raw || typeof raw !== 'object') return null;
  const handle = normalizeHandle(handleKey);
  if (!handle || !ALLOWED_STATUSES.has(raw.lastRefreshStatus)) return null;
  const dead = Number(raw.consecutiveDeadRefreshes);
  if (!Number.isInteger(dead) || dead < 0) return null;
  if (typeof raw.lastRefreshAt !== 'string' || !raw.lastRefreshAt) return null;

  return {
    handle,
    artistId:
      typeof raw.artistId === 'string' && raw.artistId.trim()
        ? raw.artistId.trim()
        : null,
    lastRefreshStatus: raw.lastRefreshStatus,
    lastRefreshAt: raw.lastRefreshAt,
    lastRefreshReason:
      typeof raw.lastRefreshReason === 'string' ? raw.lastRefreshReason : null,
    consecutiveDeadRefreshes: dead,
    stale: Boolean(raw.stale),
    lastSeenAt: typeof raw.lastSeenAt === 'string' ? raw.lastSeenAt : null,
    looksBookable:
      typeof raw.looksBookable === 'boolean' ? raw.looksBookable : null,
    bookabilityReason:
      typeof raw.bookabilityReason === 'string' ? raw.bookabilityReason : null,
  };
}

export function buildRefreshStatusUpdate(entry) {
  return { query: APPLY_REFRESH_STATUS_CYPHER, params: { ...entry } };
}

export function planRefreshStatus(ledger, { limit = Infinity } = {}) {
  const handles =
    ledger && typeof ledger === 'object' && ledger.handles && typeof ledger.handles === 'object'
      ? ledger.handles
      : {};
  const entries = [];
  const invalidHandles = [];
  for (const [handle, raw] of Object.entries(handles).sort(([a], [b]) => a.localeCompare(b))) {
    const entry = normalizeLedgerEntry(handle, raw);
    if (entry) entries.push(entry);
    else invalidHandles.push(handle);
  }
  const selected = entries.slice(0, Math.max(0, limit));
  return {
    entries: selected,
    invalidHandles,
    summary: {
      selected: selected.length,
      stale: selected.filter((entry) => entry.stale).length,
      active: selected.filter((entry) => entry.lastRefreshStatus === 'active').length,
      dead: selected.filter((entry) =>
        ['not_found', 'private'].includes(entry.lastRefreshStatus),
      ).length,
      transient: selected.filter((entry) => entry.lastRefreshStatus === 'transient').length,
    },
  };
}

export async function executeRefreshStatus(
  deps,
  plan,
  { execute = false, confirm = null } = {},
) {
  if (!execute) {
    return { dryRun: true, executed: false, ok: true, applied: 0, missing: [] };
  }
  if (confirm !== 'APPLY-REFRESH-STATUS') {
    return {
      dryRun: false,
      executed: false,
      ok: false,
      applied: 0,
      missing: [],
      error: 'Refusing to execute: --confirm must be APPLY-REFRESH-STATUS.',
    };
  }
  if (plan.invalidHandles.length) {
    return {
      dryRun: false,
      executed: false,
      ok: false,
      applied: 0,
      missing: [],
      error: `Refusing to execute with invalid ledger entries: ${plan.invalidHandles.join(', ')}`,
    };
  }

  const missing = [];
  let applied = 0;
  for (const entry of plan.entries) {
    const matched = await deps.apply(entry);
    if (matched) applied += 1;
    else missing.push(entry.handle);
  }
  return {
    dryRun: false,
    executed: true,
    ok: missing.length === 0,
    applied,
    missing,
  };
}
