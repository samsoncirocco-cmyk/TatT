/**
 * TAT-50 acceptance: replay an inbound MMS carrying a character-group
 * reference image end-to-end through the REAL adapter, design-session
 * service, conversation engine, and Council structured enhancement.
 *
 * Everything external is mocked at the network/infra seam — the Twilio
 * media fetch, the Gemini vision call, the Gemini conversation call, image
 * generation, Firebase (memory stores, budget fails open) — nothing else.
 *
 * Required outcomes (the issue's acceptance list):
 *   1. an intake reference entry on the session record
 *   2. a notepad reference row (SessionNotes.references)
 *   3. the IP inspired-by note (in-voice + notes.ipHeadsUp)
 *   4. the reference's style tags reaching the enhancement path (prompts)
 *   5. an in-voice acknowledgment naming what was seen
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { converse } from '@/services/designSession';
import { memoryProfileStore, clearMemoryProfiles } from '@/services/sketchbotSms/internal/profileStore';
import { memorySessionStore, clearMemorySessions } from '@/services/designSession/internal/store';
import { generate, routeGeneration } from '@/services/generation';

// Capture after() so the deferred reveal (confirm → council → renders)
// can be driven synchronously.
const afterCallbacks: Array<() => Promise<void>> = [];
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    after: (fn: () => Promise<void>) => {
      afterCallbacks.push(fn);
    },
  };
});

vi.mock('@/lib/firebase-admin', () => ({ ensureAdminApp: vi.fn(() => null) }));
vi.mock('@/lib/google-auth-edge', () => ({ getGcpAccessToken: vi.fn(async () => 'tok') }));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, limit: 30, remaining: 29, reset: 0 })),
}));
vi.mock('@/lib/shared-design-store', () => ({ resolveSharedDesignStore: () => null }));
// The reveal captures every render into our own bucket (TAT-57) — stubbed
// here so no GCS call is made and the durable URL is predictable.
vi.mock('@/services/storage/imageStorageService', () => ({
  recoverImageAtPath: vi.fn(async () => null),
  copyImageToPath: vi.fn(
    async (objectPath: string) => `https://storage.googleapis.com/tatt-pro-assets/${objectPath}`
  ),
  uploadImageToPath: vi.fn(
    async (objectPath: string) => `https://storage.googleapis.com/tatt-pro-assets/${objectPath}`
  ),
}));
vi.mock('@/services/generation', () => ({
  generate: vi.fn(async () => ({ images: ['https://img.example/render.png'] })),
  routeGeneration: vi.fn(() => ({
    modelId: 'imagen3',
    provider: 'vertex-ai',
    aspectRatio: '9:16',
    negativePrompt: '',
    fallbackChain: [],
    reasoning: 'test route',
  })),
}));
// No Firebase account lookups in this flow.
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    getUserByPhoneNumber: vi.fn(async () => {
      throw new Error('no user record');
    }),
  })),
}));

const PHONE = '+15551230042';
const MEDIA_URL =
  'https://api.twilio.com/2010-04-01/Accounts/AC1/Messages/MM1/Media/ME1';

/** What the mocked Gemini vision model reads off Samson's screenshot. */
const VISION_JSON = {
  summary: 'five chibi anime characters, bold outlines, cel shading, red smoke background',
  subjects: ['group of five chibi characters'],
  characters: [
    { name: 'Yusuke Urameshi', series: 'Yu Yu Hakusho' },
    { name: 'Hiei', series: 'Yu Yu Hakusho' },
  ],
  styleDescriptors: ['chibi', 'anime', 'cel shading', 'bold outlines'],
  palette: ['red', 'black'],
  composition: 'group shot in a loose cluster',
  confidence: 0.9,
};

/** The mocked conversation model's double-duty turn payload. */
const CONVERSATION_JSON = {
  reply: 'That crew has real energy — I can already see the lineup.',
  record: {
    placement: 'forearm',
    styleTags: ['anime'],
    meaning: 'the crew that raised me',
    subject: '',
    references: [],
    ambiguousAxes: [],
  },
};

function geminiBody(payload: unknown) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
    }),
  } as Response;
}

