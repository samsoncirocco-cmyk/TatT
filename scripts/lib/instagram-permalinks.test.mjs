import { describe, expect, it } from 'vitest';
import {
  mediaIdFromIgCacheKey,
  shortcodeFromMediaId,
  permalinkFromShortcode,
  igCacheKeyFromUrl,
  permalinkFromSourceUrl,
  filterSourceImages,
  hostedIndexFromUrl,
  alignPermalinks,
  derivePermalinksForImages,
} from './instagram-permalinks.mjs';

// Real ig_cache_key shape from the archived Apify profiles:
// base64("3480203699802455289") + cache suffix.
const REAL_KEY = 'MzQ4MDIwMzY5OTgwMjQ1NTI4OQ==.3-ccb7-5';
const REAL_MEDIA_ID = '3480203699802455289';

describe('mediaIdFromIgCacheKey', () => {
  it('decodes the base64 media ID and drops the cache suffix', () => {
    expect(mediaIdFromIgCacheKey(REAL_KEY)).toBe(REAL_MEDIA_ID);
  });

  it('handles the "<mediaId>_<userId>" encoded variant', () => {
    const key = Buffer.from('3480203699802455289_1234567').toString('base64');
    expect(mediaIdFromIgCacheKey(key)).toBe(REAL_MEDIA_ID);
  });

  it('rejects non-numeric decodes, zero, and junk input', () => {
    expect(mediaIdFromIgCacheKey(Buffer.from('not-a-number').toString('base64'))).toBeNull();
    expect(mediaIdFromIgCacheKey(Buffer.from('0').toString('base64'))).toBeNull();
    expect(mediaIdFromIgCacheKey('')).toBeNull();
    expect(mediaIdFromIgCacheKey(null)).toBeNull();
    expect(mediaIdFromIgCacheKey(undefined)).toBeNull();
  });
});

describe('shortcodeFromMediaId', () => {
  it('base64url-encodes the numeric media ID, most significant digit first', () => {
    // 3480203699802455289 = 48*64^9 + 6*64^8 + ... verified round-trip below.
    const shortcode = shortcodeFromMediaId(REAL_MEDIA_ID);
    expect(shortcode).toMatch(/^[A-Za-z0-9_-]{11}$/);
    // Round-trip: decode the shortcode back to the media ID.
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let n = 0n;
    for (const ch of shortcode) n = n * 64n + BigInt(alphabet.indexOf(ch));
    expect(n.toString()).toBe(REAL_MEDIA_ID);
  });

  it('encodes small known values exactly', () => {
    expect(shortcodeFromMediaId('1')).toBe('B');
    expect(shortcodeFromMediaId('63')).toBe('_');
    expect(shortcodeFromMediaId('64')).toBe('BA');
    expect(shortcodeFromMediaId('65')).toBe('BB');
  });

  it('rejects zero, negatives, and non-numeric input', () => {
    expect(shortcodeFromMediaId('0')).toBeNull();
    expect(shortcodeFromMediaId('-5')).toBeNull();
    expect(shortcodeFromMediaId('abc')).toBeNull();
    expect(shortcodeFromMediaId(null)).toBeNull();
    expect(shortcodeFromMediaId(3480203699802455289)).toBeNull(); // must be a string
  });
});

describe('permalinkFromShortcode', () => {
  it('builds the canonical post URL', () => {
    expect(permalinkFromShortcode('Dauh3lYRTNH')).toBe(
      'https://www.instagram.com/p/Dauh3lYRTNH/',
    );
  });

  it('rejects characters outside the shortcode alphabet', () => {
    expect(permalinkFromShortcode('abc/def')).toBeNull();
    expect(permalinkFromShortcode('')).toBeNull();
    expect(permalinkFromShortcode(null)).toBeNull();
  });
});

describe('igCacheKeyFromUrl / permalinkFromSourceUrl', () => {
  const withKey =
    `https://scontent-sjc6-1.cdninstagram.com/v/t51.2885-15/463431244_n.jpg` +
    `?stp=dst-jpg&ig_cache_key=${encodeURIComponent(REAL_KEY)}&_nc_ht=x`;
  const withoutKey =
    'https://scontent-sjc6-1.cdninstagram.com/v/t51.2885-15/463431244_n.jpg?stp=dst-jpg';

  it('extracts and URL-decodes ig_cache_key', () => {
    expect(igCacheKeyFromUrl(withKey)).toBe(REAL_KEY);
    expect(igCacheKeyFromUrl(withoutKey)).toBeNull();
    expect(igCacheKeyFromUrl('not a url')).toBeNull();
  });

  it('derives the full permalink from a source URL', () => {
    const permalink = permalinkFromSourceUrl(withKey);
    expect(permalink).toMatch(/^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]{11}\/$/);
    expect(permalinkFromSourceUrl(withoutKey)).toBeNull();
  });
});

