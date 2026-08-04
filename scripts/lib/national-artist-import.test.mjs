import { describe, expect, it } from 'vitest';
import { makeTombstoneGate } from './takedown-tombstone.mjs';
import {
  DEFAULT_NATIONAL_ARTIST_INPUT,
  NATIONAL_ARTIST_IMPORT_CYPHER,
  NATIONAL_SHOP_IMPORT_CYPHER,
  instagramProfileUrl,
  parseNationalImportArgs,
  partitionProtectedNationalArtists,
  prepareNationalArtist,
  tombstoneKeysForNationalArtist,
} from './national-artist-import.mjs';

describe('national artist importer options', () => {
  it('is dry-run by default', () => {
    expect(parseNationalImportArgs([])).toEqual({
      apply: false,
      input: DEFAULT_NATIONAL_ARTIST_INPUT,
      limit: Infinity,
    });
  });

  it('requires an explicit apply flag and accepts a named snapshot', () => {
    expect(
      parseNationalImportArgs([
        '--apply',
        '--limit',
        '25',
        '--input',
        'data/final.json',
      ]),
    ).toEqual({
      apply: true,
      input: 'data/final.json',
      limit: 25,
    });
  });

  it('rejects destructive wipe and malformed limits', () => {
    expect(() => parseNationalImportArgs(['--apply', '--wipe'])).toThrow(
      /not supported/i,
    );
    expect(() => parseNationalImportArgs(['--limit', '0'])).toThrow(
      /positive integer/i,
    );
  });
});

describe('national artist preparation', () => {
  it('creates a canonical Instagram profile URL from handles and URLs', () => {
    expect(instagramProfileUrl('@Ink.By.Sam')).toBe(
      'https://instagram.com/ink.by.sam',
    );
    expect(
      instagramProfileUrl('https://www.instagram.com/Ink.By.Sam/reels'),
    ).toBe('https://instagram.com/ink.by.sam');
  });

  it('builds every durable tombstone key available in the record', () => {
    expect(
      tombstoneKeysForNationalArtist({
        id: 'artist_ink.by.sam',
        instagram: '@Ink.By.Sam',
        sourcePages: ['https://shop.example/artists'],
      }),
    ).toEqual([
      'artist:artist_ink.by.sam',
      'instagram:ink.by.sam',
      'source:https://shop.example/artists',
    ]);
  });

  it('normalizes optional arrays before they reach Cypher', () => {
    expect(
      prepareNationalArtist({
        id: 'artist_a',
        portfolioImages: ['https://example.com/a.jpg', null, ''],
      }),
    ).toMatchObject({
      portfolioImages: ['https://example.com/a.jpg'],
      styles: [],
      tags: [],
      tombstoneKeys: ['artist:artist_a'],
    });
  });
});

describe('national artist protection', () => {
  it('excludes every protected profile category', () => {
    const artists = [
      { id: 'removed' },
      { id: 'claimed' },
      { id: 'self' },
      { id: 'pending' },
      { id: 'tombstoned', instagram: '@gone' },
      { id: 'allowed' },
    ];

    const result = partitionProtectedNationalArtists(artists, {
      removedIds: new Set(['removed']),
      claimedIds: new Set(['claimed']),
      selfRegisteredIds: new Set(['self']),
      pendingRequestIds: new Set(['pending']),
      tombstoneGate: makeTombstoneGate(['instagram:gone']),
    });

    expect(result.allowed.map((artist) => artist.id)).toEqual(['allowed']);
    expect(result.counts).toEqual({
      removed: 1,
      claimed: 1,
      selfRegistered: 1,
      pendingRequest: 1,
      tombstoned: 1,
    });
  });

  it('pins the live write guards and forbids destructive graph wipes', () => {
    expect(NATIONAL_ARTIST_IMPORT_CYPHER).toContain('a.claimedByUid IS NULL');
    expect(NATIONAL_ARTIST_IMPORT_CYPHER).toContain(
      'coalesce(a.selfRegistered, false) = false',
    );
    expect(NATIONAL_ARTIST_IMPORT_CYPHER).toContain(
      "TakedownRequest {status: 'pending', artistId: row.id}",
    );
    expect(NATIONAL_ARTIST_IMPORT_CYPHER).toContain(
      't.key IN row.tombstoneKeys',
    );
    expect(NATIONAL_ARTIST_IMPORT_CYPHER).not.toContain('DETACH DELETE');
  });
});

describe('national shop import', () => {
  // websiteLive reflects the last probed URL. Re-import can swap one non-empty
  // website for another; without invalidation the old true keeps the artist
  // bookable against a URL that was never checked (ADR-0043).
  it('clears websiteLive when the shop website URL changes', () => {
    expect(NATIONAL_SHOP_IMPORT_CYPHER).toContain('s.websiteLive = CASE');
    expect(NATIONAL_SHOP_IMPORT_CYPHER).toContain(
      "trim(coalesce(s.website, '')) = trim(coalesce(row.website, ''))",
    );
    expect(NATIONAL_SHOP_IMPORT_CYPHER).toContain('s.website = row.website');
  });
});
