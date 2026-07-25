/**
 * The conversation engine (ADR-0019, ADR-0020, ADR-0021, ADR-0022).
 *
 * Stateless: the caller owns persistence and passes the full transcript in.
 * Each live turn makes ONE model call that does double duty — the
 * conversational reply plus an incremental structured extraction into
 * Partial<IntakeRecord> — then deterministic code (never model judgment)
 * decides the stage:
 *
 *   turn >= 20                                → 'handoff'  (warm, ADR-0021)
 *   turn >= 12                                → 'proposal' (forced best-guess
 *                                                playback, ADR-0020 phrasing)
 *   confidence >= threshold AND placement
 *     + meaning present                       → 'proposal' (judgment)
 *   otherwise                                 → 'chatting'
 *
 * Every turn produces a TurnLog (day-one requirement, ADR-0022), returned in
 * the result AND logged via the repo's pino logger.
 */

import { logger } from '@/lib/logger';
import type { IntakeRecord, VariationAxis } from '@/services/intake';
import { VARIATION_AXIS_POOL } from '@/services/intake';
import { charactersIn, characterLabelFor } from '@/services/intake/internal/characterSubject';
import type {
  ConversationMessage,
  ConversationStage,
  ConversationTurnResult,
  TurnLog,
} from '../types';
import { buildSystemPrompt, HANDOFF_MESSAGE, proposalReply } from './persona';
import { loadStyleTagIndex, resolveStyleTags, type StyleTagIndex } from './ontology';
import { scoreRecord, CONFIDENCE_THRESHOLD } from './confidence';
import { converseWithProviders, type RawTurnPayload } from './providers';
import { isDemoMode, runDemoTurn } from './demoScript';

/** Cadence caps (ADR-0021) — deterministic code, never exposed as limits. */
export const FORCE_PROPOSAL_TURN = 12;
export const HANDOFF_TURN = 20;

export interface RunTurnRequest {
  /** Full transcript so far, oldest first (the caller owns persistence). */
  messages: ConversationMessage[];
  /** 1-based number of user turns taken, including the one being answered. */
  userTurn: number;
  /**
   * Model pinned for this session by the caller (from a previous turn's
   * TurnLog.model). The provider chain tries it first.
   */
  pinnedModel?: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Record sanitization: the model's extraction is a suggestion; the contract
 * (closed style tags, axis pool membership) is enforced here.
 * ────────────────────────────────────────────────────────────────────────── */

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
}

