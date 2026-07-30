/**
 * TAT-51 acceptance: the evocation follow-up and the de-shamed meaning
 * opener, built from Samson's real sessions (2026-07-29).
 *
 * 1. "my love for toriyama" as meaning with nothing drawable → SketchBot
 *    asks the ONE evocation question; "gohan and cell's beam struggle"
 *    comes back as the composition anchor, the IP machinery fires for both
 *    characters, and the proposal is reachable the next turn.
 * 2. The opener carries the release valve, and "it just looks sick"
 *    records vibe=aesthetic and closes the meaning slot permanently.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { opener, runTurn, type ConversationMessage } from '../index';
import type { ConversationTurnResult } from '../types';
import { resetStyleTagCache } from '../internal/ontology';
import {
  COLOR_QUESTION,
  EVOCATION_STEM,
  evocationQuestion,
  AESTHETIC_ACK,
  SUBJECT_GATE_QUESTION,
  IP_NOTE,
} from '../internal/persona';
import { evocationRefOf, isAestheticAnswer } from '../internal/intent';

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

/** Replay user messages against per-turn mocked model payloads. */
async function replay(
  userMessages: string[],
  payloads: unknown[]
): Promise<{ results: ConversationTurnResult[]; botReplies: string[] }> {
  const fetchMock = vi.fn();
  for (const payload of payloads) fetchMock.mockResolvedValueOnce(vertexResponse(payload));
  vi.stubGlobal('fetch', fetchMock);

  const messages: ConversationMessage[] = [{ role: 'bot', text: opener() }];
  const results: ConversationTurnResult[] = [];
  for (let turn = 1; turn <= userMessages.length; turn += 1) {
    messages.push({ role: 'user', text: userMessages[turn - 1] });
    const result = await runTurn({ messages: [...messages], userTurn: turn });
    results.push(result);
    messages.push({ role: 'bot', text: result.reply });
  }
  return { results, botReplies: [opener(), ...results.map((r) => r.reply)] };
}

const ALL_AXES = ['bold-fine', 'color-blackwork', 'literal-abstract', 'minimal-ornate'];

/* ── the Toriyama session (issue acceptance) ─────────────────────────────── */

const TORIYAMA_USERS = [
  'left forearm — my love for toriyama',
  "gohan and cell's beam struggle",
  'full color',
];

const TORIYAMA_PAYLOADS = [
  {
    reply: "A Toriyama piece — that's a deep well. Which era of his work?",
    record: { placement: 'left forearm', styleTags: [], meaning: 'my love for toriyama', subject: null, references: [], ambiguousAxes: ALL_AXES },
  },
  {
    reply: `That moment is legendary. ${COLOR_QUESTION}`,
    record: { placement: 'left forearm', styleTags: [], meaning: 'my love for toriyama', subject: 'Gohan and Cell beam struggle', references: [], ambiguousAxes: ALL_AXES },
  },
  {
    reply: 'Full color it is.',
    record: { placement: 'left forearm', styleTags: ['color'], meaning: 'my love for toriyama', subject: 'Gohan and Cell beam struggle', references: [], ambiguousAxes: ['bold-fine', 'minimal-ornate'] },
  },
];

