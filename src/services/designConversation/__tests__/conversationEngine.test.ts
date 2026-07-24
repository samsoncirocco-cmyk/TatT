/**
 * Conversation engine tests (ADR-0019, ADR-0020, ADR-0021, ADR-0022).
 *
 * Providers are fully mocked — no live LLM/API calls. The ontology comes
 * from a local fixture (never the real data/style-ontology.json, owned by
 * another workstream) via the STYLE_ONTOLOGY_PATH override.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  opener,
  runTurn,
  ConversationUnavailableError,
  HANDOFF_URL,
  type ConversationMessage,
} from '../index';
import { scoreRecord, CONFIDENCE_THRESHOLD } from '../internal/confidence';
import { resetStyleTagCache } from '../internal/ontology';
import { logger } from '@/lib/logger';

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

// Every env var the module reads — cleared per test so cases are hermetic
// regardless of the developer's local .env.
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

/* ── helpers ─────────────────────────────────────────────────────────────── */

function configureVertex() {
  process.env.NEXT_PUBLIC_VERTEX_AI_PROJECT_ID = 'tatt-test';
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = '{"project_id":"tatt-test"}';
}

function configureOpenRouter() {
  process.env.OPENROUTER_API_KEY = 'test-key';
}

function vertexResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
    }),
  };
}

function openRouterResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    }),
  };
}

function stubFetchNever() {
  const fetchMock = vi.fn(() => {
    throw new Error('unexpected network call in offline test');
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const MESSAGES: ConversationMessage[] = [
  { role: 'bot', text: opener() },
  { role: 'user', text: 'thinking my left forearm, a hummingbird for my grandmother' },
];

/** Rich extraction: confidence 0.8 (0.3 placement + 0.3 meaning + 0.1 tag + 0.1 axes). */
const RICH_PAYLOAD = {
  reply: 'Love that — fine line suits a hummingbird beautifully.',
  record: {
    placement: 'left forearm',
    styleTags: ['fine line'],
    meaning: 'a hummingbird for my grandmother, delicate and warm',
    references: [],
    ambiguousAxes: ['color-blackwork', 'literal-abstract'],
  },
};

/** Sparse extraction: confidence 0. */
const SPARSE_PAYLOAD = {
  reply: 'Where on your body are you thinking?',
  record: {
    placement: '',
    styleTags: [],
    meaning: '',
    references: [],
    ambiguousAxes: ['bold-fine', 'color-blackwork', 'literal-abstract', 'minimal-ornate'],
  },
};

/* ── opener ──────────────────────────────────────────────────────────────── */

describe('opener', () => {
  it('is deterministic and leads with placement and meaning (ADR-0019)', () => {
    expect(opener()).toBe(opener());
    expect(opener().toLowerCase()).toContain('where on your body');
    expect(opener().toLowerCase()).toContain('mean');
  });
});

/* ── cadence: judgment fire / no-fire ────────────────────────────────────── */

describe('runTurn — judgment cadence', () => {
  it('fires the proposal when the record completes early (ADR-0020)', async () => {
    configureVertex();
    const fetchMock = vi.fn().mockResolvedValue(vertexResponse(RICH_PAYLOAD));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runTurn({ messages: MESSAGES, userTurn: 3 });

    expect(result.stage).toBe('proposal');
    expect(result.turnLog.firedRule).toBe('judgment');
    expect(result.turnLog.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
    expect(result.playback).toBeTruthy();
    // ADR-0020's exact phrasing style.
    expect(result.reply).toBe(
      `Here's what I'm hearing: ${result.playback}. Want to see four takes on this, or did I miss something?`
    );
    expect(result.playback).toContain('fine line');
    expect(result.playback).toContain('left forearm');
    expect(result.record.placement).toBe('left forearm');
  });

  it('does not fire below the threshold — the model reply passes through', async () => {
    configureVertex();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(vertexResponse(SPARSE_PAYLOAD)));

    const result = await runTurn({ messages: MESSAGES, userTurn: 3 });

    expect(result.stage).toBe('chatting');
    expect(result.turnLog.firedRule).toBe('none');
    expect(result.turnLog.confidence).toBeLessThan(CONFIDENCE_THRESHOLD);
    expect(result.playback).toBeUndefined();
    expect(result.reply).toBe(SPARSE_PAYLOAD.reply);
  });

  it('requires placement AND meaning even at high confidence', async () => {
    configureVertex();
    // Strong style/axis signal but no placement: 0.3 meaning + 0.2 tags +
    // 0.2 axes = 0.7 — meets the threshold but must NOT fire.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        vertexResponse({
          reply: 'Sounds striking. Where would it live on your body?',
          record: {
            placement: '',
            styleTags: ['blackwork', 'japanese'],
            meaning: 'a koi swimming upstream for perseverance through hard years',
            references: [],
            ambiguousAxes: [],
          },
        })
      )
    );

    const result = await runTurn({ messages: MESSAGES, userTurn: 4 });

    expect(result.turnLog.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
    expect(result.stage).toBe('chatting');
    expect(result.turnLog.firedRule).toBe('none');
  });
});

