/**
 * Acceptance test: the tatttester.com Togashi-sleeve session (2026-07-28).
 *
 * A real production transcript failed nine ways at once; this test replays
 * the founder-supplied user messages verbatim against the fixed engine,
 * with the provider mocked to return the SAME misbehaving model replies the
 * live session plausibly produced (verbatim re-asked questions, "I'm not
 * here to suggest styles", "I can't show you mock-ups"). The engine must
 * correct every one of them deterministically:
 *
 *  (a) zero verbatim repeated questions across the whole session
 *  (b) a real recommendation on "which do suggest"
 *  (c) a proposal trigger on "can i see both versions color and blackwork"
 *      with color-blackwork spread as the variation axis
 *  (d) IP handling in the brief: ALL FIVE named characters on the subject,
 *      literal-abstract locked, and the one in-voice inspired-by line
 *  (e) the final playback enumerates the full cast plus the accepted scene
 *  (f) no internal machinery ("Questionnaire mode: …") in visible replies
 *  (g) sleeve-appropriate generation params (9:16, never square)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { colorCallReply } from '../internal/persona';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { opener, runTurn, type ConversationMessage } from '../index';
import type { ConversationTurnResult } from '../types';
import { resetStyleTagCache } from '../internal/ontology';
import {
  COLOR_QUESTION,
  IP_NOTE,
  PROPOSAL_LEAD,
} from '../internal/persona';
import { routeGeneration } from '@/services/generation';

vi.mock('@/lib/google-auth-edge', () => ({
  getGcpAccessToken: vi.fn().mockResolvedValue('test-gcp-token'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  createRequestLogger: vi.fn(),
}));

const FIXTURE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'style-ontology.fixture.json'
);

const ENV_KEYS = [
  'OPENROUTER_API_KEY',
  'CONVERSATION_MODEL',
  'GOOGLE_APPLICATION_CREDENTIALS_JSON',
  'GCP_SERVICE_ACCOUNT_KEY',
  'GCP_SERVICE_ACCOUNT_EMAIL',
  'GCP_PRIVATE_KEY',
  'NEXT_PUBLIC_VERTEX_AI_PROJECT_ID',
  'GCP_PROJECT_ID',
  'VERTEX_PROJECT_ID',
  'GCP_REGION',
  'NEXT_PUBLIC_DEMO_MODE',
];

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const key of [...ENV_KEYS, 'STYLE_ONTOLOGY_PATH']) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  process.env.STYLE_ONTOLOGY_PATH = FIXTURE_PATH;
  process.env.NEXT_PUBLIC_VERTEX_AI_PROJECT_ID = 'tatt-test';
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = '{"project_id":"tatt-test"}';
  resetStyleTagCache();
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function vertexResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
    }),
  };
}

/* ── the session, verbatim user messages ─────────────────────────────────── */

const USER_MESSAGES = [
  /* 1 */ 'im thinking i want an arm sleeve of togashi inspired characters from hxh and his other work like yuyu hakusho',
  /* 2 */ 'which ones do you like definitely killua and hiei',
  /* 3 */ 'i wanna have gon kurapika and kurama',
  /* 4 */ 'which do suggest',
  /* 5 */ 'can i see both versions color and blackwork',
  /* 6 */ 'lets see the full color',
  /* 7 */ 'give me some ideas',
  /* 8 */ 'i like it!',
  /* 9 */ 'joy and excitement for my favorite characters',
  /* 10 */ 'a dynamic scene with everyone using there signature techniques',
  /* 11 */ 'keep the focus purely on the characters',
];

const MEANING = 'togashi inspired characters from hxh and his other work like yuyu hakusho';
const MOMENTS_QUESTION =
  'What specific moments or interactions between Gon, Kurapika, Kurama, Killua, and Hiei do you want to feature?';

/**
 * What the live model plausibly returned each turn — INCLUDING the exact
 * failure shapes from the production transcript. The engine must never let
 * these reach the user uncorrected.
 */