describe('TAT-51 — the evocation follow-up (Toriyama session)', () => {
  it('asks the one evocation question when meaning points at a creator with nothing drawable', async () => {
    const { results } = await replay(TORIYAMA_USERS, TORIYAMA_PAYLOADS);
    const turn1 = results[0];

    expect(turn1.stage).toBe('chatting');
    expect(turn1.turnLog.firedRule).toBe('evocation-question');
    expect(turn1.reply).toBe(evocationQuestion('toriyama'));
    expect(turn1.reply).toContain('a scene, an image, a feeling');
  });

  it('captures the answer as the composition anchor and fires the IP machinery for Gohan and Cell', async () => {
    const { results } = await replay(TORIYAMA_USERS, TORIYAMA_PAYLOADS);
    const turn2 = results[1];

    const subject = (turn2.record.subject ?? '').toLowerCase();
    expect(subject).toContain('gohan');
    expect(subject).toContain('cell');
    expect(subject).toContain('beam struggle');
    // Costume anchors from the database, not just the model's phrase.
    expect(subject).toContain('dragon ball');
    // IP rule at extraction: a named subject locks literal-abstract.
    expect(turn2.record.ambiguousAxes).not.toContain('literal-abstract');
    // The notepad shows the full cast and the scene.
    expect(turn2.notes.cast).toContain('Gohan (Dragon Ball)');
    expect(turn2.notes.cast).toContain('Cell (Dragon Ball)');
    expect(turn2.notes.scene?.toLowerCase()).toContain('beam struggle');
    expect(turn2.notes.ipHeadsUp).toBe(true);
  });

  it('reaches the proposal on the next turn, playback naming the cast and the scene', async () => {
    const { results } = await replay(TORIYAMA_USERS, TORIYAMA_PAYLOADS);
    const turn3 = results[2];

    expect(turn3.stage).toBe('proposal');
    expect(turn3.turnLog.firedRule).toBe('judgment');
    expect(turn3.playback).toContain('Gohan');
    expect(turn3.playback).toContain('Cell');
    expect(turn3.playback!.toLowerCase()).toContain('beam struggle');
    // The inspired-by line fires with the first proposal carrying a subject.
    expect(turn3.reply).toContain(IP_NOTE);
  });

  it('never asks the evocation question twice', async () => {
    const { botReplies } = await replay(TORIYAMA_USERS, TORIYAMA_PAYLOADS);
    const stemCount = botReplies.filter((reply) => reply.includes(EVOCATION_STEM)).length;
    expect(stemCount).toBe(1);
  });
});

describe('TAT-51 — evocation discipline', () => {
  it('skips the evocation question when a subject is already on the record', async () => {
    const { results } = await replay(
      ['gon from hunter x hunter on my forearm, for my brother'],
      [
        {
          reply: 'Gon for your brother — got it. Just him, or a scene?',
          record: { placement: 'forearm', styleTags: [], meaning: 'for my brother', subject: null, references: [], ambiguousAxes: ALL_AXES },
        },
      ]
    );

    // "for my brother" matches the evocation patterns, but Gon is already a
    // named subject — the question must not fire.
    expect(results[0].turnLog.firedRule).not.toBe('evocation-question');
    expect(results[0].reply).not.toContain(EVOCATION_STEM);
    expect(results[0].record.subject?.toLowerCase()).toContain('gon');
  });

  it('a dodge is a dodge — never re-asked, and "idk" never becomes the subject', async () => {
    const users = ['ribs — my love for toriyama', 'idk man'];
    const payloads = [
      {
        reply: 'Which era of his work pulls you most?',
        record: { placement: 'ribs', styleTags: [], meaning: 'my love for toriyama', subject: null, references: [], ambiguousAxes: ALL_AXES },
      },
      {
        reply: "No rush. Is it the worlds he built, or the characters?",
        record: { placement: 'ribs', styleTags: [], meaning: 'my love for toriyama', subject: null, references: [], ambiguousAxes: ALL_AXES },
      },
    ];
    const { results } = await replay(users, payloads);

    expect(results[0].turnLog.firedRule).toBe('evocation-question');
    // The dodge does not become a scene/subject…
    expect(results[1].record.subject ?? '').not.toContain('idk');
    // …and the question is never asked again.
    expect(results[1].reply).not.toContain(EVOCATION_STEM);
    expect(results[1].turnLog.firedRule).toBe('none');
  });
});

/* ── the de-shamed meaning opener ────────────────────────────────────────── */

