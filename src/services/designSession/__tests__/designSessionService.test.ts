/**
 * Design-session orchestrator tests (ADR-0012, ADR-0013, ADR-0016).
 *
 * Every module boundary is mocked — intake, council, generation, durable
 * image storage, the budget ledger, and the Firebase Admin bootstrap (forced
 * off, so persistence runs on the in-memory store). No live provider, GCS, or
 * Firestore call is ever made.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEMO_MOCK_IMAGES } from '@/lib/demo-images';
import {
  startSession,
  recordPick,
  refine,
  getSession,
  attachPlacementPreview,
  DesignSessionError,
} from '../index';
import { memorySessionStore, clearMemorySessions } from '../internal/store';
import type { StoredSession } from '../internal/store';
import { extractIntake } from '../../intake';
import { enhanceStructured } from '../../council';
import { generate, routeGeneration } from '../../generation';
import {
  copyImageToPath,
  recoverImageAtPath,
  uploadImageToPath,
} from '@/services/storage/imageStorageService';
import { recordSpend } from '@/lib/budget-tracker';
import type { IntakeRecord } from '../../intake/types';

vi.mock('../../intake', () => ({ extractIntake: vi.fn() }));
vi.mock('../../council', () => ({ enhanceStructured: vi.fn() }));
vi.mock('../../generation', () => ({ generate: vi.fn(), routeGeneration: vi.fn() }));
vi.mock('@/lib/firebase-admin', () => ({ ensureAdminApp: vi.fn(() => false) }));
vi.mock('@/services/storage/imageStorageService', () => ({
  recoverImageAtPath: vi.fn(),
  copyImageToPath: vi.fn(),
  uploadImageToPath: vi.fn(),
}));
vi.mock('@/lib/budget-tracker', () => ({
  recordSpend: vi.fn(),
  VERTEX_IMAGEN_COST_CENTS: 4,
}));

const mockExtractIntake = vi.mocked(extractIntake);
const mockEnhanceStructured = vi.mocked(enhanceStructured);
const mockGenerate = vi.mocked(generate);
const mockRouteGeneration = vi.mocked(routeGeneration);
const mockRecoverImageAtPath = vi.mocked(recoverImageAtPath);
const mockCopyImageToPath = vi.mocked(copyImageToPath);
const mockUploadImageToPath = vi.mocked(uploadImageToPath);
const mockRecordSpend = vi.mocked(recordSpend);

/** Where a durable copy lands — the shape imageStorageService returns. */
const BUCKET_URL = 'https://storage.googleapis.com/tatt-pro-assets';
const durableUrl = (objectPath: string) => `${BUCKET_URL}/${objectPath}`;

const intakeRecord: IntakeRecord = {
  placement: 'ribs',
  styleTags: ['fine-line'],
  meaning: 'a sparrow for my grandmother, exactly as I said it',
  references: ['https://example.com/ref.jpg'],
  ambiguousAxes: ['bold-fine', 'color-blackwork'],
};

// Council output, questionnaire mode. Axes are in the Council's priority
// order (color-blackwork before bold-fine), so color-blackwork is dominant.
const questionnaireEnhance = {
  axisSelection: {
    mode: 'questionnaire' as const,
    axes: ['color-blackwork' as const, 'bold-fine' as const],
    rationale: 'test rationale',
  },
  variations: [
    {
      axisPosition: { 'color-blackwork': 'color', 'bold-fine': 'bold' },
      prompts: { simple: 's1', detailed: 'd1', ultra: 'u1' },
      negativePrompt: 'n1',
    },
    {
      axisPosition: { 'color-blackwork': 'color', 'bold-fine': 'fine' },
      prompts: { simple: 's2', detailed: 'd2' },
      negativePrompt: 'n2',
    },
    {
      axisPosition: { 'color-blackwork': 'blackwork', 'bold-fine': 'bold' },
      prompts: { detailed: 'd3' },
      negativePrompt: 'n3',
    },
    {
      // No detailed tier — the service must fall back to simple.
      axisPosition: { 'color-blackwork': 'blackwork', 'bold-fine': 'fine' },
      prompts: { simple: 's4' },
      negativePrompt: 'n4',
    },
  ],
};

