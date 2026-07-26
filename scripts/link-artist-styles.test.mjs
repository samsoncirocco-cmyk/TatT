import { describe, expect, it } from 'vitest';
import {
  parseArgs,
  recordsFromArtifact,
  buildPlanProbe,
  buildStyleProbe,
  buildCoverageProbe,
  buildStyleLinkWrite,
  summarizePlan,
  chunk,
} from './link-artist-styles.mjs';

describe('parseArgs — the dry-run default', () => {
  // This is the load-bearing safety property of the script: writing to the
  // live match graph must never be something you get by forgetting a flag.
  it('defaults execute to false', () => {
    expect(parseArgs([]).execute).toBe(false);
    expect(parseArgs(['--input', 'a.json']).execute).toBe(false);
    expect(parseArgs(['--input', 'a.json', '--limit', '10', '--source', 'x']).execute).toBe(false);
  });

  it('only turns writing on for the exact --execute flag', () => {
    expect(parseArgs(['--execute']).execute).toBe(true);
    expect(parseArgs(['--Execute']).execute).toBe(false);
    expect(parseArgs(['--exec']).execute).toBe(false);
    expect(parseArgs(['--dry-run']).execute).toBe(false);
    expect(parseArgs(['--execute=true']).execute).toBe(false);
  });

  it('parses the remaining flags with sane defaults', () => {
    const opts = parseArgs(['--input', 'a.json', '--limit', '5', '--source', 'ig', '--batch-size', '50', '--sample', '3']);
    expect(opts).toMatchObject({ input: 'a.json', limit: 5, source: 'ig', batchSize: 50, sample: 3 });

    const defaults = parseArgs(['--input', 'a.json']);
    expect(defaults.limit).toBe(Infinity);
    expect(defaults.source).toBe('instagram-bio');
    expect(defaults.batchSize).toBe(500);
    expect(defaults.sample).toBe(15);
  });
});

describe('recordsFromArtifact', () => {
  it('reads harvest-ig-styles output and filters unusable rows', () => {
    const artifact = {
      source: 'instagram-bio',
      artists: [
        { artistId: 'artist_a', styles: ['Fine Line', 'Realism'], bio: '…' },
        { artistId: 'artist_b', styles: ['Steampunk'] },     // off-vocabulary → dropped
        { artistId: '../evil', styles: ['Realism'] },        // unsafe id → dropped
        { styles: ['Realism'] },                             // no id → dropped
      ],
    };
    expect(recordsFromArtifact(artifact)).toEqual([{ artistId: 'artist_a', styles: ['Fine Line', 'Realism'] }]);
  });

  it('tolerates a bare array and rejects anything else', () => {
    expect(recordsFromArtifact([{ artistId: 'artist_a', styles: ['Anime'] }])).toEqual([
      { artistId: 'artist_a', styles: ['Anime'] },
    ]);
    expect(recordsFromArtifact({})).toEqual([]);
    expect(recordsFromArtifact(null)).toEqual([]);
  });
});

