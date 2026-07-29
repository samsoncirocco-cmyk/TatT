import { describe, expect, it } from 'vitest';
import {
  approveTerm,
  buildLookup,
  collectCandidates,
  mergeTerm,
  normalizeTerm,
  rejectTerm,
  titleCase,
  updateProposals,
} from './ontology.mjs';

const ontology = {
  version: 1,
  updated: '2026-07-23',
  tags: [
    { id: 'fine-line', label: 'Fine Line', aliases: ['fine line', 'fineline'] },
    { id: 'black-and-grey', label: 'Black & Grey', aliases: ['black & grey', 'black and gray'] },
    { id: 'traditional', label: 'Traditional', aliases: [] },
  ],
};

describe('normalizeTerm', () => {
  it('kebab-cases plain and multiword terms', () => {
    expect(normalizeTerm('Traditional')).toBe('traditional');
    expect(normalizeTerm('  Fine Line ')).toBe('fine-line');
    expect(normalizeTerm('New School')).toBe('new-school');
  });

  it('splits camelCase config keys', () => {
    expect(normalizeTerm('neoTraditional')).toBe('neo-traditional');
    expect(normalizeTerm('newSchool')).toBe('new-school');
  });

  it('expands ampersands and strips punctuation', () => {
    expect(normalizeTerm('Black & Grey')).toBe('black-and-grey');
    expect(normalizeTerm('Japanese (Irezumi)')).toBe('japanese-irezumi');
  });

  it('returns empty string for junk (caller skips)', () => {
    expect(normalizeTerm('')).toBe('');
    expect(normalizeTerm('   ')).toBe('');
    expect(normalizeTerm(null)).toBe('');
    expect(normalizeTerm(42)).toBe('');
  });
});

describe('titleCase', () => {
  it('builds a display label from a raw term', () => {
    expect(titleCase('old school')).toBe('Old School');
    expect(titleCase('CHICANO')).toBe('Chicano');
  });
});

describe('buildLookup', () => {
  it('maps ids and normalized aliases to their tag id', () => {
    const lookup = buildLookup(ontology);
    expect(lookup.get('fine-line')).toBe('fine-line');
    expect(lookup.get('fineline')).toBe('fine-line');
    expect(lookup.get('black-and-gray')).toBe('black-and-grey');
    expect(lookup.has('trash-polka')).toBe(false);
  });

  it('throws when two tags claim the same normalized form', () => {
    const broken = {
      tags: [
        { id: 'fine-line', label: 'Fine Line', aliases: [] },
        { id: 'single-needle', label: 'Single Needle', aliases: ['fine line'] },
      ],
    };
    expect(() => buildLookup(broken)).toThrow(/claimed by both/);
  });

  it('throws on a non-canonical tag id', () => {
    const broken = { tags: [{ id: 'Fine Line', label: 'Fine Line', aliases: [] }] };
    expect(() => buildLookup(broken)).toThrow(/not canonical/);
  });
});

describe('collectCandidates', () => {
  it('dedupes across sources by normalized form, keeping first term/source and counting', () => {
    const candidates = collectCandidates([
      { source: 'neo4j', terms: ['Fine Line', 'Trash Polka'] },
      { source: 'repo:x.js', terms: ['fineline', 'trash polka', ''] },
    ]);
    expect(candidates).toEqual([
      { term: 'Fine Line', normalized: 'fine-line', source: 'neo4j', count: 1 },
      { term: 'Trash Polka', normalized: 'trash-polka', source: 'neo4j', count: 2 },
      { term: 'fineline', normalized: 'fineline', source: 'repo:x.js', count: 1 },
    ]);
  });
});

describe('updateProposals', () => {
  const lookup = buildLookup(ontology);

  it('drops known terms and queues unknowns as pending — never touches the ontology', () => {
    const candidates = collectCandidates([
      { source: 'neo4j', terms: ['Fine Line', 'Trash Polka'] },
    ]);
    const next = updateProposals([], candidates, lookup);
    expect(next).toEqual([
      { term: 'Trash Polka', normalized: 'trash-polka', source: 'neo4j', count: 1, status: 'pending' },
    ]);
  });

  it('refreshes count on an existing entry without resetting its status', () => {
    const existing = [
      { term: 'Trash Polka', normalized: 'trash-polka', source: 'neo4j', count: 1, status: 'rejected' },
    ];
    const candidates = collectCandidates([
      { source: 'neo4j', terms: ['Trash Polka'] },
      { source: 'repo:x.js', terms: ['trash polka'] },
    ]);
    const next = updateProposals(existing, candidates, lookup);
    expect(next).toHaveLength(1);
    expect(next[0].status).toBe('rejected');
    expect(next[0].count).toBe(2);
    // Immutable: the input entry was not mutated.
    expect(existing[0].count).toBe(1);
  });
});

describe('queue operations', () => {
  const proposals = [
    { term: 'Trash Polka', normalized: 'trash-polka', source: 'neo4j', count: 3, status: 'pending' },
    { term: 'fineline', normalized: 'fineline', source: 'neo4j', count: 1, status: 'pending' },
  ];

  it('approveTerm promotes a pending proposal to a new tag and bumps the ontology', () => {
    const result = approveTerm(ontology, proposals, 'trash polka', '2026-07-24');
    expect(result.tag).toEqual({ id: 'trash-polka', label: 'Trash Polka', aliases: [] });
    expect(result.ontology.version).toBe(2);
    expect(result.ontology.updated).toBe('2026-07-24');
    expect(result.ontology.tags.map((t) => t.id)).toContain('trash-polka');
    expect(result.proposals.find((p) => p.normalized === 'trash-polka').status).toBe('approved');
    // Inputs untouched.
    expect(ontology.version).toBe(1);
    expect(proposals[0].status).toBe('pending');
  });

  it('approveTerm rejects terms that are not queued or not pending', () => {
    expect(() => approveTerm(ontology, proposals, 'unheard-of', '2026-07-24')).toThrow(/not in the proposal queue/);
    const rejected = [{ ...proposals[0], status: 'rejected' }];
    expect(() => approveTerm(ontology, rejected, 'trash polka', '2026-07-24')).toThrow(/not pending/);
  });

  it('mergeTerm adds the term as an alias of an existing tag', () => {
    const result = mergeTerm(ontology, proposals, 'fineline', 'fine-line', '2026-07-24');
    const tag = result.ontology.tags.find((t) => t.id === 'fine-line');
    // Already covered by an existing alias — no duplicate added.
    expect(tag.aliases.filter((a) => a === 'fineline')).toHaveLength(1);
    expect(result.ontology.version).toBe(2);
    expect(result.proposals.find((p) => p.normalized === 'fineline').status).toBe('merged');
  });

  it('mergeTerm fails on a missing target or a term owned by another tag', () => {
    expect(() => mergeTerm(ontology, proposals, 'fineline', 'nope', '2026-07-24')).toThrow(/No ontology tag/);
    expect(() => mergeTerm(ontology, proposals, 'fineline', 'traditional', '2026-07-24')).toThrow(/already resolves to tag "fine-line"/);
  });

  it('rejectTerm marks a pending proposal rejected', () => {
    const result = rejectTerm(proposals, 'Trash Polka');
    expect(result.proposals.find((p) => p.normalized === 'trash-polka').status).toBe('rejected');
    expect(proposals[0].status).toBe('pending');
  });
});
