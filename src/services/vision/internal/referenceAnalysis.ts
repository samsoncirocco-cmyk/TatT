/**
 * Reference-image analysis (TAT-50) — ONE Vertex Gemini multimodal call
 * that reads a reference image the way a tattoo consultant would: subjects,
 * recognizable characters (the IP rule's input), style descriptors,
 * palette, and composition, plus a single user-visible summary line.
 *
 * Spend guardrails (REQUIRED): every call goes through checkBudget first
 * and records VISION_ANALYSIS_COST_CENTS on success — the same global pool
 * as image renders and conversation turns. Budget exhaustion is its own
 * outcome so channels can say so honestly, in voice.
 *
 * Fail-soft by contract: any provider or parse failure returns
 * { status: 'failed' } — never a throw. The bot owns the apology sentence.
 *
 * Demo mode (NEXT_PUBLIC_DEMO_MODE) returns a canned analysis with no model
 * call, matching the repo-wide pattern of demo running real code paths on
 * free substitutes.
 */

import { logger } from '@/lib/logger';
import { getGcpAccessToken } from '@/lib/google-auth-edge';
import { buildVertexEndpoint } from '@/lib/vertex-endpoint';
import {
  checkBudget,
  recordSpend,
  VISION_ANALYSIS_COST_CENTS,
} from '@/lib/budget-tracker';
import type {
  ReferenceAnalysis,
  ReferenceAnalysisOutcome,
  ReferenceCharacter,
  ReferenceImage,
} from '../types';

/** Image types Gemini accepts that we pass through (GIF = first frame). */
export const ANALYZABLE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Per-image size cap — matches the MMS media ceiling carriers enforce. */
export const MAX_REFERENCE_IMAGE_BYTES = 5 * 1024 * 1024;

/** Reference images analyzed per message/upload batch. */
export const MAX_REFERENCE_IMAGES_PER_MESSAGE = 3;

/**
 * Reference-image reader (TAT-56).
 *
 * Same model SketchBot converses with (gemini-3.1-flash-lite) — it reads
 * images natively, so the pipeline no longer runs a second, pricier model
 * just to look at what the customer sent. Kept as its own constant because
 * VISION_MODEL must stay independently overridable when a reference batch
 * needs a stronger reader than the conversation does.
 */
export const DEFAULT_VISION_MODEL = 'gemini-3.1-flash-lite';

function visionModel(): string {
  return process.env.VISION_MODEL || DEFAULT_VISION_MODEL;
}

function vertexProjectId(): string | null {
  return (
    process.env.NEXT_PUBLIC_VERTEX_AI_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.VERTEX_PROJECT_ID ||
    null
  );
}

function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * The analysis prompt. Tattoo-reference specific on purpose: a generic
 * caption ("a picture of some cartoon characters") is useless to the
 * intake record; the fields below mirror what the record can carry.
 */
/**
 * Exported so measurement harnesses can score generated designs with the
 * SAME question production asks of reference photos ("which recognizable
 * characters are actually in this image, never guess"). A second prompt
 * written for the harness would drift from the one that ships.
 */
export const ANALYSIS_PROMPT = `You are analyzing a reference image a client sent to a tattoo design consultant. Describe it as tattoo-brief signal, not a generic caption.

Respond with ONLY a JSON object:
{
  "summary": "one short line naming what you see, glanceable (e.g. 'five chibi anime characters, bold outlines, red smoke background')",
  "subjects": ["concrete visual subjects depicted"],
  "characters": [{"name": "character name", "series": "franchise/series"}],
  "styleDescriptors": ["visual style words: e.g. chibi, cel shading, bold outlines, fine line, watercolor, traditional, realism"],
  "palette": ["dominant colors, plain words"],
  "composition": "one short note on how the image is composed",
  "confidence": 0.0
}

Rules:
- "characters" lists ONLY specific, recognizable (possibly copyrighted) characters you can actually identify — never guesses. Empty array when none.
- "styleDescriptors" describe the IMAGE's rendering style in tattoo vocabulary where it applies.
- "confidence" is your 0-1 confidence in this overall reading.
- No prose outside the JSON.`;

/* ──────────────────────────────────────────────────────────────────────────
 * Response sanitization — the model's JSON is a suggestion, the contract
 * is enforced here (bounded strings, arrays of strings, clamped confidence).
 * ────────────────────────────────────────────────────────────────────────── */

const SUMMARY_MAX = 160;
const LIST_MAX = 8;
const ITEM_MAX = 60;
const COMPOSITION_MAX = 140;

