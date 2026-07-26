// The gate the discovery pipeline consults before ingesting an artist.
//
// "A takedown that a later scrape undoes is not a takedown." The property this
// file exists to pin down is FAIL-CLOSED: if the tombstone list cannot be
// loaded, ingest must stop, not proceed with an empty (permissive) list. The
// tempting bug — `catch { return new Set() }` — silently re-imports every
// artist who ever asked to be removed. See docs/adr/0024 §4.
import { describe, expect, it, vi } from 'vitest';
import { loadTombstoneGate, makeTombstoneGate } from './takedown-tombstone.mjs';

describe('makeTombstoneGate', () => {
  const gate = makeTombstoneGate([
    'instagram:tattoosbyging',
    'artist:artist_tattoosbyging',
    'source:http://timelesstattoo.co/artists',
  ]);

  it('blocks by instagram handle regardless of formatting', () => {
    expect(gate.isTombstoned({ instagram: '@TattoosByGing' }).blocked).toBe(true);
    expect(gate.isTombstoned({ instagram: 'https://instagram.com/tattoosbyging/' }).blocked).toBe(true);
    expect(gate.isTombstoned({ instagram: 'tattoosbyging' }).blocked).toBe(true);
  });

  it('blocks by artist id', () => {
    expect(gate.isTombstoned({ artistId: 'artist_tattoosbyging' }).blocked).toBe(true);
  });

  it('blocks by source page', () => {
    expect(gate.isTombstoned({ sourceUrl: 'http://timelesstattoo.co/artists' }).blocked).toBe(true);
  });

  it('blocks on the handle even when the id is different — the crawler mints random ids', () => {
    // This is the whole reason the handle is the primary key: a re-crawl gives
    // the same artist a brand new id.
    expect(
      gate.isTombstoned({ artistId: 'artist_9zzq1x4kb', instagram: '@tattoosbyging' }).blocked,
    ).toBe(true);
  });

  it('says which key matched, so an operator can see why an artist was skipped', () => {
    expect(gate.isTombstoned({ instagram: '@tattoosbyging' }).matchedKey).toBe(
      'instagram:tattoosbyging',
    );
  });

  it('lets through an artist nobody has tombstoned', () => {
    const result = gate.isTombstoned({ artistId: 'artist_other', instagram: '@someoneelse' });
    expect(result.blocked).toBe(false);
    expect(result.matchedKey).toBeNull();
  });

  it('does not block on empty or missing identifiers', () => {
    expect(gate.isTombstoned({}).blocked).toBe(false);
    expect(gate.isTombstoned({ instagram: '', artistId: null }).blocked).toBe(false);
  });
});

describe('loadTombstoneGate — fail closed', () => {
  it('loads the keys and reports the count', async () => {
    const read = vi.fn().mockResolvedValue(['instagram:a', 'artist:b']);

    const gate = await loadTombstoneGate(read);

    expect(gate.keyCount).toBe(2);
    expect(gate.isTombstoned({ instagram: 'a' }).blocked).toBe(true);
  });

  it('THROWS when the tombstone list cannot be read — never degrades to a permissive gate', async () => {
    const read = vi.fn().mockRejectedValue(new Error('neo4j unreachable'));

    await expect(loadTombstoneGate(read)).rejects.toThrow(/tombstone/i);
  });

  it('throws rather than treating a non-list response as "no tombstones"', async () => {
    await expect(loadTombstoneGate(vi.fn().mockResolvedValue(null))).rejects.toThrow(/tombstone/i);
  });

  it('accepts a genuinely empty list — no tombstones is a valid state', async () => {
    const gate = await loadTombstoneGate(vi.fn().mockResolvedValue([]));

    expect(gate.keyCount).toBe(0);
    expect(gate.isTombstoned({ instagram: 'anyone' }).blocked).toBe(false);
  });
});
