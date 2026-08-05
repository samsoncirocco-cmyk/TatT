/**
 * The pick-to-refine loop (ADR-0049): round bookkeeping at the reveal, the
 * free changeable pick, the freeze at the moment a next round is charged,
 * axis progression up the ladder, and the reference chain — the picked cut
 * leads, the customer's own photos persist.
 *
 * Same seams as designSessionService.test.ts: every module boundary is
 * mocked, persistence runs on the in-memory store.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEMO_MOCK_IMAGES } from '@/lib/demo-images';
import {
  startSession,
  recordRoundPick,
  refineRound,
  getSession,
} from '../index';
import { memorySessionStore, clearMemorySessions } from '../internal/store';
import type { StoredSession } from '../internal/store';
import { extractIntake } from '../../intake';
import { enhanceStructured, enhanceRound } from '../../council';
import { generate, routeGeneration } from '../../generation';
import {
  copyImageToPath,
  recoverImageAtPath,
  uploadImageToPath,
} from '@/services/storage/imageStorageService';
import { getSignedUrl } from '@/services/gcs-service';
import { recordSpend } from '@/lib/budget-tracker';
import type { IntakeRecord } from '../../intake/types';

vi.mock('../../intake', () => ({ extractIntake: vi.fn() }));
vi.mock('../../council', () => ({ enhanceStructured: vi.fn(), enhanceRound: vi.fn() }));
vi.mock('../../generation', () => ({ generate: vi.fn(), routeGeneration: vi.fn() }));
vi.mock('@/lib/firebase-admin', () => ({ ensureAdminApp: vi.fn(() => false) }));
vi.mock('@/services/storage/imageStorageService', () => ({
  recoverImageAtPath: vi.fn(),
  copyImageToPath: vi.fn(),
  uploadImageToPath: vi.fn(),
}));
// The ADR-0050/#333 signed-URL plumbing the picked cut rides on.
vi.mock('@/services/gcs-service', () => ({
  getSignedUrl: vi.fn(async (path: string) => `https://signed.test/${path}`),
  uploadToGCS: vi.fn(),
}));
vi.mock('@/lib/budget-tracker', () => ({
  recordSpend: vi.fn(),
  VERTEX_IMAGEN_COST_CENTS: 4,
}));

const mockExtractIntake = vi.mocked(extractIntake);
const mockEnhanceStructured = vi.mocked(enhanceStructured);
const mockEnhanceRound = vi.mocked(enhanceRound);
const mockGenerate = vi.mocked(generate);
const mockRouteGeneration = vi.mocked(routeGeneration);
const mockRecoverImageAtPath = vi.mocked(recoverImageAtPath);
const mockCopyImageToPath = vi.mocked(copyImageToPath);
const mockUploadImageToPath = vi.mocked(uploadImageToPath);
const mockGetSignedUrl = vi.mocked(getSignedUrl);
vi.mocked(recordSpend).mockResolvedValue(undefined);

/** Where a durable copy lands — the shape imageStorageService returns. */
const BUCKET_URL = 'https://storage.googleapis.com/tatt-pro-assets';
const durableUrl = (objectPath: string) => `${BUCKET_URL}/${objectPath}`;

const intakeRecord: IntakeRecord = {
  placement: 'ribs',
  styleTags: ['fine-line'],
  meaning: 'a sparrow for my grandmother, exactly as I said it',
  references: [],
  ambiguousAxes: ['bold-fine', 'color-blackwork'],
};

/** Council round one: two cuts on the ladder's first axis (ADR-0049). */
const roundOneEnhance = {
  axisSelection: {
    mode: 'questionnaire' as const,
    axes: ['bold-fine' as const],
    rationale: 'round one spreads the first ladder rung',
  },
  variations: [
    {
      axisPosition: { 'bold-fine': 'bold' },
      prompts: { detailed: 'd1' },
      negativePrompt: 'n1',
    },
    {
      axisPosition: { 'bold-fine': 'fine' },
      prompts: { detailed: 'd2' },
      negativePrompt: 'n2',
    },
  ],
};

/** What the council hands a later round: the spread axis + locked poles. */
function roundEnhance(axis: string, lockedPoles: Record<string, string>) {
  const poles =
    axis === 'reroll'
      ? [lockedPoles, lockedPoles]
      : [
          { [axis]: axis.split('-')[0], ...lockedPoles },
          { [axis]: axis.split('-')[1], ...lockedPoles },
        ];
  return {
    axisSelection: {
      mode: 'questionnaire' as const,
      axes: axis === 'reroll' ? [] : [axis as 'bold-fine'],
      rationale: 'test round',
    },
    variations: poles.map((axisPosition, index) => ({
      axisPosition,
      prompts: { detailed: `${axis}-d${index + 1}` },
      negativePrompt: `${axis}-n${index + 1}`,
    })),
  };
}

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
  mockEnhanceStructured.mockResolvedValue(roundOneEnhance);
  mockEnhanceRound.mockImplementation(async (_record, spread) =>
    roundEnhance(spread.axis, spread.lockedPoles as Record<string, string>)
  );
  mockRouteGeneration.mockReturnValue(vertexRoute);
  mockRecoverImageAtPath.mockResolvedValue(null);
  mockCopyImageToPath.mockImplementation(async objectPath => durableUrl(objectPath));
  mockUploadImageToPath.mockImplementation(async objectPath => durableUrl(objectPath));
  mockGetSignedUrl.mockImplementation(async (path: string) => `https://signed.test/${path}`);
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

