import { describe, expect, it } from 'vitest';
import { CANONICAL_STYLES } from '@/lib/design-style-signal';
import {
  CANONICAL_STYLE_NAMES,
  STYLE_PATTERNS,
  extractStyleEvidence,
  stylesFromBio,
  rejectSpuriousEvidence,
  isSafeArtistId,
  normalizeStyleRecord,
  toStylePairs,
} from './artist-styles.mjs';

describe('vocabulary lock', () => {
  // The whole enrichment lane is only useful if it writes the exact style
  // strings the matcher filters on. This test is the tripwire for drift.
  it('is set-equal to CANONICAL_STYLES in src/lib/design-style-signal.ts', () => {
    expect([...CANONICAL_STYLE_NAMES].sort()).toEqual([...CANONICAL_STYLES].sort());
  });

  it('has exactly one regex rule per canonical style', () => {
    expect(STYLE_PATTERNS.map((r) => r.style).sort()).toEqual([...CANONICAL_STYLE_NAMES].sort());
  });
});

describe('extractStyleEvidence', () => {
  it('tags a plain self-declared bio and keeps the matched text as evidence', () => {
    const hits = extractStyleEvidence('Black & Grey Realism | Fine Line Tattoos');
    expect(hits.map((h) => h.style)).toEqual(['Black & Grey', 'Fine Line', 'Realism']);
    expect(hits.find((h) => h.style === 'Black & Grey').match).toBe('Black & Grey');
  });

  it('handles the separator styles real bios use', () => {
    expect(stylesFromBio('Anime||Japanese||Fine-line||Walk-Ins')).toEqual(['Fine Line', 'Japanese', 'Anime']);
    expect(stylesFromBio('FINE LINE * ILLUSTRATIVE * TRADITIONAL')).toEqual(['Traditional', 'Fine Line', 'Illustrative']);
    expect(stylesFromBio('black&grey')).toEqual(['Black & Grey']);
    expect(stylesFromBio('Black and Gray Tattoos')).toEqual(['Black & Grey']);
  });

  it('does not emit Traditional when the only evidence is neo-traditional', () => {
    expect(stylesFromBio('Colorful Neotraditional & Illustrative Tattoos')).toEqual([
      'Neo-Traditional',
      'Illustrative',
    ]);
  });

  it('keeps Traditional when the bio claims both independently', () => {
    expect(stylesFromBio('American Traditional and Neo-Traditional')).toEqual([
      'Traditional',
      'Neo-Traditional',
    ]);
  });

  it('returns nothing for an empty or style-free bio', () => {
    expect(extractStyleEvidence('')).toEqual([]);
    expect(extractStyleEvidence('   ')).toEqual([]);
    expect(extractStyleEvidence(null)).toEqual([]);
    expect(extractStyleEvidence('Books open. DM to book. Deposits required.')).toEqual([]);
  });

  it('is deterministic — same bio, same tags, in rule order', () => {
    const bio = 'Traditional, Fine Line, Realism';
    expect(stylesFromBio(bio)).toEqual(stylesFromBio(bio));
    expect(stylesFromBio(bio)).toEqual(['Traditional', 'Fine Line', 'Realism']);
  });
});