/* ── cadence: forced proposal and handoff ────────────────────────────────── */

describe('runTurn — forced cadence (deterministic code, not model judgment)', () => {
  it('forces the proposal at user turn 12 with a best-guess playback', async () => {
    configureVertex();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(vertexResponse(SPARSE_PAYLOAD)));

    const result = await runTurn({ messages: MESSAGES, userTurn: 12 });

    expect(result.stage).toBe('proposal');
    expect(result.turnLog.firedRule).toBe('turn12-force-proposal');
    expect(result.playback).toBeTruthy();
    expect(result.reply).toContain("Here's what I'm hearing:");
    expect(result.reply).toContain('Want to see four takes on this, or did I miss something?');
    // Best guess on a sparse record still reads as a judgment call, not a limit.
    expect(result.reply).not.toMatch(/limit|turn|cap/i);
  });

  it('hands off warmly at user turn 20 (ADR-0021 phrasing, never a limit)', async () => {
    configureVertex();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(vertexResponse(SPARSE_PAYLOAD)));

    const result = await runTurn({ messages: MESSAGES, userTurn: 20 });

    expect(result.stage).toBe('handoff');
    expect(result.turnLog.firedRule).toBe('turn20-handoff');
    expect(result.reply).toBe(
      "Sounds like you're still working out the concept — that's actually a " +
        'great reason to talk to an artist directly. Want me to find a few who do ' +
        'free consultations in your style?'
    );
    expect(result.reply).not.toMatch(/limit|cap/i);
    expect(HANDOFF_URL).toBe('/smart-match');
  });
});

/* ── confidence formula ──────────────────────────────────────────────────── */

describe('confidence scoring', () => {
  it('is monotonically non-decreasing as the record grows', () => {
    const growth = [
      {},
      { placement: 'arm' },
      { placement: 'left forearm' },
      { placement: 'left forearm', meaning: 'for grandma' },
      {
        placement: 'left forearm',
        meaning: 'a hummingbird for my grandmother who fed them',
      },
      {
        placement: 'left forearm',
        meaning: 'a hummingbird for my grandmother who fed them',
        styleTags: ['fine-line'],
      },
      {
        placement: 'left forearm',
        meaning: 'a hummingbird for my grandmother who fed them',
        styleTags: ['fine-line', 'blackwork'],
        ambiguousAxes: ['literal-abstract' as const],
      },
      {
        placement: 'left forearm',
        meaning: 'a hummingbird for my grandmother who fed them',
        styleTags: ['fine-line', 'blackwork'],
        ambiguousAxes: [],
      },
    ];

    const scores = growth.map((record) => scoreRecord(record).confidence);
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
    expect(scores[0]).toBe(0);
    expect(scores[scores.length - 1]).toBe(1);
  });

  it('reports missing/weak fields', () => {
    expect(scoreRecord({}).missingFields).toEqual([
      'placement',
      'meaning',
      'styleTags',
    ]);
    // Vague placement and trivial meaning are weak, not full credit.
    const weak = scoreRecord({ placement: 'arm', meaning: 'for grandma', styleTags: ['fine-line'] });
    expect(weak.missingFields).toEqual(['placement', 'meaning', 'styleTags']);
    const full = scoreRecord({
      placement: 'left forearm',
      meaning: 'a hummingbird for my grandmother who fed them',
      styleTags: ['fine-line', 'blackwork'],
      ambiguousAxes: [],
    });
    expect(full.missingFields).toEqual([]);
  });

  it('surfaces missingFields in the TurnLog', async () => {
    configureVertex();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(vertexResponse(SPARSE_PAYLOAD)));

    const result = await runTurn({ messages: MESSAGES, userTurn: 2 });

    expect(result.turnLog.missingFields).toEqual(['placement', 'meaning', 'styleTags']);
  });
});

