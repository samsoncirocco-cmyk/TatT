// The removal executor. See docs/adr/0024.
//
// This is the only code in the repo that deletes an artist's data, so the
// tests below are mostly about what it REFUSES to do:
//
//   - dry run is the default, and a dry run touches nothing
//   - held deposits block removal (deleting the artist orphans customer money)
//   - a partial failure is reported as a failure, never as success
//   - the tombstone is written BEFORE the data goes, so a crash mid-way leaves
//     the artist blocked from re-ingest rather than deleted-and-rescrapeable
//
// Every dependency is injected, so nothing here can reach a live store.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeTakedown, planTakedown } from './takedown-plan.mjs';

function makeDeps(over = {}) {
  return {
    readArtist: vi.fn().mockResolvedValue({
      id: 'artist_tattoosbyging',
      name: 'Ging',
      instagram: '@TattoosByGing',
      sourcePages: ['http://timelesstattoo.co/artists'],
      portfolioImages: [
        'https://storage.googleapis.com/tatt-pro-assets/artists/artist_tattoosbyging/0.jpg',
      ],
      removedAt: null,
      stripeAccountId: null,
      claimedByUid: null,
    }),
    listGcsObjects: vi.fn().mockResolvedValue([
      'artists/artist_tattoosbyging/0.jpg',
      'artists/artist_tattoosbyging/1.jpg',
    ]),
    countEmbeddings: vi.fn().mockResolvedValue(1),
    listPendingRelays: vi.fn().mockResolvedValue([]),
    deleteGcsObjects: vi.fn().mockResolvedValue({ deleted: 2, failed: [] }),
    deleteEmbedding: vi.fn().mockResolvedValue(true),
    writeTombstones: vi.fn().mockResolvedValue(true),
    suppressArtist: vi.fn().mockResolvedValue(true),
    ...over,
  };
}

describe('planTakedown', () => {
  it('reports exactly what would be removed without touching anything', async () => {
    const deps = makeDeps();
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging' });

    expect(plan.found).toBe(true);
    expect(plan.gcsObjects).toEqual([
      'artists/artist_tattoosbyging/0.jpg',
      'artists/artist_tattoosbyging/1.jpg',
    ]);
    expect(plan.embeddingRows).toBe(1);
    expect(plan.blockers).toEqual([]);

    // Planning is a read. Nothing destructive may be called.
    expect(deps.deleteGcsObjects).not.toHaveBeenCalled();
    expect(deps.deleteEmbedding).not.toHaveBeenCalled();
    expect(deps.suppressArtist).not.toHaveBeenCalled();
    expect(deps.writeTombstones).not.toHaveBeenCalled();
  });

  it('derives tombstone keys led by the instagram handle', async () => {
    const plan = await planTakedown(makeDeps(), { artistId: 'artist_tattoosbyging' });

    expect(plan.tombstoneKeys.map((k) => k.key)).toEqual([
      'instagram:tattoosbyging',
      'artist:artist_tattoosbyging',
      'source:http://timelesstattoo.co/artists',
    ]);
  });

  it('flags the static homepage snapshot, which no database filter reaches', async () => {
    const plan = await planTakedown(makeDeps(), { artistId: 'artist_tattoosbyging' });
    expect(plan.warnings.join(' ')).toMatch(/featured-artists\.json/);
  });

  it('blocks removal while a held deposit is pending — deleting orphans real money', async () => {
    const deps = makeDeps({
      listPendingRelays: vi.fn().mockResolvedValue([{ id: 'pi_1', amountCents: 15000 }]),
    });
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging' });

    expect(plan.blockers).toHaveLength(1);
    expect(plan.blockers[0]).toMatch(/deposit/i);
  });

  it('reports an unknown artist as not found rather than inventing an empty plan', async () => {
    const deps = makeDeps({ readArtist: vi.fn().mockResolvedValue(null) });
    const plan = await planTakedown(deps, { artistId: 'artist_nope' });

    expect(plan.found).toBe(false);
    expect(plan.blockers.join(' ')).toMatch(/not found/i);
  });

  it('reports an already-removed artist without planning a second removal', async () => {
    const deps = makeDeps({
      readArtist: vi.fn().mockResolvedValue({
        id: 'artist_x',
        instagram: '@x',
        removedAt: 1_700_000_000,
      }),
    });
    const plan = await planTakedown(deps, { artistId: 'artist_x' });

    expect(plan.alreadyRemoved).toBe(true);
  });

  it('under scope=images plans no node suppression, only content deletion', async () => {
    const plan = await planTakedown(makeDeps(), {
      artistId: 'artist_tattoosbyging',
      scope: 'images',
    });

    expect(plan.scope).toBe('images');
    expect(plan.willSuppressNode).toBe(false);
    expect(plan.gcsObjects.length).toBe(2);
  });

  it('under scope=all plans node suppression too', async () => {
    const plan = await planTakedown(makeDeps(), { artistId: 'artist_tattoosbyging' });
    expect(plan.willSuppressNode).toBe(true);
  });
});