function sanitizeRecord(
  payload: RawTurnPayload,
  ontology: StyleTagIndex
): Partial<IntakeRecord> {
  const raw = payload.record ?? {};

  const record: Partial<IntakeRecord> = {
    styleTags: resolveStyleTags(ontology, Array.isArray(raw.styleTags) ? raw.styleTags : []),
    references: asStringArray(raw.references),
  };

  const placement = asTrimmedString(raw.placement);
  if (placement) record.placement = placement.toLowerCase();

  // Meaning is verbatim-ish prose stitched from the user's words (the
  // system prompt forbids paraphrase); kept as given, trimmed only.
  const meaning = asTrimmedString(raw.meaning);
  if (meaning) record.meaning = meaning;

  const rawAxes = asStringArray(raw.ambiguousAxes);
  record.ambiguousAxes = Array.isArray(raw.ambiguousAxes)
    ? VARIATION_AXIS_POOL.filter((axis): axis is VariationAxis => rawAxes.includes(axis))
    : [...VARIATION_AXIS_POOL];

  return record;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Playback: the one-line best-guess summary (ADR-0020)
 * ────────────────────────────────────────────────────────────────────────── */

const PLAYBACK_MEANING_MAX = 140;

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max)}…`;
}

export function buildPlayback(
  record: Partial<IntakeRecord>,
  characterLabel?: string
): string {
  const tags = record.styleTags ?? [];
  const style = tags.length
    ? `${tags.map((t) => t.replace(/-/g, ' ')).join(' and ')} `
    : '';
  const placement = record.placement
    ? `on your ${record.placement}`
    : 'with the placement still open';
  // Named characters read back far better than the raw meaning prose
  // ("Goku (Dragon Ball Z)" vs "never giving up no matter how outmatched").
  // Deliberately the short LABEL, never `record.subject` — subject carries
  // the costume anchors the prompts need ("Goku with wild spiky black hair,
  // orange gi, ...") and dropping that here produces an unreadable sentence.
  const subject = (characterLabel ?? '').trim();
  const meaning = (record.meaning ?? '').trim();
  const tailSource = subject || meaning;
  const tailPart = tailSource
    ? ` — ${truncateAtWord(tailSource, PLAYBACK_MEANING_MAX)}`
    : '';
  return `a ${style}piece ${placement}${tailPart}`;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Repeat guard (ADR-0021 cadence): the model occasionally re-emits its own
 * previous question word for word, which reads as the bot not listening.
 * Observed live: "...would you want to include any background elements like
 * the energy aura or maybe some debris?" asked twice in a row.
 * ────────────────────────────────────────────────────────────────────────── */

const REPEAT_FALLBACK =
  "Sorry — I just asked that. Anything else you want me to know about the look, or should I show you some directions?";

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Exact repetition only — a reworded follow-up is legitimate conversation. */
function isRepeatOf(reply: string, previousBotMessage: string): boolean {
  const candidate = normalizeForCompare(reply);
  return candidate.length > 0 && candidate === normalizeForCompare(previousBotMessage);
}

function lastBotMessage(messages: ConversationMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'bot') return messages[i].text;
  }
  return '';
}

/* ──────────────────────────────────────────────────────────────────────────
 * The turn
 * ────────────────────────────────────────────────────────────────────────── */

function logTurn(turnLog: TurnLog, stage: ConversationStage): void {
  logger.info({
    event_type: 'design_conversation.turn',
    stage,
    ...turnLog,
  });
}

export async function runConversationTurn(
  request: RunTurnRequest
): Promise<ConversationTurnResult> {
  if (isDemoMode()) {
    const result = runDemoTurn(request.userTurn);
    logTurn(result.turnLog, result.stage);
    return result;
  }

  const ontology = await loadStyleTagIndex();
  const systemPrompt = buildSystemPrompt([...ontology.canonicalIds]);

  // One call, double duty: reply + extraction. Total provider failure
  // propagates as ConversationUnavailableError — the caller downgrades to
  // the v1 scripted flow (ADR-0019).
  const { payload, model } = await converseWithProviders({
    systemPrompt,
    messages: request.messages,
    pinnedModel: request.pinnedModel,
  });

  const record = sanitizeRecord(payload, ontology);
  const { confidence, missingFields, hasRequiredFields } = scoreRecord(record);

  // Deterministic character detection over the user's own words. The
  // conversation model is never asked for `subject` (it is not in the turn
  // payload), so without this a named character never reaches the playback.
  // The prompt-facing subject is backfilled from the same source at confirm
  // (designSession/internal/conversation.ts) — that keeps the costume anchors
  // on IntakeRecord.subject while the playback gets only the short label.
  const characterLabel = characterLabelFor(
    charactersIn(
      request.messages
        .filter((message) => message.role === 'user')
        .map((message) => message.text)
        .join(' ')
    )
  );

  // Cadence — deterministic code, not model judgment (ADR-0021).
  let stage: ConversationStage;
  let firedRule: TurnLog['firedRule'];
  let reply: string;
  let playback: string | undefined;

  if (request.userTurn >= HANDOFF_TURN) {
    stage = 'handoff';
    firedRule = 'turn20-handoff';
    reply = HANDOFF_MESSAGE;
  } else if (request.userTurn >= FORCE_PROPOSAL_TURN) {
    stage = 'proposal';
    firedRule = 'turn12-force-proposal';
    playback = buildPlayback(record, characterLabel);
    reply = proposalReply(playback);
  } else if (confidence >= CONFIDENCE_THRESHOLD && hasRequiredFields) {
    stage = 'proposal';
    firedRule = 'judgment';
    playback = buildPlayback(record, characterLabel);
    reply = proposalReply(playback);
  } else {
    stage = 'chatting';
    firedRule = 'none';
    const candidate =
      asTrimmedString(payload.reply) ||
      "Tell me more — what's drawing you to this piece?";
    const previousBotMessage = lastBotMessage(request.messages);
    if (isRepeatOf(candidate, previousBotMessage)) {
      logger.warn({
        event_type: 'design_conversation.repeated_reply',
        turn: request.userTurn,
        model,
        repeated: candidate,
      });
      reply = REPEAT_FALLBACK;
    } else {
      reply = candidate;
    }
  }

  const turnLog: TurnLog = {
    turn: request.userTurn,
    confidence,
    missingFields,
    firedRule,
    model,
  };
  logTurn(turnLog, stage);

  return {
    reply,
    stage,
    ...(playback !== undefined ? { playback } : {}),
    record,
    turnLog,
  };
}