describe('rejectSpuriousEvidence', () => {
  const guard = (bio) => {
    const { kept, rejected } = rejectSpuriousEvidence(bio, extractStyleEvidence(bio));
    return { kept: kept.map((k) => k.style), rejected: rejected.map((r) => `${r.style}:${r.reason}`) };
  };

  it('drops a style the artist explicitly disclaims', () => {
    expect(guard('San Antonio | No tribal | DM to book')).toEqual({
      kept: [],
      rejected: ['Tribal:negated'],
    });
    expect(guard('$150hr deposit. I do not do script')).toEqual({
      kept: [],
      rejected: ['Script:negated'],
    });
    expect(guard('We do NOT offer fine line or micro tattoos')).toEqual({
      kept: [],
      rejected: ['Fine Line:negated'],
    });
  });

  it('does not treat ❌/🚫 bullets or an unrelated "NO" as negation', () => {
    // "❌" here is a bullet in front of a style LIST, not a disclaimer.
    expect(guard('❌Geometric / Ornamental').kept).toEqual(['Geometric']);
    // The "NO" belongs to "NO DMS"; an emoji separates it from the claim.
    expect(guard('❌NO DMS❌🌸SOFT TRAD🌸🍥ANIME🍥').kept).toEqual(['Anime']);
  });

  it('drops Tribal when the only evidence is the shop name "Tribal Rites"', () => {
    expect(guard('Tattoo Artist at Tribal Rites 🎨 Loveland, Colorado')).toEqual({
      kept: [],
      rejected: ['Tribal:proper-noun-collision'],
    });
  });

  it('keeps Tribal when a real claim sits alongside the shop name', () => {
    expect(guard('Polynesian tribal tattoos | Tribal Rites Co. Boulder CO').kept).toEqual(['Tribal']);
  });

  it('drops the brand and tribal-enrollment collisions', () => {
    expect(guard('TRIBAL GEAR AND SULLEN AUTHORIZED DEALER').kept).toEqual([]);
    expect(guard('Army vet ⚡️Sho-Ban tribal member 🦬 Tattoo Artist').kept).toEqual([]);
  });

  it('leaves ordinary bios untouched and never invents a tag', () => {
    const bio = 'Fine Line • Blackwork • Color • lettering';
    const before = extractStyleEvidence(bio);
    const { kept, rejected } = rejectSpuriousEvidence(bio, before);
    expect(kept).toEqual(before);
    expect(rejected).toEqual([]);
  });
});

describe('isSafeArtistId', () => {
  it('accepts scraper ids and rejects junk', () => {
    expect(isSafeArtistId('artist_inkbysam')).toBe(true);
    expect(isSafeArtistId('artist_mp.tatt')).toBe(true);
    expect(isSafeArtistId('../etc/passwd')).toBe(false);
    expect(isSafeArtistId('a/b')).toBe(false);
    expect(isSafeArtistId('has space')).toBe(false);
    expect(isSafeArtistId('')).toBe(false);
    expect(isSafeArtistId(null)).toBe(false);
    expect(isSafeArtistId(42)).toBe(false);
  });
});

describe('normalizeStyleRecord', () => {
  it('keeps canonical styles, de-duplicates, and fixes casing', () => {
    expect(
      normalizeStyleRecord({ artistId: 'artist_x', styles: ['fine line', 'Fine Line', 'REALISM'] }),
    ).toEqual({ artistId: 'artist_x', styles: ['Fine Line', 'Realism'] });
  });

  it('drops off-vocabulary styles the graph filter could never match', () => {
    expect(normalizeStyleRecord({ artistId: 'artist_x', styles: ['Ornamental', 'Dotwork', 'Realism'] })).toEqual({
      artistId: 'artist_x',
      styles: ['Realism'],
    });
  });

  it('returns null when the row is unusable', () => {
    expect(normalizeStyleRecord({ artistId: 'artist_x', styles: [] })).toBeNull();
    expect(normalizeStyleRecord({ artistId: 'artist_x', styles: ['Ornamental'] })).toBeNull();
    expect(normalizeStyleRecord({ styles: ['Realism'] })).toBeNull();
    expect(normalizeStyleRecord({ artistId: '../x', styles: ['Realism'] })).toBeNull();
    expect(normalizeStyleRecord(null)).toBeNull();
  });
});

describe('toStylePairs', () => {
  it('flattens records into the (artistId, style) rows the graph stores', () => {
    expect(
      toStylePairs([
        { artistId: 'a1', styles: ['Realism', 'Anime'] },
        { artistId: 'a2', styles: ['Script'] },
      ]),
    ).toEqual([
      { artistId: 'a1', style: 'Realism' },
      { artistId: 'a1', style: 'Anime' },
      { artistId: 'a2', style: 'Script' },
    ]);
  });
});
