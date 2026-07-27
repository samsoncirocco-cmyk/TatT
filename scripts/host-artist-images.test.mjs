import { describe, expect, it } from 'vitest';
import {
  extFromContentType,
  isSafeArtistId,
  gcsObjectPath,
  publicUrl,
  normalizeRecord,
  bookabilityRejection,
  buildArtistUpdate,
  parseArgs,
} from './host-artist-images.mjs';

describe('extFromContentType', () => {
  it('maps supported image types to a stored extension', () => {
    expect(extFromContentType('image/jpeg')).toBe('jpg');
    expect(extFromContentType('image/jpg')).toBe('jpg');
    expect(extFromContentType('image/webp')).toBe('webp');
    expect(extFromContentType('image/png')).toBe('png');
  });

  it('ignores charset/params and casing', () => {
    expect(extFromContentType('IMAGE/JPEG; charset=binary')).toBe('jpg');
    expect(extFromContentType('  image/webp ')).toBe('webp');
  });

  it('returns null for unsupported or missing types (caller skips)', () => {
    expect(extFromContentType('image/gif')).toBeNull();
    expect(extFromContentType('text/html')).toBeNull();
    expect(extFromContentType('')).toBeNull();
    expect(extFromContentType(null)).toBeNull();
    expect(extFromContentType(undefined)).toBeNull();
  });
});

describe('isSafeArtistId', () => {
  it('accepts scraper ids and rejects path-traversal / junk', () => {
    expect(isSafeArtistId('artist_1234')).toBe(true);
    expect(isSafeArtistId('artist-abc_9')).toBe(true);
    expect(isSafeArtistId('../etc/passwd')).toBe(false);
    expect(isSafeArtistId('a/b')).toBe(false);
    expect(isSafeArtistId('has space')).toBe(false);
    expect(isSafeArtistId('')).toBe(false);
    expect(isSafeArtistId(null)).toBe(false);
    expect(isSafeArtistId(42)).toBe(false);
  });
});

describe('gcsObjectPath', () => {
  it('maps (artistId, index, ext) to a stable object path', () => {
    expect(gcsObjectPath('artist_7', 0, 'jpg')).toBe('artists/artist_7/0.jpg');
    expect(gcsObjectPath('artist_7', 3, 'webp')).toBe('artists/artist_7/3.webp');
  });

  it('throws on an unsafe artistId rather than building a bad path', () => {
    expect(() => gcsObjectPath('../evil', 0, 'jpg')).toThrow(/Unsafe artistId/);
  });
});

describe('publicUrl', () => {
  it('builds the storage.googleapis.com public URL', () => {
    expect(publicUrl('tatt-pro-assets', 'artists/artist_7/0.jpg')).toBe(
      'https://storage.googleapis.com/tatt-pro-assets/artists/artist_7/0.jpg',
    );
  });
});

describe('normalizeRecord', () => {
  it('accepts a well-formed record and keeps only http(s) image urls', () => {
    expect(
      normalizeRecord({
        artistId: 'artist_1',
        handle: 'ink.by.sam',
        images: ['https://a/1.jpg', 'not-a-url', 'http://b/2.png', 42],
      }),
    ).toEqual({
      artistId: 'artist_1',
      handle: 'ink.by.sam',
      images: ['https://a/1.jpg', 'http://b/2.png'],
    });
  });

  it('returns null when artistId is missing/unsafe or no usable images remain', () => {
    expect(normalizeRecord({ images: ['https://a/1.jpg'] })).toBeNull();
    expect(normalizeRecord({ artistId: '../x', images: ['https://a/1.jpg'] })).toBeNull();
    expect(normalizeRecord({ artistId: 'artist_1', images: [] })).toBeNull();
    expect(normalizeRecord({ artistId: 'artist_1', images: ['ftp://x'] })).toBeNull();
    expect(normalizeRecord(null)).toBeNull();
  });

  it('tolerates a missing handle', () => {
    expect(normalizeRecord({ artistId: 'artist_1', images: ['https://a/1.jpg'] })).toEqual({
      artistId: 'artist_1',
      handle: null,
      images: ['https://a/1.jpg'],
    });
  });

  it('rejects a negative classifier verdict unless the operator explicitly bypasses it', () => {
    const rejected = {
      artistId: 'artist_1',
      handle: 'shared.shop',
      images: ['https://a/1.jpg'],
      looksBookable: false,
      filterReason: 'shop-account',
    };
    expect(bookabilityRejection(rejected)).toBe('shop-account');
    expect(normalizeRecord(rejected)).toBeNull();
    expect(normalizeRecord(rejected, { allowRejected: true })).toMatchObject({
      artistId: 'artist_1',
    });
  });

  it('keeps legacy records with no classifier field while new enrichers roll out', () => {
    expect(
      normalizeRecord({ artistId: 'artist_1', images: ['https://a/1.jpg'] }),
    ).not.toBeNull();
  });
});

describe('buildArtistUpdate', () => {
  it('sets portfolioImages + derived count/source/timestamp, values only via params', () => {
    const urls = ['https://storage.googleapis.com/b/artists/artist_1/0.jpg'];
    const { query, params } = buildArtistUpdate('artist_1', urls, 'instagram', 1784586910000);

    expect(params).toEqual({
      artistId: 'artist_1',
      urls,
      source: 'instagram',
      updatedAt: 1784586910000,
    });
    // count is derived in Cypher from the array, never passed as a stale number.
    expect(query).toContain('a.portfolioImageCount = size($urls)');
    expect(query).toContain('a.portfolioImages = $urls');
    expect(query).toContain('a.portfolioSource = $source');
    expect(query).toContain('a.portfolioUpdatedAt = $updatedAt');
    expect(query).toContain('MATCH (a:Artist {id: $artistId})');
    // No interpolated values in the query text.
    expect(query).not.toContain('artist_1');
    expect(query).not.toContain('instagram');
    expect(query).not.toContain('1784586910000');
    // Portfolio refreshes may not overwrite artist-managed profile or
    // verification state (TAT-10).
    expect(query).not.toContain('artistManagedFields');
    expect(query).not.toContain('profileManagedAtEpochMs');
    expect(query).not.toContain('claimVerificationStatus');
    expect(query).not.toContain('a.name');
    expect(query).not.toContain('a.bio');
    expect(query).not.toContain('a.instagram');
  });
});

describe('parseArgs', () => {
  it('parses flags and applies sensible defaults', () => {
    const opts = parseArgs(['--input', './imgs', '--limit', '5', '--dry-run', '--timestamp', '123', '--source', 'ig', '--max-per-artist', '3', '--no-filter']);
    expect(opts.input).toBe('./imgs');
    expect(opts.limit).toBe(5);
    expect(opts.dryRun).toBe(true);
    expect(opts.timestamp).toBe(123);
    expect(opts.source).toBe('ig');
    expect(opts.maxPerArtist).toBe(3);
    expect(opts.noFilter).toBe(true);
  });

  it('defaults limit to all and dryRun to false', () => {
    const opts = parseArgs(['--input', './imgs']);
    expect(opts.limit).toBe(Infinity);
    expect(opts.dryRun).toBe(false);
    expect(opts.maxPerArtist).toBe(8);
    expect(opts.noFilter).toBe(false);
  });
});