const compositionalEnhance = {
  axisSelection: {
    mode: 'compositional' as const,
    axes: [],
    rationale: 'style resolved',
  },
  variations: [
    { axisPosition: { composition: 'centered emblem' }, prompts: { detailed: 'c1' }, negativePrompt: 'n' },
    { axisPosition: { composition: 'dynamic flow' }, prompts: { detailed: 'c2' }, negativePrompt: 'n' },
    { axisPosition: { composition: 'negative space' }, prompts: { detailed: 'c3' }, negativePrompt: 'n' },
    { axisPosition: { composition: 'close crop' }, prompts: { detailed: 'c4' }, negativePrompt: 'n' },
  ],
};

const vertexRoute = {
  modelId: 'imagen3',
  provider: 'vertex-ai' as const,
  aspectRatio: '9:16' as const,
  negativePrompt: '',
  fallbackChain: [],
  reasoning: 'test route',
};

let imageCounter = 0;

beforeEach(() => {
  vi.clearAllMocks();
  clearMemorySessions();
  imageCounter = 0;

  mockExtractIntake.mockResolvedValue(intakeRecord);
  mockEnhanceStructured.mockResolvedValue(questionnaireEnhance);
  mockRouteGeneration.mockReturnValue(vertexRoute);
  mockRecoverImageAtPath.mockResolvedValue(null);
  mockCopyImageToPath.mockImplementation(async objectPath => durableUrl(objectPath));
  mockUploadImageToPath.mockImplementation(async objectPath => durableUrl(objectPath));
  mockRecordSpend.mockResolvedValue(undefined);
  mockGenerate.mockImplementation(async request => ({
    images: [`https://replicate.delivery/pbxt/${++imageCounter}/out.png`],
    metadata: {
      model: request.modelId ?? 'unknown',
      provider: 'vertex-ai' as const,
      generatedAt: new Date().toISOString(),
      durationMs: 1,
      attempts: 1,
      fallbackUsed: false,
    },
  }));
});

const startRequest = { placementAnswer: 'on my ribs', meaningAnswer: 'a sparrow for my grandmother' };

/** Drive a fresh session to phase 'picked'. */
async function startAndPick(pickId = 'v3', mostNotYouId = 'v2') {
  const session = await startSession(startRequest);
  return recordPick(session.id, { pickId, mostNotYouId });
}

describe('startSession', () => {
  it('runs intake → council → four renders and persists a revealed session', async () => {
    const session = await startSession(startRequest);

    expect(mockExtractIntake).toHaveBeenCalledWith(startRequest);
    expect(mockEnhanceStructured).toHaveBeenCalledWith(intakeRecord);
    expect(mockGenerate).toHaveBeenCalledTimes(4);

    expect(session.phase).toBe('revealed');
    expect(session.intake).toEqual(intakeRecord);
    expect(session.axisSelection).toEqual(questionnaireEnhance.axisSelection);
    expect(session.provider).toBe('vertex-ai');
    expect(session.variations).toHaveLength(4);
    expect(session.variations.map(v => v.id)).toEqual(['v1', 'v2', 'v3', 'v4']);
    for (const variation of session.variations) {
      expect(variation.imageUrl).toMatch(/^https:\/\/storage\.googleapis\.com\//);
    }
    expect(session.variations[2].axisPosition).toEqual({
      'color-blackwork': 'blackwork',
      'bold-fine': 'bold',
    });

    // Persisted: readable back via the public getter.
    const fetched = await getSession(session.id);
    expect(fetched).toEqual(session);
  });

  it('generates from the detailed prompt tier, falling back when the Council dropped it', async () => {
    const session = await startSession(startRequest);

    const prompts = mockGenerate.mock.calls.map(([request]) => request.prompt);
    expect(prompts).toEqual(['d1', 'd2', 'd3', 's4']);
    expect(session.variations.map(v => v.prompt)).toEqual(['d1', 'd2', 'd3', 's4']);
    expect(mockGenerate.mock.calls[0][0].negativePrompt).toBe('n1');
  });

  it('resolves the route once and pins one model for all four renders (ADR-0016)', async () => {
    await startSession(startRequest);

    expect(mockRouteGeneration).toHaveBeenCalledTimes(1);
    expect(mockRouteGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ style: ['fine-line'], bodyPart: 'ribs' })
    );
    for (const [request] of mockGenerate.mock.calls) {
      expect(request.modelId).toBe('imagen3');
      expect(request.aspectRatio).toBe('9:16');
      expect(request.numImages).toBe(1);
      // Provider fallback would cross providers mid-session — must be off.
      expect(request.allowProviderFallback).toBe(false);
    }
  });
});

