/**
 * Style-ontology shared logic (ADR-0010, ADR-0011).
 *
 * The ontology (data/style-ontology.json) is the closed style vocabulary:
 * matching runs on tag ids, so nothing enters it without human approval.
 * Unrecognized terms harvested by scrapes go to the proposal queue
 * (data/ontology-proposals.json) and only move into the ontology via the
 * propose-ontology-candidates CLI (--approve / --merge), run by a human.
 *
 * Everything here is pure (no I/O) except the two small JSON file helpers.
 */

import { readFileSync, writeFileSync } from 'fs';

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a raw style term to a canonical kebab-case id form.
 * "Neo-Traditional" -> "neo-traditional", "neoTraditional" -> "neo-traditional",
 * "Black & Grey" -> "black-and-grey", "Japanese (Irezumi)" -> "japanese-irezumi".
 * Returns '' for junk input (caller skips).
 */
export function normalizeTerm(term) {
  if (typeof term !== 'string') return '';
  return term
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // split camelCase keys
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Display label from a raw term: "old school" -> "Old School". */
export function titleCase(term) {
  return String(term)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Ontology lookup
// ---------------------------------------------------------------------------

/**
 * Build a Map of normalized form -> tag id covering every tag id and alias.
 * Throws if the ontology is malformed (non-canonical id, or two tags
 * claiming the same normalized form) — fail fast on data corruption.
 */
export function buildLookup(ontology) {
  const map = new Map();
  for (const tag of ontology.tags) {
    if (tag.id !== normalizeTerm(tag.id)) {
      throw new Error(`Ontology tag id "${tag.id}" is not canonical kebab-case`);
    }
    for (const form of [tag.id, ...(tag.aliases || []).map(normalizeTerm)]) {
      if (!form) continue;
      const owner = map.get(form);
      if (owner && owner !== tag.id) {
        throw new Error(`Ontology conflict: "${form}" is claimed by both "${owner}" and "${tag.id}"`);
      }
      map.set(form, tag.id);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Candidate harvesting helpers
// ---------------------------------------------------------------------------

/**
 * Dedupe raw terms from one or more sources by normalized form.
 * `sources` is [{ source, terms }]; returns [{ term, normalized, source, count }]
 * where `term`/`source` are first-seen and `count` totals occurrences.
 */
export function collectCandidates(sources) {
  const byNorm = new Map();
  for (const { source, terms } of sources) {
    for (const term of terms) {
      const normalized = normalizeTerm(term);
      if (!normalized) continue;
      const existing = byNorm.get(normalized);
      if (existing) {
        existing.count += 1;
      } else {
        byNorm.set(normalized, { term: String(term).trim(), normalized, source, count: 1 });
      }
    }
  }
  return [...byNorm.values()];
}

/**
 * Fold harvested candidates into the proposal queue. Candidates already in
 * the ontology (by id or alias) are dropped; candidates already queued keep
 * their status (a rejected term never re-pends) with count refreshed; new
 * unknowns enter as status "pending". Never touches the ontology (ADR-0011).
 */
export function updateProposals(proposals, candidates, lookup) {
  const next = proposals.map((p) => ({ ...p }));
  const byNorm = new Map(next.map((p) => [p.normalized, p]));
  for (const cand of candidates) {
    if (lookup.has(cand.normalized)) continue;
    const existing = byNorm.get(cand.normalized);
    if (existing) {
      existing.count = cand.count;
    } else {
      const entry = { ...cand, status: 'pending' };
      next.push(entry);
      byNorm.set(entry.normalized, entry);
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// Queue operations (human-driven; each returns new objects, never mutates)
// ---------------------------------------------------------------------------

function findProposal(proposals, term) {
  const normalized = normalizeTerm(term);
  const proposal = proposals.find((p) => p.normalized === normalized);
  if (!proposal) {
    throw new Error(`"${term}" is not in the proposal queue (run extract-style-ontology.mjs first)`);
  }
  if (proposal.status !== 'pending') {
    throw new Error(`"${term}" is not pending (status: ${proposal.status})`);
  }
  return proposal;
}

function setStatus(proposals, normalized, status) {
  return proposals.map((p) => (p.normalized === normalized ? { ...p, status } : p));
}

function bumpOntology(ontology, tags, today) {
  return {
    ...ontology,
    version: ontology.version + 1,
    updated: today,
    tags: [...tags].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

/** Approve a pending proposal: it becomes a new tag with id = its normalized form. */
export function approveTerm(ontology, proposals, term, today) {
  const proposal = findProposal(proposals, term);
  const lookup = buildLookup(ontology);
  if (lookup.has(proposal.normalized)) {
    throw new Error(`"${proposal.normalized}" already resolves to tag "${lookup.get(proposal.normalized)}"`);
  }
  const tag = { id: proposal.normalized, label: titleCase(proposal.term), aliases: [] };
  return {
    ontology: bumpOntology(ontology, [...ontology.tags, tag], today),
    proposals: setStatus(proposals, proposal.normalized, 'approved'),
    tag,
  };
}

/** Merge a pending proposal into an existing tag as an alias. */
export function mergeTerm(ontology, proposals, term, intoId, today) {
  const proposal = findProposal(proposals, term);
  const target = ontology.tags.find((t) => t.id === intoId);
  if (!target) {
    throw new Error(`No ontology tag with id "${intoId}"`);
  }
  const lookup = buildLookup(ontology);
  const owner = lookup.get(proposal.normalized);
  if (owner && owner !== intoId) {
    throw new Error(`"${proposal.normalized}" already resolves to tag "${owner}", not "${intoId}"`);
  }
  const alias = proposal.term.toLowerCase();
  const aliases = target.aliases.includes(alias) ? target.aliases : [...target.aliases, alias];
  const tags = ontology.tags.map((t) => (t.id === intoId ? { ...t, aliases } : t));
  return {
    ontology: bumpOntology(ontology, tags, today),
    proposals: setStatus(proposals, proposal.normalized, 'merged'),
  };
}

/** Reject a pending proposal. It stays in the queue so re-harvests never re-pend it. */
export function rejectTerm(proposals, term) {
  const proposal = findProposal(proposals, term);
  return { proposals: setStatus(proposals, proposal.normalized, 'rejected') };
}

// ---------------------------------------------------------------------------
// JSON file helpers (the only I/O in this module)
// ---------------------------------------------------------------------------

export function loadJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw err;
  }
}

export function saveJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
