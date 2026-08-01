/**
 * Regression for the founder-reported production session (2026-07-30).
 *
 * The user named seven characters, but the proposal playback and generation
 * brief collapsed to Cloud alone. The provider had extracted the complete
 * cast; deterministic database enrichment recognized only Cloud and replaced
 * the complete subject with that partial match.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { opener, runTurn, type ConversationMessage } from '../index';
import { resetStyleTagCache } from '../internal/ontology';
import { enhanceStructured } from '../../council';
import type { IntakeRecord } from '../../intake/types';

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

const CAST = ['Sora', 'Roxas', 'Riku', 'Cloud Strife', 'Mickey', 'Donald', 'Goofy'];
const IDENTITIES = CAST.map((name) => ({ name, series: 'Kingdom Hearts' }));

const MESSAGES: ConversationMessage[] = [
  { role: 'bot', text: opener() },
  {
    role: 'user',
    text: 'a kingdom hearts sleeve in the style of akira toriyama',
  },
  {
    role: 'bot',
    text: 'Where on your arm are you thinking of getting this done?',
  },
  { role: 'user', text: 'left arm elbow to wrist' },
  {
    role: 'bot',
    text: 'What characters or moments from Kingdom Hearts are you envisioning?',
  },
  {
    role: 'user',
    text: 'sora, roxas, riku, cloud strife, mickey, donald, and goofy',
  },
];

async function runCase(subject: string | null, characters: string[] = CAST) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      vertexResponse({
        reply: 'Seven characters across the sleeve. Ready for four directions.',
        record: {
          placement: 'left arm elbow to wrist',
          styleTags: ['anime', 'color'],
          meaning: 'a Kingdom Hearts sleeve in the style of Akira Toriyama',
          subject,
          characters,
          characterIdentities: IDENTITIES,
          references: [],
          ambiguousAxes: ['bold-fine', 'minimal-ornate'],
        },
      })
    )
  );
  return runTurn({ messages: MESSAGES, userTurn: 3 });
}

function expectCompleteCast(result: Awaited<ReturnType<typeof runTurn>>) {
  for (const name of CAST) {
    expect(result.record.subject, `brief lost ${name}`).toMatch(
      new RegExp(`\\b${name}\\b`, 'i')
    );
    expect(result.playback, `playback lost ${name}`).toMatch(
      new RegExp(`\\b${name}\\b`, 'i')
    );
    expect(result.notes.cast.join(' '), `notepad lost ${name}`).toMatch(
      new RegExp(`\\b${name}\\b`, 'i')
    );
  }
  expect(result.record.requestedCharacters).toEqual(CAST);
  expect(result.record.characterIdentities).toEqual(IDENTITIES);
  expect(result.notes.cast).toEqual(CAST);
}

async function expectGenerationKeepsCompleteCast(
  result: Awaited<ReturnType<typeof runTurn>>
) {
  expect(result.record.placement).toBeTruthy();
  const enhanced = await enhanceStructured(result.record as IntakeRecord);
  for (const variation of enhanced.variations) {
    for (const prompt of Object.values(variation.prompts)) {
      if (!prompt) continue;
      expect(prompt).toContain('Kingdom Hearts');
      expect(prompt).not.toContain('No Game No Life');
      for (const name of CAST) {
        expect(prompt, `generation prompt lost ${name}`).toMatch(
          new RegExp(`\\b${name}\\b`, 'i')
        );
      }
    }
  }
}

describe('Kingdom Hearts sleeve cast preservation', () => {
  it('keeps all seven user-named characters in the playback and generation brief', async () => {
    const result = await runCase(
      'Sora, Roxas, Riku, Cloud Strife, Mickey, Donald, and Goofy'
    );
    expectCompleteCast(result);
    await expectGenerationKeepsCompleteCast(result);
  });

  it('repairs a provider subject that extracted only Cloud', async () => {
    const result = await runCase('Cloud Strife');
    expectCompleteCast(result);
    await expectGenerationKeepsCompleteCast(result);
  });

  it('builds the subject from the structured roster when provider subject is null', async () => {
    const result = await runCase(null);
    expectCompleteCast(result);
    await expectGenerationKeepsCompleteCast(result);
  });

  it('rejects provider roster names the customer never requested', async () => {
    const result = await runCase(
      'Sora, Roxas, Riku, Cloud Strife, Mickey, Donald, and Goofy',
      [...CAST, 'Sephiroth']
    );
    expectCompleteCast(result);
    expect(result.record.requestedCharacters).not.toContain('Sephiroth');
    expect(result.record.subject).not.toMatch(/\bSephiroth\b/i);
  });
});