describe('recordPick', () => {
  it('moves to picked and derives the dominant-axis question (questionnaire mode)', async () => {
    const session = await startAndPick('v3', 'v2');

    expect(session.phase).toBe('picked');
    expect(session.pickId).toBe('v3');
    expect(session.mostNotYouId).toBe('v2');
    // v3's dominant axis is color-blackwork (first in the selection order),
    // pole 'blackwork' → probe that pole.
    expect(session.refinementQuestion).toBe('Too stark, or not stark enough?');
  });

  it('probes the bold pole when the pick sits there', async () => {
    mockEnhanceStructured.mockResolvedValue({
      ...questionnaireEnhance,
      axisSelection: {
        mode: 'questionnaire' as const,
        axes: ['bold-fine' as const, 'color-blackwork' as const],
        rationale: 'bold-fine dominant',
      },
    });
    const session = await startAndPick('v1', 'v4');
    expect(session.refinementQuestion).toBe('Too bold, or not bold enough?');
  });

  it('asks the permanence question in compositional mode', async () => {
    mockEnhanceStructured.mockResolvedValue(compositionalEnhance);
    const session = await startAndPick('v1', 'v3');
    expect(session.refinementQuestion).toBe(
      "Does this feel permanent to you — like something you'd still want in ten years?"
    );
  });

  it('allows a re-cut to replace the pick before the final refinement', async () => {
    const session = await startAndPick();
    const repicked = await recordPick(session.id, { pickId: 'v1', mostNotYouId: 'v4' });

    expect(repicked.phase).toBe('picked');
    expect(repicked.pickId).toBe('v1');
    expect(repicked.mostNotYouId).toBe('v4');
    expect(repicked.refinementQuestion).toBe('Too colorful, or not colorful enough?');
  });

  it('rejects a pick before the reveal', async () => {
    const preReveal: StoredSession = {
      id: 'pre-reveal',
      phase: 'intake',
      intake: intakeRecord,
      axisSelection: questionnaireEnhance.axisSelection,
      provider: 'vertex-ai',
      pinnedModelId: 'imagen3',
      variations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await memorySessionStore.save(preReveal);

    await expect(recordPick('pre-reveal', { pickId: 'v1', mostNotYouId: 'v2' })).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
  });

  it('rejects identical pick and most-not-you ids', async () => {
    const session = await startSession(startRequest);
    await expect(recordPick(session.id, { pickId: 'v1', mostNotYouId: 'v1' })).rejects.toMatchObject({
      code: 'INVALID_VARIATION',
    });
  });

  it('rejects unknown variation ids', async () => {
    const session = await startSession(startRequest);
    await expect(recordPick(session.id, { pickId: 'v9', mostNotYouId: 'v1' })).rejects.toMatchObject({
      code: 'INVALID_VARIATION',
    });
    await expect(recordPick(session.id, { pickId: 'v1', mostNotYouId: 'nope' })).rejects.toMatchObject({
      code: 'INVALID_VARIATION',
    });
  });

  it('throws SESSION_NOT_FOUND for an unknown session', async () => {
    await expect(recordPick('missing', { pickId: 'v1', mostNotYouId: 'v2' })).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
      status: 404,
    });
  });
});