const PNG = Buffer.from('png-bytes-for-the-chibi-screenshot');

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.startsWith('https://api.twilio.com/')) {
    return {
      ok: true,
      status: 200,
      headers: { get: (n: string) => (n.toLowerCase() === 'content-type' ? 'image/png' : null) },
      arrayBuffer: async () => PNG.buffer.slice(PNG.byteOffset, PNG.byteOffset + PNG.byteLength),
    } as unknown as Response;
  }
  if (url.includes('gemini-vision-test')) return geminiBody(VISION_JSON);
  if (url.includes('gemini-conv-test')) return geminiBody(CONVERSATION_JSON);
  throw new Error(`unexpected fetch in acceptance test: ${url}`);
});

function webhookRequest(params: Record<string, string>): NextRequest {
  return new NextRequest('https://tatttester.com/api/webhooks/twilio', {
    method: 'POST',
    body: new URLSearchParams(params).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
  clearMemoryProfiles();
  clearMemorySessions();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('SKETCHBOT_SMS_ENABLED', 'true');
  vi.stubEnv('SKETCHBOT_SMS_ALLOW_UNSIGNED', 'true');
  vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
  vi.stubEnv('GCP_PROJECT_ID', 'tatt-test');
  vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON', '{"stub":true}');
  vi.stubEnv('VISION_MODEL', 'gemini-vision-test');
  vi.stubEnv('CONVERSATION_MODEL', 'gemini-conv-test');
  vi.stubEnv('OPENROUTER_API_KEY', '');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('TAT-50 acceptance — MMS reference image end to end', () => {
  it('acknowledges, records, IP-notes, and threads the reference into enhancement', async () => {
    // ── The MMS: a chibi group screenshot + placement + a draw request ──
    const res = await POST(
      webhookRequest({
        From: PHONE,
        Body: 'these five on my forearm — just draw it',
        NumMedia: '1',
        MediaUrl0: MEDIA_URL,
        MediaContentType0: 'image/png',
      })
    );
    expect(res.status).toBe(200);
    const twiml = await res.text();

    // (5) In-voice acknowledgment naming what was seen — never silent.
    expect(twiml).toContain('five chibi anime characters, bold outlines');
    // (3) The IP inspired-by note, spoken: the recognized characters ran
    // through the same machinery as a typed mention and locked a subject.
    expect(twiml).toContain('inspired-by takes');

    // ── The session record ──
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.activeSessionId).toBeTruthy();
    const sessionId = profile!.activeSessionId!;
    const stored = await memorySessionStore.get(sessionId);

    // (1) Intake reference entry, plus the merged signals.
    expect(stored!.conversation!.references).toHaveLength(1);
    expect(stored!.conversation!.record.references).toContain(
      'reference image: five chibi anime characters, bold outlines, cel shading, red smoke background'
    );
    expect(stored!.conversation!.record.styleTags).toContain('anime');
    // The character database's costume anchors won (TAT-47 parity).
    expect(stored!.conversation!.record.subject!.toLowerCase()).toContain('yusuke');
    expect(stored!.conversation!.record.subject!.toLowerCase()).toContain('hiei');

    // (2) Notepad reference row on the next turn's projection.
    const turn = await converse({ sessionId, message: 'that is exactly it' });
    expect(turn.notes!.references).toEqual([
      'five chibi anime characters, bold outlines, cel shading, red smoke background',
    ]);
    expect(turn.notes!.ipHeadsUp).toBe(true);

    // ── The yes: reveal fires through council + generation ──
    const confirmRes = await POST(webhookRequest({ From: PHONE, Body: 'yes' }));
    expect(await confirmRes.text()).toContain('sketching four takes');
    expect(afterCallbacks).toHaveLength(1);
    await afterCallbacks[0]();

    const revealed = await memorySessionStore.get(sessionId);
    expect(revealed!.phase).toBe('revealed');
    // The Brief lane (ADR-0019): the reference line rides on the intake.
    expect(revealed!.intake.references).toContain(
      'reference image: five chibi anime characters, bold outlines, cel shading, red smoke background'
    );
    expect(revealed!.intake.styleTags).toContain('anime');

    // (4) Style/subject signal reached the enhancement path: the Council's
    // structured prompts carry the reference's style tag and characters.
    expect(vi.mocked(generate)).toHaveBeenCalledTimes(4);
    expect(revealed!.variations).toHaveLength(4);
    const prompt = revealed!.variations[0].prompt.toLowerCase();
    expect(prompt).toContain('anime');
    expect(prompt).toContain('yusuke');
    expect(vi.mocked(routeGeneration)).toHaveBeenCalledWith(
      expect.objectContaining({ style: expect.any(String), bodyPart: 'forearm' })
    );
  });
});