describe('filterSourceImages', () => {
  it('matches host-artist-images normalizeRecord filtering exactly', () => {
    expect(
      filterSourceImages(['https://a.example/x.jpg', 42, 'ftp://nope', 'HTTP://b.example/y.jpg']),
    ).toEqual(['https://a.example/x.jpg', 'HTTP://b.example/y.jpg']);
    expect(filterSourceImages(null)).toEqual([]);
    expect(filterSourceImages(undefined)).toEqual([]);
  });
});

describe('hostedIndexFromUrl', () => {
  it('reads the archive index from the hosted object filename', () => {
    expect(
      hostedIndexFromUrl('https://storage.googleapis.com/tatt-pro-assets/artists/artist_x/0.jpg'),
    ).toBe(0);
    expect(
      hostedIndexFromUrl('https://storage.googleapis.com/tatt-pro-assets/artists/artist_x/7.webp'),
    ).toBe(7);
  });

  it('returns null for non-portfolio URLs', () => {
    expect(hostedIndexFromUrl('https://storage.googleapis.com/tatt-pro-assets/design-sessions/a.png')).toBeNull();
    expect(hostedIndexFromUrl('https://example.com/artists/x/notanumber.jpg')).toBeNull();
    expect(hostedIndexFromUrl('junk')).toBeNull();
    expect(hostedIndexFromUrl(null)).toBeNull();
  });
});

describe('alignPermalinks', () => {
  const archive = [
    'https://www.instagram.com/p/AAA/',
    null, // images[1] had no ig_cache_key
    'https://www.instagram.com/p/CCC/',
    'https://www.instagram.com/p/DDD/',
  ];

  it('aligns by hosted filename index, not array position (skipped downloads)', () => {
    // Download of images[1] failed, so the node holds indices 0, 2, 3 —
    // portfolioImages position k !== archive index n.
    const portfolioImages = [
      'https://storage.googleapis.com/tatt-pro-assets/artists/artist_x/0.jpg',
      'https://storage.googleapis.com/tatt-pro-assets/artists/artist_x/2.jpg',
      'https://storage.googleapis.com/tatt-pro-assets/artists/artist_x/3.webp',
    ];
    expect(alignPermalinks(portfolioImages, archive)).toEqual([
      'https://www.instagram.com/p/AAA/',
      'https://www.instagram.com/p/CCC/',
      'https://www.instagram.com/p/DDD/',
    ]);
  });

  it('uses empty string (never null) for unrecovered slots, output length always matches', () => {
    const portfolioImages = [
      'https://storage.googleapis.com/tatt-pro-assets/artists/artist_x/1.jpg', // no key
      'https://storage.googleapis.com/tatt-pro-assets/artists/artist_x/9.jpg', // out of range
      'https://example.com/not-a-portfolio-url.jpg', // unparseable index
      'https://storage.googleapis.com/tatt-pro-assets/artists/artist_x/0.jpg',
    ];
    const aligned = alignPermalinks(portfolioImages, archive);
    expect(aligned).toEqual(['', '', '', 'https://www.instagram.com/p/AAA/']);
    expect(aligned).toHaveLength(portfolioImages.length);
    expect(aligned.every((p) => typeof p === 'string')).toBe(true);
  });

  it('handles missing inputs without throwing', () => {
    expect(alignPermalinks(null, archive)).toEqual([]);
    expect(
      alignPermalinks(['https://storage.googleapis.com/b/artists/a/0.jpg'], null),
    ).toEqual(['']);
  });
});

describe('derivePermalinksForImages', () => {
  it('derives per filtered-index permalinks end to end', () => {
    const images = [
      `https://cdn.example/img0.jpg?ig_cache_key=${encodeURIComponent(REAL_KEY)}`,
      'not-a-url', // filtered out — later indices shift, matching the uploader
      'https://cdn.example/img1.jpg', // no key → null
    ];
    const result = derivePermalinksForImages(images);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatch(/^https:\/\/www\.instagram\.com\/p\//);
    expect(result[1]).toBeNull();
  });
});
