import { describe, expect, it, vi } from 'vitest';
import {
  APPLY_REFRESH_STATUS_CYPHER,
  buildRefreshStatusUpdate,
  executeRefreshStatus,
  normalizeLedgerEntry,
  planRefreshStatus,
} from './artist-refresh-status.mjs';

const LEDGER = {
  handles: {
    'active.artist': {
      artistId: 'artist_active',
      lastRefreshStatus: 'active',
      lastRefreshAt: '2026-07-27T00:00:00Z',
      lastRefreshReason: null,
      consecutiveDeadRefreshes: 0,
      stale: false,
      lastSeenAt: '2026-07-27T00:00:00Z',
      looksBookable: true,
      bookabilityReason: 'artist+booking',
    },
    'gone.artist': {
      artistId: 'artist_gone',
      lastRefreshStatus: 'not_found',
      lastRefreshAt: '2026-07-27T00:00:00Z',
      lastRefreshReason: 'User not found',
      consecutiveDeadRefreshes: 3,
      stale: true,
    },
  },
};

describe('refresh ledger planning', () => {
  it('normalizes auditable state and rejects malformed handles/statuses', () => {
    expect(normalizeLedgerEntry('@Active.Artist', LEDGER.handles['active.artist'])).toMatchObject({
      handle: 'active.artist',
      artistId: 'artist_active',
      stale: false,
    });
    expect(
      normalizeLedgerEntry('not/a/handle', LEDGER.handles['active.artist']),
    ).toBeNull();
    expect(
      normalizeLedgerEntry('active.artist', {
        ...LEDGER.handles['active.artist'],
        lastRefreshStatus: 'deleted',
      }),
    ).toBeNull();
  });

  it('reports stale/dead/active counts without writing', () => {
    expect(planRefreshStatus(LEDGER).summary).toEqual({
      selected: 2,
      stale: 1,
      active: 1,
      dead: 1,
      transient: 0,
    });
  });
});

describe('refresh status write boundary', () => {
  it('touches refresh-health fields only', () => {
    const { query, params } = buildRefreshStatusUpdate(
      normalizeLedgerEntry('active.artist', LEDGER.handles['active.artist']),
    );
    expect(query).toBe(APPLY_REFRESH_STATUS_CYPHER);
    for (const field of [
      'lastRefreshStatus',
      'lastRefreshAt',
      'lastRefreshReason',
      'consecutiveDeadRefreshes',
      'stale',
      'lastSeenAt',
      'looksBookable',
      'bookabilityReason',
    ]) {
      expect(query).toContain(`a.${field}`);
    }
    for (const protectedField of [
      'artistManagedFields',
      'profileManagedAtEpochMs',
      'claimVerificationStatus',
      'name',
      'shopName',
      'bio',
      'bookingUrl',
      'instagram',
      'claimedByUid',
    ]) {
      expect(query).not.toContain(`SET a.${protectedField}`);
    }
    expect(params.artistId).toBe('artist_active');
  });

  it('is dry-run by default and requires an exact execution confirmation', async () => {
    const apply = vi.fn(async () => true);
    const plan = planRefreshStatus(LEDGER);
    expect(await executeRefreshStatus({ apply }, plan)).toMatchObject({
      dryRun: true,
      executed: false,
    });
    expect(apply).not.toHaveBeenCalled();

    const refused = await executeRefreshStatus(
      { apply },
      plan,
      { execute: true, confirm: 'yes' },
    );
    expect(refused.ok).toBe(false);
    expect(apply).not.toHaveBeenCalled();

    const applied = await executeRefreshStatus(
      { apply },
      plan,
      { execute: true, confirm: 'APPLY-REFRESH-STATUS' },
    );
    expect(applied).toMatchObject({ executed: true, ok: true, applied: 2 });
  });
});