/* ── extraction contract ─────────────────────────────────────────────────── */

describe('runTurn — extraction sanitization', () => {
  it('validates style tags against the closed ontology (aliases resolve, unknowns drop)', async () => {
    configureVertex();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        vertexResponse({
          reply: 'Nice.',
          record: {
            placement: 'Ribs',
            styleTags: ['Old School', 'fineline', 'trash-polka'],
            meaning: 'a bold eagle for my dad who served in the navy',
            references: ['https://pin.it/abc'],
            ambiguousAxes: ['color-blackwork', 'not-an-axis'],
          },
        })
      )
    );

    const result = await runTurn({ messages: MESSAGES, userTurn: 2 });

    expect(result.record.styleTags).toEqual(['american-traditional', 'fine-line']);
    expect(result.record.placement).toBe('ribs');
    expect(result.record.references).toEqual(['https://pin.it/abc']);
    // Non-pool axes are filtered out.
    expect(result.record.ambiguousAxes).toEqual(['color-blackwork']);
    // Meaning survives as given — the engine never rewrites it.
    expect(result.record.meaning).toBe('a bold eagle for my dad who served in the navy');
  });
});

/* ── providers ───────────────────────────────────────────────────────────── */

describe('runTurn — provider chain', () => {
  it('prefers Vertex, honors CONVERSATION_MODEL, and records the model in the TurnLog', async () => {
    configureVertex();
    configureOpenRouter();
    process.env.CONVERSATION_MODEL = 'gemini-2.5-flash-lite';
    const fetchMock = vi.fn().mockResolvedValue(vertexResponse(SPARSE_PAYLOAD));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runTurn({ messages: MESSAGES, userTurn: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('aiplatform.googleapis.com');
    expect(fetchMock.mock.calls[0][0]).toContain('gemini-2.5-flash-lite');
    expect(result.turnLog.model).toBe('gemini-2.5-flash-lite');
  });

  it('falls back to GLM-5.2 via OpenRouter when Vertex fails', async () => {
    configureVertex();
    configureOpenRouter();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('vertex down'))
      .mockResolvedValueOnce(openRouterResponse(SPARSE_PAYLOAD));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runTurn({ messages: MESSAGES, userTurn: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('aiplatform.googleapis.com');
    expect(fetchMock.mock.calls[1][0]).toContain('openrouter.ai');
    const openRouterBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(openRouterBody.model).toBe('z-ai/glm-5.2');
    expect(result.turnLog.model).toBe('z-ai/glm-5.2');
  });

  it('tries the pinned model first (per-session pinning is the caller job)', async () => {
    configureVertex();
    configureOpenRouter();
    const fetchMock = vi.fn().mockResolvedValue(openRouterResponse(SPARSE_PAYLOAD));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runTurn({
      messages: MESSAGES,
      userTurn: 2,
      pinnedModel: 'z-ai/glm-5.2',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('openrouter.ai');
    expect(result.turnLog.model).toBe('z-ai/glm-5.2');
  });

  it('throws ConversationUnavailableError when every provider fails', async () => {
    configureVertex();
    configureOpenRouter();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('everything down')));

    await expect(runTurn({ messages: MESSAGES, userTurn: 1 })).rejects.toBeInstanceOf(
      ConversationUnavailableError
    );
  });

  it('throws ConversationUnavailableError when no provider is configured', async () => {
    const fetchMock = stubFetchNever();

    const rejection = runTurn({ messages: MESSAGES, userTurn: 1 });
    await expect(rejection).rejects.toBeInstanceOf(ConversationUnavailableError);
    await rejection.catch((error: ConversationUnavailableError) => {
      expect(error.attempts.map((a) => a.provider)).toEqual(['vertex', 'openrouter']);
      expect(error.attempts.every((a) => a.reason === 'not configured')).toBe(true);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/* ── demo mode ───────────────────────────────────────────────────────────── */

describe('runTurn — demo mode (NEXT_PUBLIC_DEMO_MODE)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
  });

  it('is deterministic and never calls a provider', async () => {
    const fetchMock = stubFetchNever();

    const first = await runTurn({ messages: MESSAGES, userTurn: 1 });
    const again = await runTurn({ messages: MESSAGES, userTurn: 1 });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(first).toEqual(again);
    expect(first.stage).toBe('chatting');
    expect(first.turnLog.model).toBe('demo-script');
  });

  it('plays opener → two follow-ups → fixed proposal with a demo record', async () => {
    stubFetchNever();

    const turn1 = await runTurn({ messages: MESSAGES, userTurn: 1 });
    const turn2 = await runTurn({ messages: MESSAGES, userTurn: 2 });
    const turn3 = await runTurn({ messages: MESSAGES, userTurn: 3 });
    const turn5 = await runTurn({ messages: MESSAGES, userTurn: 5 });

    expect(turn1.stage).toBe('chatting');
    expect(turn2.stage).toBe('chatting');
    expect(turn3.stage).toBe('proposal');
    expect(turn3.turnLog.firedRule).toBe('judgment');
    expect(turn3.playback).toBeTruthy();
    expect(turn3.reply).toContain("Here's what I'm hearing:");
    expect(turn3.record).toEqual({
      placement: 'left forearm',
      styleTags: ['fine-line'],
      meaning: 'a hummingbird for my grandmother — she fed them every morning',
      references: [],
      ambiguousAxes: ['color-blackwork', 'literal-abstract'],
    });
    // The script holds at the proposal beat (only the turn counter moves on).
    expect(turn5).toEqual({
      ...turn3,
      turnLog: { ...turn3.turnLog, turn: 5 },
    });
    // Same TurnLog discipline: confidence from the real scorer, monotone.
    expect(turn2.turnLog.confidence).toBeGreaterThanOrEqual(turn1.turnLog.confidence);
    expect(turn3.turnLog.confidence).toBeGreaterThanOrEqual(turn2.turnLog.confidence);
  });
});

/* ── TurnLog discipline (ADR-0022) ───────────────────────────────────────── */

describe('TurnLog — always present, always logged', () => {
  it('every live turn returns a full TurnLog and logs it via the repo logger', async () => {
    configureVertex();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(vertexResponse(RICH_PAYLOAD)));

    const result = await runTurn({ messages: MESSAGES, userTurn: 3 });

    expect(result.turnLog).toEqual({
      turn: 3,
      confidence: expect.any(Number),
      missingFields: expect.any(Array),
      firedRule: 'judgment',
      model: 'gemini-2.5-flash-lite',
    });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'design_conversation.turn',
        stage: 'proposal',
        turn: 3,
        firedRule: 'judgment',
        model: 'gemini-2.5-flash-lite',
      })
    );
  });

  it('demo turns keep the same TurnLog discipline', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    stubFetchNever();

    const result = await runTurn({ messages: MESSAGES, userTurn: 2 });

    expect(result.turnLog.turn).toBe(2);
    expect(result.turnLog.model).toBe('demo-script');
    expect(result.turnLog.missingFields).toBeInstanceOf(Array);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'design_conversation.turn',
        model: 'demo-script',
        turn: 2,
      })
    );
  });
});
