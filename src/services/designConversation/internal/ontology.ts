/**
 * Closed style-tag validation for the conversation engine (ADR-0010,
 * ADR-0011).
 *
 * The canonical ontology loader lives in the intake module's internals, but
 * intake's public entry exposes only extractIntake — and modules consume
 * each other only via public entries — so the closed-tag validation is
 * replicated here against the same source of truth,
 * data/style-ontology.json. The rule is identical: tag ids are the only
 * values extraction may emit; anything not resolvable to a canonical id
 * (via id, label, or alias, any casing) is dropped, never invented.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface StyleTagIndex {
  /** Canonical tag ids — the closed vocabulary. */
  canonicalIds: ReadonlySet<string>;
  /** lowercase id | label | alias → canonical id */
  aliasToId: ReadonlyMap<string, string>;
}

interface RawOntologyTag {
  id?: unknown;
  label?: unknown;
  aliases?: unknown;
}

function ontologyPath(): string {
  return (
    process.env.STYLE_ONTOLOGY_PATH ||
    path.join(process.cwd(), 'data', 'style-ontology.json')
  );
}

function buildIndex(raw: unknown): StyleTagIndex {
  const tags =
    typeof raw === 'object' && raw !== null && Array.isArray((raw as { tags?: unknown }).tags)
      ? ((raw as { tags: unknown[] }).tags as RawOntologyTag[])
      : [];
  if (tags.length === 0) {
    throw new Error('Style ontology is missing or has no "tags" array');
  }

  const canonicalIds = new Set<string>();
  const aliasToId = new Map<string, string>();
  for (const tag of tags) {
    if (typeof tag?.id !== 'string' || !tag.id.trim()) continue;
    const id = tag.id.trim().toLowerCase();
    canonicalIds.add(id);
    aliasToId.set(id, id);
    if (typeof tag.label === 'string' && tag.label.trim()) {
      aliasToId.set(tag.label.trim().toLowerCase(), id);
    }
    for (const alias of Array.isArray(tag.aliases) ? tag.aliases : []) {
      if (typeof alias === 'string' && alias.trim()) {
        aliasToId.set(alias.trim().toLowerCase(), id);
      }
    }
  }
  return { canonicalIds, aliasToId };
}

let cached: { path: string; index: StyleTagIndex } | null = null;

/**
 * Load and index the style ontology, cached per path for the process
 * lifetime (the file only changes on deploy — growth is human-approved,
 * ADR-0011). Honors STYLE_ONTOLOGY_PATH so tests can point at a fixture.
 */
export async function loadStyleTagIndex(): Promise<StyleTagIndex> {
  const filePath = ontologyPath();
  if (cached && cached.path === filePath) return cached.index;
  const contents = await readFile(filePath, 'utf8');
  const index = buildIndex(JSON.parse(contents));
  cached = { path: filePath, index };
  return index;
}

/** Test hook: forget the cached ontology so a new path/fixture is re-read. */
export function resetStyleTagCache(): void {
  cached = null;
}

/**
 * Resolve raw tags to canonical ids: aliases resolved, unknown tags dropped,
 * duplicates collapsed, input order preserved.
 */
export function resolveStyleTags(
  index: StyleTagIndex,
  raws: readonly unknown[]
): string[] {
  const resolved: string[] = [];
  for (const raw of raws) {
    if (typeof raw !== 'string') continue;
    const id = index.aliasToId.get(raw.trim().toLowerCase());
    if (id && !resolved.includes(id)) resolved.push(id);
  }
  return resolved;
}
