import { describe, expect, it } from 'vitest';
import { harvestRepoSources } from './extract-style-ontology.mjs';
import { buildLookup, collectCandidates, loadJson, normalizeTerm } from './lib/ontology.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Repo-source harvest only — no Neo4j, no network.
describe('harvestRepoSources', () => {
  it('harvests model-routing terms without treating a generator as vocabulary', () => {
    const sources = harvestRepoSources();
    expect(sources).toHaveLength(1);
    const [mapping] = sources;
    expect(mapping.terms).toContain('neoTraditional');
    expect(mapping.terms).not.toContain('default');
  });

  it('every harvested repo term is covered by the seed ontology', () => {
    const ontology = loadJson(path.join(ROOT, 'data', 'style-ontology.json'));
    const lookup = buildLookup(ontology);
    const candidates = collectCandidates(harvestRepoSources());
    const unknown = candidates.filter((c) => !lookup.has(c.normalized));
    expect(unknown).toEqual([]);
  });
});

describe('seed ontology contract', () => {
  it('matches the shared JSON shape (ADR-0010): version, updated, canonical tags', () => {
    const ontology = loadJson(path.join(ROOT, 'data', 'style-ontology.json'));
    expect(Number.isInteger(ontology.version)).toBe(true);
    expect(ontology.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ontology.tags.length).toBeGreaterThan(0);
    for (const tag of ontology.tags) {
      expect(tag.id).toBe(normalizeTerm(tag.id));
      expect(typeof tag.label).toBe('string');
      expect(Array.isArray(tag.aliases)).toBe(true);
      for (const alias of tag.aliases) {
        expect(alias).toBe(alias.toLowerCase());
      }
    }
    // buildLookup throws if any two tags claim the same normalized form.
    expect(() => buildLookup(ontology)).not.toThrow();
  });
});
