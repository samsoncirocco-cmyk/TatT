/**
 * Style ontology loader + resolver (ADR-0010, ADR-0011).
 *
 * The ontology is the closed, human-curated style vocabulary shared by
 * extraction and the artist graph. It lives at data/style-ontology.json:
 *
 *   { "version": <int>, "updated": "<ISO date>",
 *     "tags": [{ "id": "<kebab-case>", "label": "<Display Name>",
 *                "aliases": ["<lowercase variants>"] }] }
 *
 * Tag ids are the only values extraction may emit; anything not resolvable
 * to a canonical id is rejected (dropped), never invented.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface StyleOntologyTag {
  id: string;
  label: string;
  aliases: string[];
}

export interface StyleOntology {
  version: number;
  updated: string;
  tags: StyleOntologyTag[];
}

/** Pre-computed lookup structures over a loaded ontology. */
export interface OntologyIndex {
  version: number;
  /** Canonical tag ids — the closed vocabulary. */
  canonicalIds: ReadonlySet<string>;
  /** lowercase id | label | alias → canonical id */
  aliasToId: ReadonlyMap<string, string>;
  tags: readonly StyleOntologyTag[];
}

export class OntologyFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OntologyFormatError';
  }
}

/** Validate the raw JSON shape and build lookup indexes. */
export function buildOntologyIndex(raw: unknown): OntologyIndex {
  if (typeof raw !== 'object' || raw === null) {
    throw new OntologyFormatError('Style ontology must be a JSON object');
  }
  const ontology = raw as Partial<StyleOntology>;
  if (typeof ontology.version !== 'number' || !Array.isArray(ontology.tags)) {
    throw new OntologyFormatError(
      'Style ontology must have a numeric "version" and a "tags" array'
    );
  }

  const canonicalIds = new Set<string>();
  const aliasToId = new Map<string, string>();
  const tags: StyleOntologyTag[] = [];

  for (const entry of ontology.tags) {
    if (
      typeof entry !== 'object' || entry === null ||
      typeof (entry as StyleOntologyTag).id !== 'string' ||
      typeof (entry as StyleOntologyTag).label !== 'string'
    ) {
      throw new OntologyFormatError(
        'Every ontology tag needs a string "id" and "label"'
      );
    }
    const tag = entry as StyleOntologyTag;
    const id = tag.id.trim().toLowerCase();
    canonicalIds.add(id);
    aliasToId.set(id, id);
    aliasToId.set(tag.label.trim().toLowerCase(), id);
    for (const alias of Array.isArray(tag.aliases) ? tag.aliases : []) {
      if (typeof alias === 'string' && alias.trim()) {
        aliasToId.set(alias.trim().toLowerCase(), id);
      }
    }
    tags.push({ id, label: tag.label, aliases: tag.aliases ?? [] });
  }

  return { version: ontology.version, canonicalIds, aliasToId, tags };
}

function ontologyPath(): string {
  return (
    process.env.STYLE_ONTOLOGY_PATH ||
    path.join(process.cwd(), 'data', 'style-ontology.json')
  );
}

let cached: { path: string; index: OntologyIndex } | null = null;

/**
 * Load and index the style ontology (cached per path for the process
 * lifetime — the file only changes on deploy, per ADR-0011 growth is
 * human-approved, not runtime).
 */
export async function loadOntology(): Promise<OntologyIndex> {
  const filePath = ontologyPath();
  if (cached && cached.path === filePath) return cached.index;
  const contents = await readFile(filePath, 'utf8');
  const index = buildOntologyIndex(JSON.parse(contents));
  cached = { path: filePath, index };
  return index;
}

/** Test hook: forget the cached ontology so a new path/fixture is re-read. */
export function resetOntologyCache(): void {
  cached = null;
}

/**
 * Resolve one raw tag (id, label, or alias, any casing) to its canonical
 * id, or null when it is not in the closed vocabulary.
 */
export function resolveTag(index: OntologyIndex, raw: string): string | null {
  if (typeof raw !== 'string') return null;
  return index.aliasToId.get(raw.trim().toLowerCase()) ?? null;
}

/**
 * Resolve a list of raw tags to canonical ids: aliases resolved, unknown
 * tags rejected (dropped), duplicates collapsed, ontology order not
 * imposed (input order preserved).
 */
export function resolveTags(index: OntologyIndex, raws: readonly string[]): string[] {
  const resolved: string[] = [];
  for (const raw of raws) {
    const id = resolveTag(index, raw);
    if (id !== null && !resolved.includes(id)) resolved.push(id);
  }
  return resolved;
}