function asBoundedString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().slice(0, ITEM_MAX))
    .slice(0, LIST_MAX);
}

function asCharacters(value: unknown): ReferenceCharacter[] {
  if (!Array.isArray(value)) return [];
  const characters: ReferenceCharacter[] = [];
  for (const entry of value.slice(0, LIST_MAX)) {
    if (typeof entry === 'string' && entry.trim()) {
      characters.push({ name: entry.trim().slice(0, ITEM_MAX) });
      continue;
    }
    if (entry && typeof entry === 'object') {
      const name = asBoundedString((entry as { name?: unknown }).name, ITEM_MAX);
      if (!name) continue;
      const series = asBoundedString((entry as { series?: unknown }).series, ITEM_MAX);
      characters.push({ name, ...(series ? { series } : {}) });
    }
  }
  return characters;
}

export function sanitizeAnalysis(raw: unknown): ReferenceAnalysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const summary = asBoundedString(data.summary, SUMMARY_MAX);
  // A reading without a summary is unusable everywhere the analysis goes
  // (the notepad row, the ack, the Brief reference) — treat it as a failure.
  if (!summary) return null;
  const confidence =
    typeof data.confidence === 'number' && Number.isFinite(data.confidence)
      ? Math.min(1, Math.max(0, data.confidence))
      : 0;
  return {
    summary,
    subjects: asStringList(data.subjects),
    characters: asCharacters(data.characters),
    styleDescriptors: asStringList(data.styleDescriptors),
    palette: asStringList(data.palette),
    composition: asBoundedString(data.composition, COMPOSITION_MAX),
    confidence,
  };
}

function parseJsonFromText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    /* fall through to brace scan (models occasionally wrap the JSON) */
  }
  const first = text.indexOf('{');
  if (first === -1) return null;
  let depth = 0;
  for (let i = first; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') depth -= 1;
    if (depth === 0) {
      try {
        return JSON.parse(text.slice(first, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Deterministic demo-mode analysis — free, no model call. */
const DEMO_ANALYSIS: ReferenceAnalysis = {
  summary: 'a bold traditional rose with black linework and a red bloom',
  subjects: ['rose'],
  characters: [],
  styleDescriptors: ['traditional', 'bold outlines'],
  palette: ['red', 'black'],
  composition: 'single centered emblem',
  confidence: 0.9,
};

/* ──────────────────────────────────────────────────────────────────────────
 * The call
 * ────────────────────────────────────────────────────────────────────────── */

async function callVertexVision(image: ReferenceImage): Promise<unknown> {
  const projectId = vertexProjectId();
  const model = visionModel();
  const accessToken = await getGcpAccessToken();
  const endpoint = buildVertexEndpoint(projectId, model);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: image.mimeType, data: image.data } },
            { text: ANALYSIS_PROMPT },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini vision error: ${response.status} - ${await response.text()}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' ? parseJsonFromText(text) : null;
}

/**
 * Analyze one reference image. Budget-gated (checkBudget before the call,
 * VISION_ANALYSIS_COST_CENTS recorded after a successful one), fail-soft
 * ('failed', never a throw), demo-mode free.
 */
export async function analyzeReferenceImage(
  image: ReferenceImage
): Promise<ReferenceAnalysisOutcome> {
  if (!ANALYZABLE_IMAGE_TYPES.has(image.mimeType)) return { status: 'failed' };

  if (isDemoMode()) return { status: 'analyzed', analysis: DEMO_ANALYSIS };

  // Guardrail: vision spends from the same global pool as everything else.
  const budget = await checkBudget();
  if (!budget.allowed) {
    logger.warn({
      event_type: 'vision.reference_analysis.budget_exhausted',
      spent_cents: budget.spentCents,
    });
    return { status: 'budget_exhausted' };
  }

  try {
    const raw = await callVertexVision(image);
    const analysis = sanitizeAnalysis(raw);
    if (!analysis) {
      logger.warn({ event_type: 'vision.reference_analysis.unparseable' });
      return { status: 'failed' };
    }
    await recordSpend(VISION_ANALYSIS_COST_CENTS);
    logger.info({
      event_type: 'vision.reference_analysis.analyzed',
      characters: analysis.characters.length,
      style_descriptors: analysis.styleDescriptors.length,
      confidence: analysis.confidence,
    });
    return { status: 'analyzed', analysis };
  } catch (error) {
    logger.warn({
      event_type: 'vision.reference_analysis.failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 'failed' };
  }
}
