/**
 * Provider chain for the conversation LLM (ADR-0019).
 *
 * Primary: Vertex Gemini (model env-configurable via CONVERSATION_MODEL,
 * defaulting to a Flash-Lite tier). Fallback: GLM-5.2 via OpenRouter. The
 * house Vertex call pattern (endpoint shape, getGcpAccessToken, JSON
 * response mime type) mirrors the council/intake internals.
 *
 * Per-session model pinning is the CALLER's job: the caller stores the
 * model that served turn 1 (from TurnLog.model) and passes it back as
 * pinnedModel; this chain only promises to try the pinned provider first.
 * When every provider is exhausted it throws ConversationUnavailableError —
 * the caller downgrades to the v1 scripted intake flow (ADR-0019).
 */

import { getGcpAccessToken } from '@/lib/google-auth-edge';
import type { ConversationMessage } from '../types';

export const DEFAULT_VERTEX_MODEL = 'gemini-2.5-flash-lite';
export const OPENROUTER_FALLBACK_MODEL = 'z-ai/glm-5.2';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** The model's double-duty payload, unvalidated (the engine sanitizes it). */
export interface RawTurnPayload {
  reply?: unknown;
  record?: {
    placement?: unknown;
    styleTags?: unknown;
    meaning?: unknown;
    references?: unknown;
    ambiguousAxes?: unknown;
  };
}

export interface ProviderTurn {
  payload: RawTurnPayload;
  /** The model that actually served the turn — goes into TurnLog.model. */
  model: string;
}

/**
 * Thrown when EVERY conversation provider is exhausted. The caller catches
 * this and downgrades to the v1 scripted two-question intake (ADR-0019) —
 * never silently substitutes mock conversation.
 */
export class ConversationUnavailableError extends Error {
  attempts: { provider: string; model: string; reason: string }[];

  constructor(
    message: string,
    attempts: { provider: string; model: string; reason: string }[] = []
  ) {
    super(message);
    this.name = 'ConversationUnavailableError';
    this.attempts = attempts;
  }
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

function vertexModel(): string {
  return process.env.CONVERSATION_MODEL || DEFAULT_VERTEX_MODEL;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Response parsing
 * ────────────────────────────────────────────────────────────────────────── */

function parseJsonFromText(text: string): RawTurnPayload | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as RawTurnPayload;
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
        return JSON.parse(text.slice(first, i + 1)) as RawTurnPayload;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Provider calls
 * ────────────────────────────────────────────────────────────────────────── */

async function callVertex(
  systemPrompt: string,
  messages: ConversationMessage[],
  model: string
): Promise<RawTurnPayload | null> {
  const projectId = vertexProjectId();
  const region = process.env.GCP_REGION || 'us-central1';
  const accessToken = await getGcpAccessToken();
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      contents: messages.map((m) => ({
        role: m.role === 'bot' ? 'model' : 'user',
        parts: [{ text: m.text }],
      })),
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} - ${await response.text()}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? parseJsonFromText(text) : null;
}

async function callOpenRouter(
  systemPrompt: string,
  messages: ConversationMessage[],
  model: string
): Promise<RawTurnPayload | null> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'TattTester - Design Conversation',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: m.text,
        })),
      ],
      temperature: 0.7,
      max_tokens: 900,
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
 * Chain
 * ────────────────────────────────────────────────────────────────────────── */

interface Provider {
  name: 'vertex' | 'openrouter';
  model: string;
  configured: () => boolean;
  call: (systemPrompt: string, messages: ConversationMessage[]) => Promise<RawTurnPayload | null>;
}

function providerChain(pinnedModel?: string): Provider[] {
  const vModel = vertexModel();
  const chain: Provider[] = [
    {
      name: 'vertex',
      model: vModel,
      configured: isVertexConfigured,
      call: (s, m) => callVertex(s, m, vModel),
    },
    {
      name: 'openrouter',
      model: OPENROUTER_FALLBACK_MODEL,
      configured: isOpenRouterConfigured,
      call: (s, m) => callOpenRouter(s, m, OPENROUTER_FALLBACK_MODEL),
    },
  ];
  if (pinnedModel) {
    chain.sort((a, b) =>
      (b.model === pinnedModel ? 1 : 0) - (a.model === pinnedModel ? 1 : 0)
    );
  }
  return chain;
}

/**
 * Run one conversation turn through the provider chain, pinned-first.
 * Throws ConversationUnavailableError when every provider is exhausted.
 */
export async function converseWithProviders(opts: {
  systemPrompt: string;
  messages: ConversationMessage[];
  pinnedModel?: string;
}): Promise<ProviderTurn> {
  const attempts: { provider: string; model: string; reason: string }[] = [];

  for (const provider of providerChain(opts.pinnedModel)) {
    if (!provider.configured()) {
      attempts.push({ provider: provider.name, model: provider.model, reason: 'not configured' });
      continue;
    }
    try {
      const payload = await provider.call(opts.systemPrompt, opts.messages);
      if (payload) return { payload, model: provider.model };
      attempts.push({
        provider: provider.name,
        model: provider.model,
        reason: 'unparseable response',
      });
    } catch (error) {
      attempts.push({
        provider: provider.name,
        model: provider.model,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw new ConversationUnavailableError(
    'all_providers_exhausted: design conversation temporarily unavailable',
    attempts
  );
}
