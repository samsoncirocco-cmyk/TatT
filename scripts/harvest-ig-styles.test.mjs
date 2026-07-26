import { describe, expect, it } from 'vitest';
import { parseArgs, harvestProfile, buildStats, buildArtifact, SOURCE_NAME } from './harvest-ig-styles.mjs';

describe('parseArgs', () => {
  it('applies defaults', () => {
    const opts = parseArgs(['--input', './profiles']);
    expect(opts.input).toBe('./profiles');
    expect(opts.out).toBe('data/enrichment/ig-artist-styles.json');
    expect(opts.limit).toBe(Infinity);
    expect(opts.maxStyles).toBe(Infinity);
    expect(opts.guard).toBe(true);
    expect(opts.stdout).toBe(false);
  });

  it('parses every flag', () => {
    const opts = parseArgs(['--input', 'i', '--out', 'o.json', '--limit', '5', '--max-styles', '4', '--raw', '--stdout']);
    expect(opts).toEqual({ input: 'i', out: 'o.json', limit: 5, maxStyles: 4, guard: false, stdout: true });
  });
});

describe('harvestProfile', () => {
  it('turns a self-declared bio into a styled record with evidence', () => {
    const { record, reason } = harvestProfile({
      artistId: 'artist_a',
      handle: 'a',
      bio: 'Black & Grey Realism | Fine Line Tattoos',
    });
    expect(reason).toBeNull();
    expect(record.artistId).toBe('artist_a');
    expect(record.styles).toEqual(['Black & Grey', 'Fine Line', 'Realism']);
    // The source bio is kept verbatim so any tag is hand-checkable from the
    // artifact alone, without going back to the scrape.
    expect(record.bio).toBe('Black & Grey Realism | Fine Line Tattoos');
    expect(record.evidence.map((e) => e.style)).toEqual(record.styles);
  });

  it('reports why each unusable profile was skipped', () => {
    expect(harvestProfile(null).reason).toBe('unparseable');
    expect(harvestProfile({ bio: 'Realism' }).reason).toBe('no-artist-id');
    expect(harvestProfile({ artistId: 'artist_a' }).reason).toBe('no-bio');
    expect(harvestProfile({ artistId: 'artist_a', bio: '   ' }).reason).toBe('no-bio');
    expect(harvestProfile({ artistId: 'artist_a', bio: 'Books open, DM to book' }).reason).toBe('no-style');
  });

  it('drops artists carrying more than --max-styles tags', () => {
    const bio = 'Traditional, Fine Line, Realism, Anime, Japanese';
    expect(harvestProfile({ artistId: 'artist_a', bio }).record.styles).toHaveLength(5);
    expect(harvestProfile({ artistId: 'artist_a', bio }, 4).reason).toBe('too-many-styles');
  });

  it('applies the precision guard by default and reports what it removed', () => {
    const { record, rejected } = harvestProfile({
      artistId: 'artist_a',
      bio: 'Tattoo Artist at Tribal Rites, Loveland CO. Fine Line work.',
    });
    expect(record.styles).toEqual(['Fine Line']);
    expect(rejected).toEqual([
      expect.objectContaining({ artistId: 'artist_a', style: 'Tribal', reason: 'proper-noun-collision' }),
    ]);
  });

  it('--raw reproduces the unguarded regex output', () => {
    const raw = harvestProfile(
      { artistId: 'artist_a', bio: 'Tattoo Artist at Tribal Rites, Loveland CO. Fine Line work.' },
      Infinity,
      false,
    );
    expect(raw.record.styles).toEqual(['Fine Line', 'Tribal']);
    expect(raw.rejected).toEqual([]);
  });

  it('is deterministic — the same profile always harvests the same tags', () => {
    const p = { artistId: 'artist_a', bio: 'Fine Line • Blackwork • lettering' };
    expect(harvestProfile(p).record.styles).toEqual(harvestProfile(p).record.styles);
  });
});

describe('buildStats', () => {
  it('counts pairs, per-style tags and the styles-per-artist distribution', () => {
    const records = [
      { artistId: 'a1', styles: ['Realism', 'Anime'] },
      { artistId: 'a2', styles: ['Realism'] },
    ];
    const stats = buildStats(records, {
      profiles: 10, withBio: 8, unparseable: 0, noArtistId: 1, noBio: 2, noStyle: 5, tooManyStyles: 0,
    });

    expect(stats.styled).toBe(2);
    expect(stats.pairs).toBe(3);
    expect(stats.styleHistogram.Realism).toBe(2);
    expect(stats.styleHistogram.Anime).toBe(1);
    expect(stats.styleHistogram.Tribal).toBe(0);
    expect(stats.countHistogram).toEqual({ 1: 1, 2: 1 });
    expect(stats.skipped).toEqual({ unparseable: 0, noArtistId: 1, noBio: 2, noStyle: 5, tooManyStyles: 0 });
  });
});

describe('buildArtifact', () => {
  it('stamps provenance and carries the guard rejections for audit', () => {
    const artifact = buildArtifact([{ artistId: 'a1', styles: ['Anime'] }], { styled: 1 }, {
      generatedAt: '2026-07-25T00:00:00.000Z',
      inputDir: '/tmp/profiles',
      guard: true,
      rejected: [{ artistId: 'a2', style: 'Tribal', reason: 'proper-noun-collision' }],
    });

    expect(artifact.source).toBe(SOURCE_NAME);
    expect(artifact.generatedAt).toBe('2026-07-25T00:00:00.000Z');
    expect(artifact.inputDir).toBe('/tmp/profiles');
    expect(artifact.guard).toBe(true);
    expect(artifact.guardRejections).toHaveLength(1);
    expect(artifact.artists).toEqual([{ artistId: 'a1', styles: ['Anime'] }]);
  });
});