describe('refine', () => {
  it('regenerates once, closes the session, and stores the refined variation', async () => {
    const picked = await startAndPick('v3', 'v2');
    const session = await refine(picked.id, { answer: 'not stark enough' });

    expect(session.phase).toBe('complete');
    expect(session.refinementAnswer).toBe('not stark enough');
    expect(mockGenerate).toHaveBeenCalledTimes(5);

    const refined = session.refinedVariation;
    expect(refined).toBeDefined();
    expect(refined?.id).toBe('v3-refined');
    expect(refined?.axisPosition).toEqual(picked.variations[2].axisPosition);
    expect(refined?.imageUrl).toMatch(/^https:\/\/storage\.googleapis\.com\//);
    // Template adjustment: picked prompt kept, intensifying modifier appended.
    expect(refined?.prompt).toContain('d3');
    expect(refined?.prompt).toContain('deeper solid blacks');
  });

  it('softens instead when the answer says too much', async () => {
    const picked = await startAndPick('v3', 'v2');
    const session = await refine(picked.id, { answer: 'too stark for me' });
    expect(session.refinedVariation?.prompt).toContain('softer greywash');
  });

  it('answers the permanence question with a timeless treatment when the user doubts', async () => {
    mockEnhanceStructured.mockResolvedValue(compositionalEnhance);
    const picked = await startAndPick('v1', 'v3');
    const session = await refine(picked.id, { answer: "honestly I'm not sure" });
    expect(session.refinedVariation?.prompt).toContain('timeless');
  });

  it('regenerates on the pinned model even if routing would now pick another (ADR-0016)', async () => {
    const picked = await startAndPick('v3', 'v2');

    // Routing config "changes" mid-session — the pin must win.
    mockRouteGeneration.mockReturnValue({
      ...vertexRoute,
      modelId: 'sdxl',
      provider: 'replicate' as const,
    });
    const session = await refine(picked.id, { answer: 'not stark enough' });

    // The route was resolved exactly once, at session start.
    expect(mockRouteGeneration).toHaveBeenCalledTimes(1);
    const [regenRequest] = mockGenerate.mock.calls[4];
    expect(regenRequest.modelId).toBe('imagen3');
    expect(regenRequest.allowProviderFallback).toBe(false);
    expect(session.provider).toBe('vertex-ai');
  });

  it('assembles the brief: verbatim meaning, placement notes, rejected axis position', async () => {
    const picked = await startAndPick('v3', 'v2');
    const session = await refine(picked.id, { answer: 'not stark enough' });

    const brief = session.brief;
    expect(brief).toBeDefined();
    expect(brief?.placement).toBe('ribs');
    expect(brief?.styleTags).toEqual(['fine-line']);
    expect(brief?.meaning).toBe('a sparrow for my grandmother, exactly as I said it');
    expect(brief?.references).toEqual(['https://example.com/ref.jpg']);
    expect(brief?.axisSelection).toEqual(questionnaireEnhance.axisSelection);
    expect(brief?.finalImageUrl).toBe(session.refinedVariation?.imageUrl);
    // ribs + fine-line hits the placement×style caution table (ADR-0014).
    expect(brief?.placementNotes.length).toBeGreaterThan(0);
    expect(brief?.placementNotes[0]).toMatch(/rib/i);
    // The most-not-you tap (v2) becomes the negative-preference context.
    expect(brief?.rejectedAxisPosition).toEqual({
      'color-blackwork': 'color',
      'bold-fine': 'fine',
    });
  });

  it('leaves placement notes empty when nothing subtle applies', async () => {
    mockExtractIntake.mockResolvedValue({
      ...intakeRecord,
      placement: 'upper back',
      styleTags: ['traditional'],
    });
    const picked = await startAndPick('v1', 'v4'); // bold+color pick, no fine pole
    const session = await refine(picked.id, { answer: 'more' });
    expect(session.brief?.placementNotes).toEqual([]);
  });

  it('hard-stops a second refinement — no second regen (ADR-0013)', async () => {
    const picked = await startAndPick('v3', 'v2');
    await refine(picked.id, { answer: 'not stark enough' });

    await expect(refine(picked.id, { answer: 'again please' })).rejects.toMatchObject({
      name: 'DesignSessionError',
      code: 'REFINEMENT_CLOSED',
      status: 409,
    });
    // Still exactly 5 renders: 4 reveal + 1 regen.
    expect(mockGenerate).toHaveBeenCalledTimes(5);
  });

  it('rejects refinement before a pick', async () => {
    const session = await startSession(startRequest);
    await expect(refine(session.id, { answer: 'bolder' })).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
    expect(mockGenerate).toHaveBeenCalledTimes(4);
  });

  it('throws SESSION_NOT_FOUND for an unknown session', async () => {
    await expect(refine('missing', { answer: 'x' })).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });
});

describe('getSession', () => {
  it('returns the persisted session across the whole lifecycle', async () => {
    const picked = await startAndPick('v3', 'v2');
    const completed = await refine(picked.id, { answer: 'not stark enough' });
    const fetched = await getSession(picked.id);
    expect(fetched).toEqual(completed);
    expect(fetched.phase).toBe('complete');
  });

  it('throws SESSION_NOT_FOUND for an unknown id', async () => {
    await expect(getSession('nope')).rejects.toBeInstanceOf(DesignSessionError);
    await expect(getSession('nope')).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' });
  });
});

describe('attachPlacementPreview', () => {
  const previewUrl = 'https://storage.test/design-sessions/x/placement-preview.png';

  it('stores the preview URL on the completed session Brief and persists it', async () => {
    const picked = await startAndPick('v3', 'v2');
    await refine(picked.id, { answer: 'not stark enough' });

    const session = await attachPlacementPreview(picked.id, previewUrl);
    expect(session.brief?.placementPreviewUrl).toBe(previewUrl);
    expect(session.phase).toBe('complete');

    const fetched = await getSession(picked.id);
    expect(fetched.brief?.placementPreviewUrl).toBe(previewUrl);
  });

  it('overwrites the previous preview on a re-place', async () => {
    const picked = await startAndPick('v3', 'v2');
    await refine(picked.id, { answer: 'not stark enough' });

    await attachPlacementPreview(picked.id, previewUrl);
    const session = await attachPlacementPreview(picked.id, 'https://storage.test/second.png');
    expect(session.brief?.placementPreviewUrl).toBe('https://storage.test/second.png');
  });

  it('rejects before the session is complete (INVALID_PHASE)', async () => {
    const picked = await startAndPick('v3', 'v2');
    await expect(attachPlacementPreview(picked.id, previewUrl)).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
  });

  it('throws SESSION_NOT_FOUND for an unknown id', async () => {
    await expect(attachPlacementPreview('nope', previewUrl)).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });
});

describe('public boundary — internal session state never leaves the service', () => {
  const INTERNAL_KEYS = ['pinnedModelId', 'pinnedAspectRatio', 'conversation'];

  it('strips the pinned route and conversation state from every public return', async () => {
    const started = await startSession(startRequest);
    const picked = await recordPick(started.id, { pickId: 'v3', mostNotYouId: 'v2' });
    const completed = await refine(started.id, { answer: 'not stark enough' });
    const fetched = await getSession(started.id);

    for (const session of [started, picked, completed, fetched]) {
      for (const key of INTERNAL_KEYS) {
        expect(session).not.toHaveProperty(key);
      }
    }

    // The internals are stripped, not lost — the stored session keeps the pin.
    const stored = (await memorySessionStore.get(started.id)) as StoredSession;
    expect(stored.pinnedModelId).toBe('imagen3');
    expect(stored.pinnedAspectRatio).toBe('9:16');
  });
});

describe('demo mode (NEXT_PUBLIC_DEMO_MODE)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  it('start persists a real session retrievable by getSession, with stock images and zero renders', async () => {
    const session = await startSession(startRequest);

    // No paid render — the four reveal images are the shared demo stock set.
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(session.variations.map(v => v.imageUrl)).toEqual([...DEMO_MOCK_IMAGES]);

    // Everything else ran the REAL code paths: intake, council, route pin.
    expect(mockExtractIntake).toHaveBeenCalledWith(startRequest);
    expect(mockEnhanceStructured).toHaveBeenCalledWith(intakeRecord);
    expect(mockRouteGeneration).toHaveBeenCalledTimes(1);
    expect(session.phase).toBe('revealed');
    expect(session.provider).toBe('vertex-ai');
    expect(session.variations.map(v => v.prompt)).toEqual(['d1', 'd2', 'd3', 's4']);

    // Persisted for real — the follow-up routes can find it (the old route
    // fabricated an unpersisted session and every follow-up call 404ed).
    const fetched = await getSession(session.id);
    expect(fetched).toEqual(session);
  });

  it('runs the full flow start → pick → refine → complete with zero generate() calls', async () => {
    const session = await startSession(startRequest);
    const picked = await recordPick(session.id, { pickId: 'v3', mostNotYouId: 'v2' });
    expect(picked.phase).toBe('picked');
    expect(picked.refinementQuestion).toBeTruthy();

    const completed = await refine(session.id, { answer: 'not stark enough' });
    expect(completed.phase).toBe('complete');
    // The demo regen is the stock image after the picked one (v3 → index 2).
    expect(completed.refinedVariation?.imageUrl).toBe(DEMO_MOCK_IMAGES[3]);
    expect(completed.refinedVariation?.prompt).toContain('d3');
    expect(completed.brief).toBeDefined();
    expect(completed.brief?.finalImageUrl).toBe(completed.refinedVariation?.imageUrl);

    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('still hard-stops a second refinement with REFINEMENT_CLOSED (ADR-0013)', async () => {
    const picked = await startAndPick('v3', 'v2');
    await refine(picked.id, { answer: 'more' });

    await expect(refine(picked.id, { answer: 'again please' })).rejects.toMatchObject({
      name: 'DesignSessionError',
      code: 'REFINEMENT_CLOSED',
      status: 409,
    });
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