afterEach(() => {
  delete process.env.NEXT_PUBLIC_DEMO_MODE;
});

const startRequest = { placementAnswer: 'on my ribs', meaningAnswer: 'a sparrow' };

describe('round one is recorded at the reveal', () => {
  it('persists round 1 with its axis and both variation ids, unpicked', async () => {
    const session = await startSession(startRequest);

    expect(session.variations).toHaveLength(2);
    expect(session.rounds).toEqual([
      { round: 1, axis: 'bold-fine', variationIds: ['v1', 'v2'] },
    ]);
  });
});

describe('recordRoundPick — free, recorded server-side, changeable', () => {
  it('records the pick with a timestamp and survives persistence', async () => {
    const session = await startSession(startRequest);
    const picked = await recordRoundPick(session.id, { pickedId: 'v2' });

    const round = picked.rounds?.[0];
    expect(round).toMatchObject({ round: 1, axis: 'bold-fine', pickedId: 'v2' });
    expect(typeof round?.pickedAt).toBe('string');
    // No render, no spend: the pick is the free signal.
    expect(mockGenerate).toHaveBeenCalledTimes(2);

    const fetched = await getSession(session.id);
    expect(fetched.rounds?.[0].pickedId).toBe('v2');
  });

  it('lets the pick change until the next round is charged', async () => {
    const session = await startSession(startRequest);
    await recordRoundPick(session.id, { pickedId: 'v2' });
    const repicked = await recordRoundPick(session.id, { pickedId: 'v1' });

    expect(repicked.rounds?.[0].pickedId).toBe('v1');
  });

  it('rejects a cut outside the live round', async () => {
    const session = await startSession(startRequest);
    await expect(recordRoundPick(session.id, { pickedId: 'v9' })).rejects.toMatchObject({
      code: 'INVALID_VARIATION',
    });
  });

  it('freezes after a charged round — the pick can never change again', async () => {
    const session = await startSession(startRequest);
    await recordRoundPick(session.id, { pickedId: 'v2' });
    await refineRound(session.id);

    // The stored round is frozen…
    const stored = (await memorySessionStore.get(session.id)) as StoredSession;
    expect(stored.rounds?.[0].frozen).toBe(true);
    // …and only the NEW round is pickable: v1 belongs to the frozen one.
    await expect(recordRoundPick(session.id, { pickedId: 'v1' })).rejects.toMatchObject({
      code: 'INVALID_VARIATION',
    });
    const repicked = await recordRoundPick(session.id, { pickedId: 'v3' });
    expect(repicked.rounds?.[1].pickedId).toBe('v3');
  });

  it('throws SESSION_NOT_FOUND for an unknown session', async () => {
    await expect(recordRoundPick('missing', { pickedId: 'v1' })).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
      status: 404,
    });
  });
});