describe('TAT-51 — de-shamed meaning opener', () => {
  it('the opener carries the goes-hard release valve', () => {
    expect(opener()).toContain("'it just goes hard' is also a complete answer");
    // The two hard constraints survive the valve (ADR-0019).
    expect(opener().toLowerCase()).toContain('where on your body');
    expect(opener().toLowerCase()).toContain('mean');
  });

  it('"it just looks sick" records vibe=aesthetic and closes the meaning slot', async () => {
    const users = ['upper arm', 'it just looks sick'];
    const payloads = [
      {
        reply: 'Upper arm — solid canvas. What should it mean to you?',
        record: { placement: 'upper arm', styleTags: [], meaning: '', subject: null, references: [], ambiguousAxes: ALL_AXES },
      },
      {
        // The model tries to re-open the meaning question anyway.
        reply: 'I hear you — but what does it mean to you?',
        record: { placement: 'upper arm', styleTags: [], meaning: '', subject: null, references: [], ambiguousAxes: ALL_AXES },
      },
    ];
    const { results } = await replay(users, payloads);
    const turn2 = results[1];

    expect(turn2.record.vibe).toBe('aesthetic');
    // Their words become the meaning (ADR-0010) — the slot reads answered.
    expect(turn2.record.meaning).toBe('it just looks sick');
    expect(turn2.turnLog.missingFields).not.toContain('meaning');
    // The meaning question is suppressed and the answer honored in-voice.
    expect(turn2.reply).not.toMatch(/what does it mean/i);
    expect(turn2.reply).toContain(AESTHETIC_ACK);
    expect(turn2.reply).toContain(SUBJECT_GATE_QUESTION);
  });

  it('the meaning question never returns, turns later', async () => {
    const users = ['upper arm', 'it just looks sick', 'a snake maybe'];
    const payloads = [
      {
        reply: 'Upper arm — solid canvas. What should it mean to you?',
        record: { placement: 'upper arm', styleTags: [], meaning: '', subject: null, references: [], ambiguousAxes: ALL_AXES },
      },
      {
        reply: 'I hear you — but what does it mean to you?',
        record: { placement: 'upper arm', styleTags: [], meaning: '', subject: null, references: [], ambiguousAxes: ALL_AXES },
      },
      {
        // A later meaning probe must be stripped too, keeping the rest.
        reply: "A snake could coil beautifully there. What's the story behind it?",
        record: { placement: 'upper arm', styleTags: [], meaning: 'it just looks sick', subject: 'a coiled snake', references: [], ambiguousAxes: ALL_AXES },
      },
    ];
    const { results } = await replay(users, payloads);
    const turn3 = results[2];

    expect(turn3.record.vibe).toBe('aesthetic');
    expect(turn3.reply).not.toMatch(/story behind/i);
    expect(turn3.reply).toContain('A snake could coil beautifully there.');
  });
});

/* ── intent units ────────────────────────────────────────────────────────── */

describe('evocationRefOf', () => {
  it('extracts creators, franchises, and relations', () => {
    expect(evocationRefOf('my love for toriyama')).toBe('toriyama');
    expect(evocationRefOf('my love of studio ghibli')).toBe('studio ghibli');
    expect(evocationRefOf('a piece for my grandmother')).toBe('your grandmother');
    expect(evocationRefOf('us against the world with my brother')).toBe('your brother');
    expect(evocationRefOf('tribute to my favorite band, deftones')).toBe('my favorite band');
  });

  it('returns undefined for meanings that point at nothing nameable', () => {
    expect(evocationRefOf('strength through hard times')).toBeUndefined();
    expect(evocationRefOf('rebirth and starting over')).toBeUndefined();
    expect(evocationRefOf('')).toBeUndefined();
  });

  it('trims connectives from the captured reference', () => {
    expect(evocationRefOf('my love for toriyama and everything he made')).toBe('toriyama');
  });
});

describe('isAestheticAnswer', () => {
  it('accepts bare pure-looks answers', () => {
    expect(isAestheticAnswer('it just goes hard')).toBe(true);
    expect(isAestheticAnswer('it just looks sick')).toBe(true);
    expect(isAestheticAnswer('It looks cool!')).toBe(true);
    expect(isAestheticAnswer('no deeper meaning')).toBe(true);
    expect(isAestheticAnswer('just aesthetics')).toBe(true);
  });

  it('rejects answers that carry meaning alongside looks', () => {
    expect(isAestheticAnswer('it should look sick and mean rebirth')).toBe(false);
    expect(isAestheticAnswer('it means everything to me')).toBe(false);
    expect(isAestheticAnswer('a hummingbird for my grandmother')).toBe(false);
  });
});
