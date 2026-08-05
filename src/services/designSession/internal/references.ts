/**
 * Reference-image entries on a design session (TAT-50).
 *
 * A vision analysis becomes a StoredReference on the session's conversation
 * state, and its signals merge into the working intake record. The merge is
 * deliberately re-applied after EVERY engine turn (the engine overwrites
 * conversation.record wholesale each turn) and again at confirm — a
 * reference the user sent must never silently fall out of the brief.
 *
 * IP rule (TAT-47 defect-5 parity): characters the vision model recognized
 * route through the SAME machinery as text mentions — the character
 * database's costume anchors win when they match, the model's own naming
 * fills in when the database has no entry — so an image of Yusuke gets the
 * exact inspired-by handling a text "Yusuke" does.
 */
import { randomUUID } from 'crypto';
import type { ReferenceAnalysis } from '@/services/vision';
import type { IntakeRecord } from '../../intake/types';
import {
  charactersIn,
  subjectPhraseFor,
} from '../../intake/internal/characterSubject';
import {
  loadStyleTagIndex,
  resolveStyleTags,
} from '../../designConversation/internal/ontology';

/** Bound on stored references per session — a brief, not a photo album. */
export const MAX_SESSION_REFERENCES = 6;

/** One analyzed reference image, persisted on the conversation state. */
export interface StoredReference {
  id: string;
  /** Which channel the image arrived on. */
  source: 'sms' | 'web';
  /** The user-visible one-liner (notepad row, Brief reference). */
  summary: string;
  subjects: string[];
  characters: { name: string; series?: string }[];
  /** Closed ontology tags resolved from the style descriptors. */
  styleTags: string[];
  /** The model's raw style vocabulary, kept for the summary/Brief. */
  styleDescriptors: string[];
  palette: string[];
  composition: string;
  confidence: number;
  createdAt: string;
  /**
   * PRIVATE GCS object path of the stored photo (ADR-0050 — the photo
   * reaches the image model as pixels, not just as this analysis). A path,
   * never a URL: the object is private, and a fetchable signed URL is
   * minted per render. Optional — references attached before this field
   * existed, or whose upload failed, carry analysis only.
   */
  imagePath?: string;
}

/**
 * Resolve free vision vocabulary against the closed ontology: each
 * descriptor is tried whole ("black and grey"), then word-by-word ("chibi
 * anime style" → anime). Unknown vocabulary drops from the tags — it still
 * reaches the artist verbatim inside the reference summary line.
 */
async function resolveDescriptorTags(analysis: ReferenceAnalysis): Promise<string[]> {
  const index = await loadStyleTagIndex();
  const candidates = [...analysis.styleDescriptors, ...analysis.subjects];
  const expanded = candidates.flatMap((raw) => [raw, ...raw.split(/[\s/,-]+/)]);
  return resolveStyleTags(index, expanded);
}

/** Build the persistable entry from a vision analysis. */
export async function buildStoredReference(
  analysis: ReferenceAnalysis,
  source: StoredReference['source'],
  imagePath?: string
): Promise<StoredReference> {
  return {
    id: randomUUID(),
    source,
    summary: analysis.summary,
    subjects: analysis.subjects,
    characters: analysis.characters,
    styleTags: await resolveDescriptorTags(analysis),
    styleDescriptors: analysis.styleDescriptors,
    palette: analysis.palette,
    composition: analysis.composition,
    confidence: analysis.confidence,
    createdAt: new Date().toISOString(),
    ...(imagePath ? { imagePath } : {}),
  };
}

/**
 * The stored photo paths across a session's references, oldest-first —
 * what feeds the render as `referenceImages` once each path is signed.
 * MAX_SESSION_REFERENCES (6) matches the provider's image_input cap, so
 * this list never truncates at the model.
 */
export function referenceImagePaths(references: StoredReference[]): string[] {
  return references
    .map((reference) => reference.imagePath)
    .filter((path): path is string => Boolean(path));
}

/** The Brief-facing reference line for one entry. */
export function referenceLine(reference: StoredReference): string {
  return `reference image: ${reference.summary}`;
}

/** All character mentions across the references, as scannable text. */
function characterText(references: StoredReference[]): string {
  return references
    .flatMap((ref) => ref.characters.map((c) => `${c.name} ${c.series ?? ''}`))
    .join(', ');
}

/**
 * The prompt-facing subject the references contribute: database costume
 * anchors when the recognized characters match (identical to a text
 * mention), the vision model's own naming otherwise.
 */
export function subjectFromReferences(references: StoredReference[]): string | undefined {
  const matches = charactersIn(characterText(references));
  const dbPhrase = subjectPhraseFor(matches);
  if (dbPhrase) return dbPhrase;
  const named = references.flatMap((ref) =>
    ref.characters.map((c) => (c.series ? `${c.name} (${c.series})` : c.name))
  );
  return named.length > 0 ? [...new Set(named)].join(', ') : undefined;
}

/**
 * Notepad cast labels contributed by the references — the database's short
 * labels when matched, the model's naming otherwise. Used only when the
 * engine's own cast list is empty.
 */
export function referenceCastLabels(references: StoredReference[]): string[] {
  const matches = charactersIn(characterText(references));
  if (matches.length > 0) {
    // One entry per member, same shape the notepad's own cast rows use.
    return matches.map(
      (m) => `${m.name.replace(/\b[a-z]/g, (c) => c.toUpperCase())} (${m.series})`
    );
  }
  return [
    ...new Set(
      references.flatMap((ref) =>
        ref.characters.map((c) => (c.series ? `${c.name} (${c.series})` : c.name))
      )
    ),
  ];
}

/**
 * Merge the references' signals into a working record: style tags union,
 * one Brief reference line per image, subject backfill from recognized
 * characters (never overwriting a subject the conversation already carries),
 * and the IP axis lock — a named subject never renders abstract (ADR-0023).
 */
export function applyReferenceSignals(
  record: Partial<IntakeRecord>,
  references: StoredReference[]
): Partial<IntakeRecord> {
  if (references.length === 0) return record;

  const merged: Partial<IntakeRecord> = { ...record };

  const tagUnion = [
    ...(record.styleTags ?? []),
    ...references.flatMap((ref) => ref.styleTags),
  ];
  merged.styleTags = [...new Set(tagUnion)];

  const lines = references.map(referenceLine);
  merged.references = [...new Set([...(record.references ?? []), ...lines])];

  if (!(merged.subject ?? '').trim()) {
    const subject = subjectFromReferences(references);
    if (subject) merged.subject = subject;
  }
  if ((merged.subject ?? '').trim()) {
    merged.ambiguousAxes = (merged.ambiguousAxes ?? []).filter(
      (axis) => axis !== 'literal-abstract'
    );
  }

  return merged;
}