const MODEL_PAYLOADS = [
  {
    reply: "Togashi's whole universe on one sleeve — that's a rich well. Which characters are pulling you the most?",
    record: { placement: 'arm sleeve', styleTags: [], meaning: MEANING, subject: null, references: [], ambiguousAxes: ['bold-fine', 'color-blackwork', 'literal-abstract', 'minimal-ornate'] },
  },
  {
    reply: `Killua and Hiei are both iconic. ${COLOR_QUESTION}`,
    record: { placement: 'arm sleeve', styleTags: [], meaning: MEANING, subject: 'Killua Zoldyck and Hiei', references: [], ambiguousAxes: ['bold-fine', 'color-blackwork', 'literal-abstract', 'minimal-ornate'] },
  },
  {
    // PROD FAILURE: the same style question, verbatim, a second time.
    reply: `Gon, Kurapika, and Kurama round out the full Togashi lineup. ${COLOR_QUESTION}`,
    record: { placement: 'arm sleeve', styleTags: [], meaning: MEANING, subject: 'Gon, Killua, Kurapika, Kurama and Hiei', references: [], ambiguousAxes: ['bold-fine', 'color-blackwork', 'literal-abstract', 'minimal-ornate'] },
  },
  {
    // PROD FAILURE: refuses to recommend when asked directly.
    reply: "I'm not here to suggest styles, but I can tell you that full color would really bring out the distinct abilities of each of these characters. What do you think?",
    record: { placement: 'arm sleeve', styleTags: [], meaning: MEANING, subject: 'Gon, Killua, Kurapika, Kurama and Hiei', references: [], ambiguousAxes: ['bold-fine', 'color-blackwork', 'literal-abstract', 'minimal-ornate'] },
  },
  {
    // PROD FAILURE: denies generation capability, self-contradicts, and
    // re-asks the style question a THIRD time in the same message.
    reply: `I can't show you mock-ups, but I can help you nail down the design details. Since you're open to both, let's go with full color for now. ${COLOR_QUESTION}`,
    record: { placement: 'arm sleeve', styleTags: ['color'], meaning: MEANING, subject: 'Gon, Killua, Kurapika, Kurama and Hiei', references: [], ambiguousAxes: ['bold-fine', 'minimal-ornate'] },
  },
  {
    reply: `Full color locked. ${MOMENTS_QUESTION}`,
    record: { placement: 'arm sleeve', styleTags: ['anime', 'color'], meaning: MEANING, subject: 'Gon, Killua, Kurapika, Kurama and Hiei', references: [], ambiguousAxes: ['bold-fine', 'minimal-ornate'] },
  },
  {
    reply: "Two directions I love: Gon and Killua launching their signature moves back to back, Kurapika's chains framing the scene, Hiei and Kurama facing off — dragon against rose whip. Feel either?",
    record: { placement: 'arm sleeve', styleTags: ['anime', 'color'], meaning: MEANING, subject: 'Gon, Killua, Kurapika, Kurama and Hiei', references: [], ambiguousAxes: ['bold-fine', 'minimal-ornate'] },
  },
  {
    reply: "Then let's make it sing. What do you want this piece to say about you?",
    record: { placement: 'arm sleeve', styleTags: ['anime', 'color'], meaning: MEANING, subject: 'Gon, Killua, Kurapika, Kurama and Hiei, signature techniques scene', references: [], ambiguousAxes: ['bold-fine', 'minimal-ornate'] },
  },
  {
    // PROD FAILURE: acknowledges the meaning, then RE-ASKS the moments
    // question verbatim.
    reply: `Beautiful — that energy will carry the piece. ${MOMENTS_QUESTION}`,
    record: { placement: 'arm sleeve', styleTags: ['anime', 'color'], meaning: 'joy and excitement for my favorite characters', subject: 'Gon, Killua, Kurapika, Kurama and Hiei, signature techniques scene', references: [], ambiguousAxes: ['bold-fine', 'minimal-ornate'] },
  },
  {
    reply: 'Do you want any background environment, or keep the focus on the characters themselves?',
    record: { placement: 'arm sleeve', styleTags: ['anime', 'color'], meaning: 'joy and excitement for my favorite characters', subject: 'Gon, Killua, Kurapika, Kurama and Hiei, dynamic scene, signature techniques', references: [], ambiguousAxes: ['bold-fine', 'minimal-ornate'] },
  },
  {
    reply: 'Clean — characters only, full energy.',
    record: { placement: 'arm sleeve', styleTags: ['anime', 'color'], meaning: 'joy and excitement for my favorite characters', subject: 'Gon, Killua, Kurapika, Kurama and Hiei, dynamic scene, characters only', references: [], ambiguousAxes: ['bold-fine', 'minimal-ornate'] },
  },
];

