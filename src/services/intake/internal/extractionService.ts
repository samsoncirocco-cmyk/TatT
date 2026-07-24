/**
 * Intake extraction (ADR-0009, ADR-0010, ADR-0012).
 *
 * Turns the two fixed intake answers (placement, meaning) into an
 * IntakeRecord:
 *   - placement: normalized body placement (hard generation constraint)
 *   - styleTags: ONLY canonical ids from the closed style ontology
 *   - meaning: the user's answer kept verbatim as prose — never flattened
 *   - references: reference imagery the user mentioned
 *   - ambiguousAxes: variation axes the answers did NOT resolve
 *
 * Provider order mirrors the Council's conventions (Vertex Gemini first,
 * OpenRouter second) with one deliberate difference: on no provider or
 * provider failure we degrade to a deterministic keyword extractor rather
 * than throwing — dev mode must work offline, and a heuristic extraction
 * is a real (if blunter) extraction, not mock data.
 */

import type { IntakeRecord, VariationAxis } from '../types';
import { VARIATION_AXIS_POOL } from '../types';
import {
  loadOntology,
  resolveTags,
  type OntologyIndex,
} from './ontology';
import { getGcpAccessToken } from '@/lib/google-auth-edge';

export interface IntakeAnswers {
  placementAnswer: string;
  meaningAnswer: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Provider configuration (read lazily so tests can toggle env per case)
 * ────────────────────────────────────────────────────────────────────────── */

function vertexProjectId(): string | null {
  return (
    process.env.NEXT_PUBLIC_VERTEX_AI_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.VERTEX_PROJECT_ID ||
    null
  );
}

function isVertexConfigured(): boolean {
  const credJson =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GCP_SERVICE_ACCOUNT_KEY;
  const credPair = process.env.GCP_SERVICE_ACCOUNT_EMAIL && process.env.GCP_PRIVATE_KEY;
  return Boolean(vertexProjectId() && (credJson || credPair));
}

function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/* ──────────────────────────────────────────────────────────────────────────
 * Placement normalization
 * ────────────────────────────────────────────────────────────────────────── */

// Multi-word parts first so "upper arm" wins over "arm"-ish partials.
const PLACEMENT_PARTS = [
  'behind the ear', 'shoulder blade', 'upper back', 'lower back',
  'upper arm', 'rib cage', 'collarbone', 'forearm', 'shoulder', 'sternum',
  'bicep', 'tricep', 'wrist', 'hand', 'finger', 'chest', 'spine', 'ribs',
  'ribcage', 'hip', 'thigh', 'knee', 'calf', 'shin', 'ankle', 'foot',
  'neck', 'back', 'ear', 'arm', 'leg',
] as const;

const PLACEMENT_CANONICAL: Record<string, string> = {
  ribs: 'ribcage',
  'rib cage': 'ribcage',
};

/**
 * Normalize a placement phrase to a canonical body part, preserving a
 * left/right qualifier when present. Placement is a hard generation
 * constraint (ADR-0009): unknown phrases pass through cleaned rather than
 * being guessed into a known part.
 */
export function normalizePlacement(raw: string): string {
  const text = (raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const side = /\bleft\b/.test(text) ? 'left' : /\bright\b/.test(text) ? 'right' : null;

  for (const part of PLACEMENT_PARTS) {
    if (new RegExp(`\\b${part}\\b`).test(text)) {
      const canonical = PLACEMENT_CANONICAL[part] ?? part;
      return side ? `${side} ${canonical}` : canonical;
    }
  }

  const cleaned = text
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\b(?:on|my|the|probably|maybe|i|think|thinking|somewhere|around)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || text;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Ambiguity detection (ADR-0012)
 *
 * An axis is resolved when either of its poles is signalled by the answers
 * (or by a resolved style tag — "fine-line" resolves bold↔fine the same way
 * "delicate script" does). Everything unresolved stays ambiguous and drives
 * variation-axis selection.
 * ────────────────────────────────────────────────────────────────────────── */

const AXIS_POLE_KEYWORDS: Record<VariationAxis, [string[], string[]]> = {
  'bold-fine': [
    ['bold', 'thick', 'heavy', 'chunky', 'strong lines', 'blocky'],
    ['fine', 'fine line', 'fineline', 'delicate', 'thin', 'dainty', 'single needle', 'script', 'micro'],
  ],
  'color-blackwork': [
    ['color', 'colour', 'colorful', 'colourful', 'watercolor', 'watercolour', 'vibrant', 'full color'],
    ['blackwork', 'black work', 'black and grey', 'black and gray', 'monochrome', 'grayscale', 'greyscale', 'black ink'],
  ],
  'literal-abstract': [
    ['realistic', 'realism', 'photorealistic', 'portrait', 'literal', 'lifelike', 'true to life'],
    ['abstract', 'geometric', 'surreal', 'symbolic', 'impressionist', 'stylized', 'stylised'],
  ],
  'minimal-ornate': [
    ['minimal', 'minimalist', 'simple', 'tiny', 'subtle', 'understated'],
    ['ornate', 'detailed', 'intricate', 'elaborate', 'filigree', 'baroque', 'busy'],
  ],
};

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => new RegExp(`\\b${kw}\\b`).test(text));
}

/** Axes the given text (answers + resolved tags) leaves unresolved. */
export function detectAmbiguousAxes(answers: IntakeAnswers, styleTags: string[]): VariationAxis[] {
  const text = [
    answers.placementAnswer,
    answers.meaningAnswer,
    // Tag ids are kebab-case; spaced-out they hit the same keyword lists.
    ...styleTags.map((id) => id.replace(/-/g, ' ')),
  ]
    .join(' ')
    .toLowerCase();

  return VARIATION_AXIS_POOL.filter((axis) => {
    const [poleA, poleB] = AXIS_POLE_KEYWORDS[axis];
    return !matchesAny(text, poleA) && !matchesAny(text, poleB);
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * Deterministic heuristic extractor (offline / no-provider fallback)
 * ────────────────────────────────────────────────────────────────────────── */

const URL_PATTERN = /https?:\/\/[^\s"'<>)]+/g;

function extractReferences(answers: IntakeAnswers): string[] {
  const combined = `${answers.placementAnswer} ${answers.meaningAnswer}`;
  return Array.from(new Set(combined.match(URL_PATTERN) ?? []));
}

function heuristicStyleTags(answers: IntakeAnswers, index: OntologyIndex): string[] {
  const text = `${answers.placementAnswer} ${answers.meaningAnswer}`.toLowerCase();
  const found: string[] = [];
  for (const [alias, id] of index.aliasToId) {
    if (found.includes(id)) continue;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`).test(text)) found.push(id);
  }
  return found;
}

/** Keyword-only extraction — deterministic, offline, no provider needed. */
export function heuristicExtract(answers: IntakeAnswers, index: OntologyIndex): IntakeRecord {
  const styleTags = heuristicStyleTags(answers, index);
  return {
    placement: normalizePlacement(answers.placementAnswer),
    styleTags,
    meaning: answers.meaningAnswer.trim(),
    references: extractReferences(answers),
    ambiguousAxes: detectAmbiguousAxes(answers, styleTags),
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * LLM extraction
 * ────────────────────────────────────────────────────────────────────────── */

interface LlmExtraction {
  placement?: unknown;
  styleTags?: unknown;
  subject?: unknown;
  references?: unknown;
  ambiguousAxes?: unknown;
}

function buildExtractionPrompt(answers: IntakeAnswers, index: OntologyIndex): string {
  const allowedTags = Array.from(index.canonicalIds).join(', ');
  return [
    'You extract structured tattoo intake data from two conversational answers.',
    'Return ONLY a JSON object with exactly these keys:',
    '{"placement": string, "styleTags": string[], "subject": string | null, "references": string[], "ambiguousAxes": string[]}',
    '',
    '- placement: the body placement, normalized to a short lowercase phrase (e.g. "left forearm").',
    `- styleTags: tattoo style tags, chosen ONLY from this closed list: [${allowedTags}]. Empty array if the answers do not clearly signal a style.`,
    '- subject: when the answers name a SPECIFIC character, franchise, person, or thing, write a concrete visual subject phrase that names it and anchors it to real, recognizable visual elements — e.g. "Izuku Midoriya (Deku) from My Hero Academia, determined expression, One For All lightning crackling around his fist". Name the character AND the franchise. Only include visual elements that genuinely belong to that subject; if you are not sure of its iconography, name the subject plainly without invented details. null when the answers name nothing specific (a mood, a value, an abstract feeling).',
    '- references: any reference imagery the user mentioned (URLs or short descriptions of images they referenced). Empty array if none.',
    `- ambiguousAxes: the subset of [${VARIATION_AXIS_POOL.join(', ')}] the answers leave UNRESOLVED. An axis is resolved when the answers commit to either pole (e.g. "delicate script" resolves bold-fine toward fine; "black and grey" resolves color-blackwork). IMPORTANT: when subject is non-null, literal-abstract is RESOLVED (toward literal) — a named character or franchise means the user wants a recognizable depiction, so never list literal-abstract as ambiguous in that case.`,
    '',
    'Do NOT paraphrase or summarize the meaning answer — it is preserved verbatim elsewhere.',
    '',
    `Placement answer: "${answers.placementAnswer}"`,
    `Meaning answer: "${answers.meaningAnswer}"`,
  ].join('\n');
}

function parseJsonFromText(text: string): LlmExtraction | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as LlmExtraction;
  } catch {
    /* fall through to brace scan */
  }
  const first = text.indexOf('{');
  if (first === -1) return null;
  let depth = 0;
  for (let i = first; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') depth -= 1;
    if (depth === 0) {
      try {
        return JSON.parse(text.slice(first, i + 1)) as LlmExtraction;
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function extractWithVertex(prompt: string): Promise<LlmExtraction | null> {
  const projectId = vertexProjectId();
  const region = process.env.GCP_REGION || 'us-central1';
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const accessToken = await getGcpAccessToken();
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} - ${await response.text()}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? parseJsonFromText(text) : null;
}

async function extractWithOpenRouter(prompt: string): Promise<LlmExtraction | null> {
  const model = process.env.INTAKE_EXTRACTION_MODEL || 'google/gemini-2.5-flash';
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'TattTester - Intake Extraction',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 500,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  return text ? parseJsonFromText(text) : null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Merge: LLM output is a suggestion; the contract is enforced here
 * ────────────────────────────────────────────────────────────────────────── */

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function mergeLlmExtraction(
  llm: LlmExtraction,
  answers: IntakeAnswers,
  index: OntologyIndex
): IntakeRecord {
  // Closed vocabulary: aliases resolve, unknown tags are rejected outright.
  const styleTags = resolveTags(index, asStringArray(llm.styleTags) ?? []);

  const rawPlacement =
    typeof llm.placement === 'string' && llm.placement.trim()
      ? llm.placement
      : answers.placementAnswer;

  const subject =
    typeof llm.subject === 'string' && llm.subject.trim() ? llm.subject.trim() : undefined;

  const llmAxes = asStringArray(llm.ambiguousAxes);
  let ambiguousAxes = llmAxes
    ? VARIATION_AXIS_POOL.filter((axis) => llmAxes.includes(axis))
    : detectAmbiguousAxes(answers, styleTags);
  // A named subject means the user wants a recognizable depiction — enforce
  // the prompt's rule here too so literal-abstract can never slip through as
  // ambiguous and burn reveal slots on abstract takes of a named character.
  if (subject) {
    ambiguousAxes = ambiguousAxes.filter((axis) => axis !== 'literal-abstract');
  }

  return {
    placement: normalizePlacement(rawPlacement),
    styleTags,
    // Meaning is NEVER taken from the model — verbatim prose per ADR-0010.
    meaning: answers.meaningAnswer.trim(),
    subject,
    references: asStringArray(llm.references)?.map((r) => r.trim()) ?? extractReferences(answers),
    ambiguousAxes: [...ambiguousAxes],
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Entry point
 * ────────────────────────────────────────────────────────────────────────── */

export async function extractIntakeRecord(answers: IntakeAnswers): Promise<IntakeRecord> {
  const index = await loadOntology();
  const prompt = buildExtractionPrompt(answers, index);

  if (isVertexConfigured()) {
    try {
      const llm = await extractWithVertex(prompt);
      if (llm) return mergeLlmExtraction(llm, answers, index);
    } catch (error) {
      console.warn('[IntakeExtraction] Vertex AI failed, trying fallback:', error);
    }
  }

  if (isOpenRouterConfigured()) {
    try {
      const llm = await extractWithOpenRouter(prompt);
      if (llm) return mergeLlmExtraction(llm, answers, index);
    } catch (error) {
      console.warn('[IntakeExtraction] OpenRouter failed, falling back to heuristic:', error);
    }
  }

  return heuristicExtract(answers, index);
}