describe('refineRound — the charged next round', () => {
  it('refuses to run before a pick — the pick is the signal', async () => {
    const session = await startSession(startRequest);
    await expect(refineRound(session.id)).rejects.toMatchObject({
      code: 'ROUND_UNPICKED',
      status: 409,
    });
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('renders two new cuts on the next ladder axis, holding the picked pole', async () => {
    const session = await startSession(startRequest);
    await recordRoundPick(session.id, { pickedId: 'v2' });
    const { session: next, round } = await refineRound(session.id);

    // Axis progression (ADR-0049): round 2 spreads the second rung and
    // holds the pole round 1 picked.
    expect(mockEnhanceRound).toHaveBeenCalledWith(intakeRecord, {
      roundNumber: 2,
      axis: 'color-blackwork',
      lockedPoles: { 'bold-fine': 'fine' },
    });
    expect(round).toMatchObject({
      round: 2,
      axis: 'color-blackwork',
      variationIds: ['v3', 'v4'],
    });
    expect(next.variations.map(v => v.id)).toEqual(['v1', 'v2', 'v3', 'v4']);
    expect(mockGenerate).toHaveBeenCalledTimes(4);
    // ADR-0016 (per ADR-0052: one provider per round) — the pinned model,
    // with the ADR-0048 loud-downgrade opt-in.
    for (const [request] of mockGenerate.mock.calls.slice(2)) {
      expect(request.modelId).toBe('imagen3');
      expect(request.allowProviderFallback).toBe(true);
    }
  });

  it('walks the whole ladder and then re-rolls on locked poles — no cap', async () => {
    const session = await startSession(startRequest);
    let cutIndex = 2;
    for (const expectedAxis of [
      'color-blackwork',
      'literal-abstract',
      'minimal-ornate',
      'reroll',
      'reroll',
    ]) {
      const live = (await getSession(session.id)).rounds!.at(-1)!;
      await recordRoundPick(session.id, { pickedId: live.variationIds[1] });
      const { round } = await refineRound(session.id);
      expect(round.axis).toBe(expectedAxis);
      cutIndex += 2;
      expect(round.variationIds).toEqual([`v${cutIndex - 1}`, `v${cutIndex}`]);
    }
  });

  it('chains the picked cut as the LEADING reference, photos persisting after it', async () => {
    const session = await startSession(startRequest);

    // Attach a customer reference photo the way the conversation does.
    const stored = (await memorySessionStore.get(session.id)) as StoredSession;
    stored.conversation = {
      transcript: [],
      turnCount: 0,
      record: {},
      turnLogs: [],
      stage: 'chatting',
      references: [
        {
          id: 'ref-1',
          source: 'web',
          summary: 'their own sparrow photo',
          subjects: [],
          characters: [],
          styleTags: [],
          styleDescriptors: [],
          palette: [],
          composition: '',
          confidence: 1,
          createdAt: new Date().toISOString(),
          imagePath: `design-sessions/${session.id}/references/photo.jpg`,
        },
      ],
    };
    await memorySessionStore.save(stored);

    await recordRoundPick(session.id, { pickedId: 'v2' });
    await refineRound(session.id);

    // The picked cut is already a GCS object — its bucket path rides the
    // same signed-URL plumbing as the photo (#333), and it LEADS.
    const pickedUrl = stored.variations[1].imageUrl!;
    const pickedPath = pickedUrl.replace(`${BUCKET_URL}/`, '');
    expect(mockGetSignedUrl.mock.calls.map(([path]) => path)).toEqual([
      pickedPath,
      `design-sessions/${session.id}/references/photo.jpg`,
    ]);
    for (const [request] of mockGenerate.mock.calls.slice(2)) {
      expect(request.referenceImages).toEqual([
        `https://signed.test/${pickedPath}`,
        `https://signed.test/design-sessions/${session.id}/references/photo.jpg`,
      ]);
    }
  });

  it('fails the whole round atomically — nothing persisted, pick unfrozen', async () => {
    const session = await startSession(startRequest);
    await recordRoundPick(session.id, { pickedId: 'v2' });

    let call = 0;
    mockGenerate.mockImplementation(async () => {
      if (++call === 2) throw new Error('provider blew up');
      return {
        images: [`https://replicate.delivery/pbxt/${++imageCounter}/out.png`],
        metadata: {
          model: 'imagen3',
          provider: 'vertex-ai' as const,
          generatedAt: new Date().toISOString(),
          durationMs: 1,
          attempts: 1,
          fallbackUsed: false,
        },
      };
    });

    await expect(refineRound(session.id)).rejects.toThrow('provider blew up');

    // No half-shown round: the session still has one round, two cuts, and a
    // changeable pick.
    const stored = (await memorySessionStore.get(session.id)) as StoredSession;
    expect(stored.rounds).toHaveLength(1);
    expect(stored.rounds?.[0].frozen).toBeUndefined();
    expect(stored.variations).toHaveLength(2);
    const repicked = await recordRoundPick(session.id, { pickedId: 'v1' });
    expect(repicked.rounds?.[0].pickedId).toBe('v1');
  });

  it('reports an ADR-0048 downgrade on the round for the route to refund', async () => {
    const session = await startSession(startRequest);
    await recordRoundPick(session.id, { pickedId: 'v2' });

    mockGenerate.mockImplementation(async request => ({
      images: [`https://replicate.delivery/pbxt/${++imageCounter}/out.png`],
      metadata: {
        model: request.modelId ?? 'unknown',
        provider: 'replicate' as const,
        generatedAt: new Date().toISOString(),
        durationMs: 1,
        attempts: 1,
        fallbackUsed: true,
        fallbackReason: 'REPLICATE_ERROR',
      },
    }));

    const result = await refineRound(session.id);

    expect(result.downgraded).toBe(true);
    expect(result.downgradeReason).toBe('REPLICATE_ERROR');
    expect(result.round.downgraded).toBe(true);
    // Delivered all the same — the loud downgrade ships the cuts.
    expect(result.round.variationIds).toHaveLength(2);
  });

  it('demo mode rounds render stock images with zero paid calls', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    const session = await startSession(startRequest);
    await recordRoundPick(session.id, { pickedId: 'v1' });
    const { session: next } = await refineRound(session.id);

    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
    expect(next.variations[2].imageUrl).toBe(DEMO_MOCK_IMAGES[2 % DEMO_MOCK_IMAGES.length]);
  });
});