describe('buildStyleLinkWrite — the idempotency guarantee', () => {
  const pairs = [{ artistId: 'artist_a', style: 'Fine Line' }];

  it('MERGEs both the Style node and the edge, and never CREATEs', () => {
    const { query } = buildStyleLinkWrite(pairs, 'instagram-bio', 1784586910000);
    expect(query).toContain('MERGE (s:Style {name: row.style})');
    expect(query).toContain('MERGE (a)-[rel:SPECIALIZES_IN]->(s)');
    // A bare CREATE anywhere would break re-run safety by duplicating edges.
    expect(query).not.toMatch(/\bCREATE\s*\(/);
  });

  it('MATCHes the artist rather than MERGEing it, so it never invents an Artist', () => {
    const { query } = buildStyleLinkWrite(pairs, 'instagram-bio', 1);
    expect(query).toContain('MATCH (a:Artist {id: row.artistId})');
    expect(query).not.toContain('MERGE (a:Artist');
  });

  it('stamps provenance with ON CREATE SET, so a re-run relabels nothing', () => {
    const { query } = buildStyleLinkWrite(pairs, 'instagram-bio', 1);
    expect(query).toContain('ON CREATE SET rel.source = $source, rel.createdAt = $createdAt');
    // A plain SET would overwrite provenance on edges seeded by import-to-neo4j.
    expect(query).not.toMatch(/\n\s*SET rel\./);
  });

  it('passes every value as a parameter — nothing is interpolated into Cypher', () => {
    const { query, params } = buildStyleLinkWrite(pairs, 'instagram-bio', 1784586910000);
    expect(params).toEqual({ rows: pairs, source: 'instagram-bio', createdAt: 1784586910000 });
    expect(query).not.toContain('artist_a');
    expect(query).not.toContain('Fine Line');
    expect(query).not.toContain('1784586910000');
  });

  it('is deterministic — identical input yields an identical statement', () => {
    const a = buildStyleLinkWrite(pairs, 'instagram-bio', 7);
    const b = buildStyleLinkWrite(pairs, 'instagram-bio', 7);
    expect(a).toEqual(b);
  });
});

describe('probe queries are read-only', () => {
  it('never contain a mutating clause', () => {
    const mutating = /\b(CREATE|MERGE|SET|DELETE|REMOVE|DETACH)\b/;
    expect(buildPlanProbe([{ artistId: 'a', style: 'Anime' }]).query).not.toMatch(mutating);
    expect(buildStyleProbe(['Anime']).query).not.toMatch(mutating);
    expect(buildCoverageProbe().query).not.toMatch(mutating);
  });

  it('reports artist existence and edge existence per pair', () => {
    const { query, params } = buildPlanProbe([{ artistId: 'artist_a', style: 'Anime' }]);
    expect(query).toContain('OPTIONAL MATCH (a:Artist {id: row.artistId})');
    expect(query).toContain('OPTIONAL MATCH (a)-[rel:SPECIALIZES_IN]->(:Style {name: row.style})');
    expect(query).toContain('a IS NOT NULL AS artistExists');
    expect(query).toContain('rel IS NOT NULL AS linkExists');
    expect(params).toEqual({ rows: [{ artistId: 'artist_a', style: 'Anime' }] });
  });
});

describe('summarizePlan', () => {
  it('separates missing artists, existing edges and edges to create', () => {
    const plan = summarizePlan([
      { artistId: 'artist_a', style: 'Anime', artistExists: true, linkExists: false },
      { artistId: 'artist_a', style: 'Realism', artistExists: true, linkExists: true },
      { artistId: 'artist_b', style: 'Script', artistExists: true, linkExists: false },
      { artistId: 'artist_ghost', style: 'Anime', artistExists: false, linkExists: false },
    ]);

    expect(plan.pairs).toBe(4);
    expect(plan.matchedArtists).toBe(2);
    expect(plan.missingArtists).toEqual(['artist_ghost']);
    expect(plan.alreadyLinked).toBe(1);
    expect(plan.toCreate).toEqual([
      { artistId: 'artist_a', style: 'Anime' },
      { artistId: 'artist_b', style: 'Script' },
    ]);
    expect(plan.gainingArtists).toBe(2);
    expect(plan.createdByStyle).toEqual({ Anime: 1, Script: 1 });
  });

  it('plans zero work once every edge already exists (the second-run case)', () => {
    const plan = summarizePlan([
      { artistId: 'artist_a', style: 'Anime', artistExists: true, linkExists: true },
      { artistId: 'artist_a', style: 'Realism', artistExists: true, linkExists: true },
    ]);
    expect(plan.toCreate).toEqual([]);
    expect(plan.gainingArtists).toBe(0);
    expect(plan.alreadyLinked).toBe(2);
  });

  it('never counts a pair on a missing artist as creatable', () => {
    const plan = summarizePlan([{ artistId: 'gone', style: 'Anime', artistExists: false, linkExists: false }]);
    expect(plan.toCreate).toEqual([]);
    expect(plan.matchedArtists).toBe(0);
  });
});

describe('chunk', () => {
  it('splits rows into fixed-size batches, remainder last', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
    expect(chunk([1], 500)).toEqual([[1]]);
  });
});