describe('executeTakedown — dry run is the default', () => {
  it('deletes NOTHING when called with no options', async () => {
    const deps = makeDeps();
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging' });

    const result = await executeTakedown(deps, plan);

    expect(result.dryRun).toBe(true);
    expect(result.executed).toBe(false);
    expect(deps.deleteGcsObjects).not.toHaveBeenCalled();
    expect(deps.deleteEmbedding).not.toHaveBeenCalled();
    expect(deps.suppressArtist).not.toHaveBeenCalled();
    expect(deps.writeTombstones).not.toHaveBeenCalled();
  });

  it('deletes NOTHING when execute is requested but the confirmation does not match', async () => {
    const deps = makeDeps();
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging' });

    const result = await executeTakedown(deps, plan, {
      execute: true,
      confirm: 'artist_someone_else',
    });

    expect(result.executed).toBe(false);
    expect(result.error).toMatch(/confirm/i);
    expect(deps.deleteGcsObjects).not.toHaveBeenCalled();
  });

  it('reports what a dry run would have removed', async () => {
    const deps = makeDeps();
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging' });

    const result = await executeTakedown(deps, plan);

    expect(result.wouldRemove.gcsObjects).toBe(2);
    expect(result.wouldRemove.embeddingRows).toBe(1);
    expect(result.wouldRemove.tombstoneKeys).toBe(3);
  });
});

describe('executeTakedown — real execution', () => {
  const opts = { execute: true, confirm: 'artist_tattoosbyging' };

  it('writes the tombstone BEFORE deleting anything', async () => {
    const order = [];
    const deps = makeDeps({
      writeTombstones: vi.fn(async () => {
        order.push('tombstone');
        return true;
      }),
      deleteGcsObjects: vi.fn(async () => {
        order.push('gcs');
        return { deleted: 2, failed: [] };
      }),
      deleteEmbedding: vi.fn(async () => {
        order.push('embedding');
        return true;
      }),
      suppressArtist: vi.fn(async () => {
        order.push('suppress');
        return true;
      }),
    });
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging' });

    await executeTakedown(deps, plan, opts);

    // If the run dies half way, the artist must end up blocked from re-ingest
    // rather than deleted-and-rescrapeable.
    expect(order[0]).toBe('tombstone');
    expect(order).toContain('gcs');
    expect(order).toContain('suppress');
  });

  it('removes images, embedding and node, and reports each', async () => {
    const deps = makeDeps();
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging' });

    const result = await executeTakedown(deps, plan, opts);

    expect(result.executed).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.removed.gcsObjects).toBe(2);
    expect(result.removed.embeddingRows).toBe(1);
    expect(result.removed.nodeSuppressed).toBe(true);
    expect(deps.deleteEmbedding).toHaveBeenCalledWith('artist_tattoosbyging');
  });

  it('refuses to execute while a blocker stands', async () => {
    const deps = makeDeps({
      listPendingRelays: vi.fn().mockResolvedValue([{ id: 'pi_1', amountCents: 15000 }]),
    });
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging' });

    const result = await executeTakedown(deps, plan, opts);

    expect(result.executed).toBe(false);
    expect(result.error).toMatch(/deposit/i);
    expect(deps.deleteGcsObjects).not.toHaveBeenCalled();
  });

  it('leaves the node alone under scope=images', async () => {
    const deps = makeDeps();
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging', scope: 'images' });

    const result = await executeTakedown(deps, plan, opts);

    expect(result.executed).toBe(true);
    expect(deps.deleteGcsObjects).toHaveBeenCalled();
    expect(deps.suppressArtist).not.toHaveBeenCalled();
    expect(result.removed.nodeSuppressed).toBe(false);
  });

  it('reports FAILURE when some images could not be deleted — never a partial success', async () => {
    const deps = makeDeps({
      deleteGcsObjects: vi.fn().mockResolvedValue({
        deleted: 1,
        failed: [{ path: 'artists/artist_tattoosbyging/1.jpg', error: '403' }],
      }),
    });
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging' });

    const result = await executeTakedown(deps, plan, opts);

    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(/1\.jpg/);
  });

  it('reports FAILURE when the tombstone cannot be written, and removes nothing', async () => {
    // Without a tombstone, a later scrape silently resurrects them. Deleting
    // the data anyway would be the worst of both worlds.
    const deps = makeDeps({ writeTombstones: vi.fn().mockResolvedValue(false) });
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging' });

    const result = await executeTakedown(deps, plan, opts);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/tombstone/i);
    expect(deps.deleteGcsObjects).not.toHaveBeenCalled();
    expect(deps.suppressArtist).not.toHaveBeenCalled();
  });

  it('reports FAILURE when the embedding delete throws', async () => {
    const deps = makeDeps({
      deleteEmbedding: vi.fn().mockRejectedValue(new Error('supabase down')),
    });
    const plan = await planTakedown(deps, { artistId: 'artist_tattoosbyging' });

    const result = await executeTakedown(deps, plan, opts);

    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(/supabase down/);
  });
});
