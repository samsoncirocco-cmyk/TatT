/**
 * Reinstatement planner/executor. See docs/adr/0026.
 *
 * This is the only code that can undo a takedown protection, so nearly every
 * test here asserts a REFUSAL. Two properties matter above all:
 *
 *   1. It cannot run without a request the artist made themselves.
 *   2. It never removes or weakens the ingest tombstone.
 *
 * A change that makes either easier is a change in the wrong direction.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  VERIFICATION_CODE_TTL_MS,
  executeReinstatement,
  normalizeInstagramHandle,
  planReinstatement,
} from './reinstate-plan.mjs';

const NOW = 1_800_000_000_000;

function makeDeps(over = {}) {
  return {
    readTombstone: vi.fn(async () => ({
      key: 'instagram:tattoosbyging',
      artistId: 'artist_ging',
      reinstatedAt: null,
    })),
    readPendingRequest: vi.fn(async () => ({
      id: 'RI-ABC123',
      uid: 'uid_ging',
      artistId: 'artist_ging',
      issuedAtEpochMs: NOW - 1000,
      verificationCode: 'TATT-DEADBEEF',
    })),
    readArtist: vi.fn(async () => ({
      id: 'artist_ging',
      removedAt: NOW - 5000,
      claimedByUid: null,
    })),
    markTombstoneReinstated: vi.fn(async () => true),
    reinstateArtist: vi.fn(async () => true),
    closeRequest: vi.fn(async () => true),
    ...over,
  };
}

const plan = (deps, over = {}) =>
  planReinstatement(deps, { instagram: '@TattoosByGing', handleVerified: true, now: NOW, ...over });

describe('normalizeInstagramHandle', () => {
  it('reduces every spelling to the tombstone key form', () => {
    for (const raw of ['@Ging', 'Ging', 'https://instagram.com/Ging/', ' ging/ ']) {
      expect(normalizeInstagramHandle(raw)).toBe('ging');
    }
  });
});

describe('planReinstatement', () => {
  it('clears with a verified request against a tombstoned, unclaimed husk', async () => {
    const p = await plan(makeDeps());
    expect(p.blockers).toEqual([]);
    expect(p.tombstoneKey).toBe('instagram:tattoosbyging');
  });

  it('always states that ingest stays blocked', async () => {
    const p = await plan(makeDeps());
    expect(p.ingestStaysBlocked).toBe(true);
    expect(p.warnings.join(' ')).toMatch(/tombstone is NOT removed and NOT weakened/i);
  });

  it('always states that nothing is restored', async () => {
    const p = await plan(makeDeps());
    expect(p.warnings.join(' ')).toMatch(/restores NOTHING/i);
  });

  it('names the account that will gain the profile', async () => {
    const p = await plan(makeDeps());
    expect(p.warnings.join(' ')).toMatch(/bound to Firebase uid uid_ging/);
  });

  it('BLOCKS when the operator has not confirmed handle control', async () => {
    const p = await plan(makeDeps(), { handleVerified: false });
    expect(p.blockers.join(' ')).toMatch(/handle control has NOT been confirmed/i);
  });

  it('BLOCKS when no tombstone exists', async () => {
    const p = await plan(makeDeps({ readTombstone: vi.fn(async () => null) }));
    expect(p.blockers.join(' ')).toMatch(/nothing to reinstate/i);
  });

  it('BLOCKS when the artist never asked — there is no admin path', async () => {
    const p = await plan(makeDeps({ readPendingRequest: vi.fn(async () => null) }));
    expect(p.blockers.join(' ')).toMatch(/no pending reinstatement request/i);
    expect(p.blockers.join(' ')).toMatch(/deliberately no admin path/i);
  });

  it('BLOCKS an expired verification code', async () => {
    const deps = makeDeps({
      readPendingRequest: vi.fn(async () => ({
        id: 'RI-1', uid: 'uid_ging', artistId: 'artist_ging',
        issuedAtEpochMs: NOW - VERIFICATION_CODE_TTL_MS - 1,
      })),
    });
    expect((await plan(deps)).blockers.join(' ')).toMatch(/expired/i);
  });

  it('BLOCKS when the husk belongs to a different account (issue #192)', async () => {
    const deps = makeDeps({
      readArtist: vi.fn(async () => ({
        id: 'artist_ging', removedAt: NOW - 5000, claimedByUid: 'uid_someone_else',
      })),
    });
    const joined = (await plan(deps)).blockers.join(' ');
    expect(joined).toMatch(/claimed by a DIFFERENT account/i);
    expect(joined).toMatch(/#192/);
    expect(joined).toMatch(/do not let this script decide/i);
  });

  it('BLOCKS a second reinstatement of the same handle', async () => {
    const deps = makeDeps({
      readTombstone: vi.fn(async () => ({
        key: 'instagram:tattoosbyging', artistId: 'artist_ging', reinstatedAt: NOW - 10_000,
      })),
    });
    expect((await plan(deps)).blockers.join(' ')).toMatch(/already reinstated/i);
  });

  it('BLOCKS when the node is gone', async () => {
    const p = await plan(makeDeps({ readArtist: vi.fn(async () => null) }));
    expect(p.blockers.join(' ')).toMatch(/nothing to unsuppress/i);
  });

  it('BLOCKS an empty handle without touching the graph', async () => {
    const deps = makeDeps();
    const p = await plan(deps, { instagram: '  ' });
    expect(p.blockers.join(' ')).toMatch(/no usable instagram handle/i);
    expect(deps.readTombstone).not.toHaveBeenCalled();
  });

  it('warns rather than blocks when the node was never suppressed (scope=images)', async () => {
    const deps = makeDeps({
      readArtist: vi.fn(async () => ({ id: 'artist_ging', removedAt: null, claimedByUid: null })),
    });
    const p = await plan(deps);
    expect(p.blockers).toEqual([]);
    expect(p.warnings.join(' ')).toMatch(/not currently suppressed/i);
  });

  it('is read-only — a plan mutates nothing', async () => {
    const deps = makeDeps();
    await plan(deps);
    expect(deps.markTombstoneReinstated).not.toHaveBeenCalled();
    expect(deps.reinstateArtist).not.toHaveBeenCalled();
    expect(deps.closeRequest).not.toHaveBeenCalled();
  });
});

describe('executeReinstatement', () => {
  it('DEFAULTS TO A DRY RUN and changes nothing', async () => {
    const deps = makeDeps();
    const p = await plan(deps);

    const res = await executeReinstatement(deps, p);

    expect(res).toMatchObject({ dryRun: true, executed: false, ok: true });
    expect(deps.markTombstoneReinstated).not.toHaveBeenCalled();
    expect(deps.reinstateArtist).not.toHaveBeenCalled();
  });

  it('refuses --execute without a matching --confirm', async () => {
    const deps = makeDeps();
    const p = await plan(deps);

    const res = await executeReinstatement(deps, p, { execute: true, confirm: null });

    expect(res.executed).toBe(false);
    expect(res.error).toMatch(/--confirm must exactly match the handle/i);
    expect(deps.reinstateArtist).not.toHaveBeenCalled();
  });

  it('refuses --confirm for a different handle', async () => {
    const deps = makeDeps();
    const p = await plan(deps);

    const res = await executeReinstatement(deps, p, { execute: true, confirm: 'someone_else' });

    expect(res.executed).toBe(false);
    expect(deps.reinstateArtist).not.toHaveBeenCalled();
  });

  it('refuses to execute while any blocker stands', async () => {
    const deps = makeDeps();
    const p = await plan(deps, { handleVerified: false });

    const res = await executeReinstatement(deps, p, { execute: true, confirm: 'tattoosbyging' });

    expect(res.executed).toBe(false);
    expect(res.error).toMatch(/refusing to execute/i);
    expect(deps.reinstateArtist).not.toHaveBeenCalled();
  });

  it('unsuppresses and binds ownership when everything checks out', async () => {
    const deps = makeDeps();
    const p = await plan(deps);

    const res = await executeReinstatement(deps, p, { execute: true, confirm: 'tattoosbyging' });

    expect(res).toMatchObject({ executed: true, ok: true });
    expect(deps.reinstateArtist).toHaveBeenCalledWith('artist_ging', { uid: 'uid_ging' });
    expect(res.changed.boundToUid).toBe('uid_ging');
  });

  it('NEVER deletes or weakens the tombstone — it only marks it', async () => {
    // The heart of the design: the ingest gate stays shut forever, so a later
    // scrape still cannot re-add this handle.
    const deps = makeDeps();
    const p = await plan(deps);

    const res = await executeReinstatement(deps, p, { execute: true, confirm: 'tattoosbyging' });

    expect(deps.markTombstoneReinstated).toHaveBeenCalledWith('instagram:tattoosbyging', {
      uid: 'uid_ging',
      requestId: 'RI-ABC123',
      artistId: 'artist_ging',
    });
    expect(res.wouldChange.ingestStaysBlocked).toBe(true);
    expect(Object.keys(deps)).not.toContain('deleteTombstone');
  });

  it('records the audit mark BEFORE handing over ownership', async () => {
    const order = [];
    const deps = makeDeps({
      markTombstoneReinstated: vi.fn(async () => { order.push('mark'); return true; }),
      reinstateArtist: vi.fn(async () => { order.push('bind'); return true; }),
    });
    const p = await plan(deps);

    await executeReinstatement(deps, p, { execute: true, confirm: 'tattoosbyging' });

    expect(order).toEqual(['mark', 'bind']);
  });

  it('does NOT hand over ownership if the audit mark fails', async () => {
    // Ownership without a durable record would erase the remove/relist history.
    const deps = makeDeps({ markTombstoneReinstated: vi.fn(async () => false) });
    const p = await plan(deps);

    const res = await executeReinstatement(deps, p, { execute: true, confirm: 'tattoosbyging' });

    expect(res.ok).toBe(false);
    expect(res.executed).toBe(false);
    expect(res.error).toMatch(/could not be recorded on the tombstone/i);
    expect(deps.reinstateArtist).not.toHaveBeenCalled();
  });

  it('treats a thrown audit mark the same as a failed one', async () => {
    const deps = makeDeps({
      markTombstoneReinstated: vi.fn(async () => { throw new Error('neo4j down'); }),
    });
    const p = await plan(deps);

    const res = await executeReinstatement(deps, p, { execute: true, confirm: 'tattoosbyging' });

    expect(res.executed).toBe(false);
    expect(deps.reinstateArtist).not.toHaveBeenCalled();
  });

  it('reports a partial failure as a failure, never as done', async () => {
    const deps = makeDeps({ reinstateArtist: vi.fn(async () => false) });
    const p = await plan(deps);

    const res = await executeReinstatement(deps, p, { execute: true, confirm: 'tattoosbyging' });

    expect(res.ok).toBe(false);
    expect(res.failures.join(' ')).toMatch(/reported failure/i);
  });

  it('closes the request so the same code cannot be actioned twice', async () => {
    const deps = makeDeps();
    const p = await plan(deps);

    await executeReinstatement(deps, p, { execute: true, confirm: 'tattoosbyging' });

    expect(deps.closeRequest).toHaveBeenCalledWith('RI-ABC123');
  });
});