/* ── helpers ─────────────────────────────────────────────────────────────── */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function questionSentencesOf(text: string): string[] {
  return (text.match(/[^.?!]+[.?!]+|[^.?!]+$/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => s.endsWith('?'))
    .map(normalize)
    .filter((s) => s.split(' ').filter(Boolean).length >= 5);
}

interface Replay {
  results: ConversationTurnResult[];
  botReplies: string[];
}

async function replaySession(): Promise<Replay> {
  const fetchMock = vi.fn();
  for (const payload of MODEL_PAYLOADS) {
    fetchMock.mockResolvedValueOnce(vertexResponse(payload));
  }
  vi.stubGlobal('fetch', fetchMock);

  const messages: ConversationMessage[] = [{ role: 'bot', text: opener() }];
  const results: ConversationTurnResult[] = [];
  for (let turn = 1; turn <= USER_MESSAGES.length; turn += 1) {
    messages.push({ role: 'user', text: USER_MESSAGES[turn - 1] });
    const result = await runTurn({ messages: [...messages], userTurn: turn });
    results.push(result);
    messages.push({ role: 'bot', text: result.reply });
  }
  return { results, botReplies: [opener(), ...results.map((r) => r.reply)] };
}

/* ── the acceptance criteria ─────────────────────────────────────────────── */

describe('live-transcript regression: the Togashi sleeve session', () => {
  it('(a) never asks the same question twice, verbatim, anywhere in the session', async () => {
    const { botReplies } = await replaySession();

    const seen = new Map<string, number>();
    for (const reply of botReplies) {
      for (const question of questionSentencesOf(reply)) {
        seen.set(question, (seen.get(question) ?? 0) + 1);
      }
    }
    const repeated = [...seen.entries()].filter(([, count]) => count > 1);
    expect(repeated).toEqual([]);
  });

  it('advances the color slot: one ask, one reworded retry, then the bot makes the call', async () => {
    const { results } = await replaySession();

    // Turn 2: the fixed color question, first and only verbatim ask.
    expect(results[1].reply).toContain(COLOR_QUESTION);
    // Turn 3: the model re-asked verbatim; the engine must reword, not repeat.
    expect(results[2].reply).not.toContain(COLOR_QUESTION);
    expect(results[2].reply.toLowerCase()).toContain('full color, or black ink only');
    // No later reply ever carries the verbatim question again.
    for (const result of results.slice(3)) {
      expect(result.reply).not.toContain(COLOR_QUESTION);
    }
  });

  it('(b) answers "which do suggest" with a real recommendation and advances to the proposal', async () => {
    const { results } = await replaySession();
    const turn4 = results[3];

    expect(turn4.reply).not.toMatch(/not here to suggest|it'?s (really )?up to you/i);
    // The recommendation itself, not its wording: colorCallReply owns the copy.
    expect(turn4.reply).toContain(colorCallReply('recommendation', true));
    // The recommendation resolves the slot and the record advances — the
    // proposal beat fires on the same turn (the reveal is the questionnaire).
    expect(turn4.stage).toBe('proposal');
    expect(turn4.turnLog.firedRule).toBe('style-recommendation');
    expect(turn4.reply).toContain(PROPOSAL_LEAD);
    expect(turn4.record.styleTags).toContain('color');
    expect(turn4.record.ambiguousAxes).not.toContain('color-blackwork');
  });

  it('(c) treats "can i see both versions color and blackwork" as the proposal trigger with the axis spread', async () => {
    const { results } = await replaySession();
    const turn5 = results[4];

    // Never a capability denial.
    expect(turn5.reply).not.toMatch(/can'?t show|can'?t generate|mock-?ups?/i);
    expect(turn5.stage).toBe('proposal');
    expect(turn5.turnLog.firedRule).toBe('axis-request-proposal');
    expect(turn5.reply).toContain(PROPOSAL_LEAD);
    expect(turn5.reply).toContain('split the two cuts across full color and blackwork');
    // The axis is deliberately reopened and leads the selection order, and
    // the palette tags that would re-resolve it are cleared (ADR-0012).
    expect(turn5.record.ambiguousAxes?.[0]).toBe('color-blackwork');
    expect(turn5.record.styleTags).not.toContain('color');
    expect(turn5.record.styleTags).not.toContain('blackwork');
  });

  it('(d) enforces the IP rule: all five characters on the subject, literal locked, one in-voice line', async () => {
    const { results, botReplies } = await replaySession();
    const final = results[results.length - 1];

    const subject = (final.record.subject ?? '').toLowerCase();
    for (const name of ['killua', 'hiei', 'gon', 'kurapika', 'kurama']) {
      expect(subject).toContain(name);
    }
    // Costume anchors from the database, not just names.
    expect(subject).toContain('hunter x hunter');
    expect(subject).toContain('yu yu hakusho');
    expect(final.record.ambiguousAxes).not.toContain('literal-abstract');

    // The inspired-by line is said exactly once across the session.
    const ipMentions = botReplies.filter((reply) => reply.includes(IP_NOTE)).length;
    expect(ipMentions).toBe(1);
  });

  it('(e) the final playback enumerates the full cast and the accepted scene concept', async () => {
    const { results } = await replaySession();
    const final = results[results.length - 1];

    expect(final.stage).toBe('proposal');
    expect(final.playback).toBeTruthy();
    for (const name of ['Killua', 'Hiei', 'Gon', 'Kurapika', 'Kurama']) {
      expect(final.playback).toContain(name);
    }
    // The scene the user accepted from the bot's own pitch ("i like it!")
    // plus their "signature techniques" ask must survive into the playback.
    expect(final.playback!.toLowerCase()).toMatch(/signature/);
    // Grammar: "an anime and color piece", never "a anime".
    expect(final.playback).toContain('an anime and color piece');
    expect(final.playback).toContain('arm sleeve');
  });

  it('(f) never surfaces internal machinery in a visible reply', async () => {
    const { botReplies } = await replaySession();
    for (const reply of botReplies) {
      expect(reply).not.toMatch(/questionnaire mode|compositional mode|intake left|ADR-\d+|firedRule|confidence/i);
    }
  });

  it('(g) the final brief routes sleeve-appropriate generation params (9:16, anime lane)', async () => {
    const { results } = await replaySession();
    const record = results[results.length - 1].record;

    const route = routeGeneration({
      prompt: '',
      style: record.styleTags?.[0],
      bodyPart: record.placement,
    });
    expect(route.aspectRatio).toBe('9:16');
    expect(route.modelId).toBe('krea2');
  });

  it('captures the accepted bot pitch ("i like it!") as brief material', async () => {
    const { results } = await replaySession();
    // From turn 8 on, the accepted pitch's action rides on the subject.
    const turn8 = results[7];
    expect(turn8.record.subject?.toLowerCase()).toContain('launching their signature moves');
  });
});
