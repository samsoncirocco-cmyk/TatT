/**
 * The post-reveal critique lane (ADR-0039).
 *
 * Two halves: the pure decisions in internal/critique.ts (which cut, is it a
 * fix, what does the prompt become), and the orchestrator turn — allowance,
 * pinned-model reuse, phase gating, and what the route is told to meter on.
 *
 * Every module boundary is mocked (generation, Firebase Admin forced off so
 * persistence runs in memory). No live provider call is ever made.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { critique, recordPick, DesignSessionError } from '../index';
import { memorySessionStore, clearMemorySessions } from '../internal/store';
import type { StoredSession } from '../internal/store';
import {
  adjustPromptForCritique,
  isFixRequest,
  resolveCritiqueTarget,
} from '../internal/critique';
import { ALLOWANCE_SPENT_LINE, CHATTER_LINE, WHICH_CUT_LINE } from '../internal/critiqueVoice';
import { DEFAULT_STUDIO_FIX_ALLOWANCE } from '@/lib/studio-fix-allowance';
import { generate } from '../../generation';
import {
  copyImageToPath,
  recoverImageAtPath,
  uploadImageToPath,
} from '@/services/storage/imageStorageService';
import { recordSpend } from '@/lib/budget-tracker';
import type { Variation } from '../types';

vi.mock('../../intake', () => ({ extractIntake: vi.fn() }));
vi.mock('../../council', () => ({ enhanceStructured: vi.fn() }));
vi.mock('../../generation', () => ({ generate: vi.fn(), routeGeneration: vi.fn() }));
vi.mock('@/lib/firebase-admin', () => ({ ensureAdminApp: vi.fn(() => false) }));
// A re-cut is stored like every other render (TAT-57 durability), so the
// storage seam has to be mocked here too — otherwise the lane's tests reach
// for GCS.
vi.mock('@/services/storage/imageStorageService', () => ({
  recoverImageAtPath: vi.fn(),
  copyImageToPath: vi.fn(),
  uploadImageToPath: vi.fn(),
}));
vi.mock('@/lib/budget-tracker', () => ({
  recordSpend: vi.fn(),
  VERTEX_IMAGEN_COST_CENTS: 4,
}));

const mockGenerate = vi.mocked(generate);
const mockRecoverImageAtPath = vi.mocked(recoverImageAtPath);
const mockCopyImageToPath = vi.mocked(copyImageToPath);
const mockUploadImageToPath = vi.mocked(uploadImageToPath);
const mockRecordSpend = vi.mocked(recordSpend);

/** Where a durable copy lands — the shape imageStorageService returns. */
const durableUrl = (objectPath: string) =>
  `https://storage.googleapis.com/tatt-pro-assets/${objectPath}`;

function variations(): Variation[] {
  return [
    { id: 'v1', axisPosition: { 'color-blackwork': 'color', 'bold-fine': 'bold' }, prompt: 'p1', negativePrompt: 'n1', imageUrl: 'https://img/1.png' },
    { id: 'v2', axisPosition: { 'color-blackwork': 'color', 'bold-fine': 'fine' }, prompt: 'p2', negativePrompt: 'n2', imageUrl: 'https://img/2.png' },
    { id: 'v3', axisPosition: { 'color-blackwork': 'blackwork', 'bold-fine': 'bold' }, prompt: 'p3', negativePrompt: 'n3', imageUrl: 'https://img/3.png' },
    { id: 'v4', axisPosition: { 'color-blackwork': 'blackwork', 'bold-fine': 'fine' }, prompt: 'p4', negativePrompt: 'n4', imageUrl: 'https://img/4.png' },
  ];
}

async function seed(overrides: Partial<StoredSession> = {}): Promise<StoredSession> {
  const session: StoredSession = {
    id: 'sess-critique',
    phase: 'revealed',
    intake: {
      placement: 'forearm',
      styleTags: ['anime'],
      meaning: 'kingdom hearts, me and my brother',
      references: [],
      ambiguousAxes: [],
    },
    axisSelection: { mode: 'questionnaire', axes: ['color-blackwork', 'bold-fine'], rationale: 'r' },
    provider: 'vertex-ai',
    pinnedModelId: 'imagen-3.0-generate-002',
    pinnedAspectRatio: '1:1',
    variations: variations(),
    createdAt: '2026-07-31T00:00:00.000Z',
    updatedAt: '2026-07-31T00:00:00.000Z',
    ...overrides,
  };
  await memorySessionStore.save(session);
  return session;
}

describe('critique — which cut is this about', () => {
  const session = { variations: variations(), critiqueCuts: [] as Variation[], pickId: undefined };

  it('reads an ordinal off the message', () => {
    expect(resolveCritiqueTarget(session, 'the third one but less color')?.id).toBe('v3');
    expect(resolveCritiqueTarget(session, '#2 is closer')?.id).toBe('v2');
    expect(resolveCritiqueTarget(session, 'cut four, keyblades bigger')?.id).toBe('v4');
  });

  it('reads a pole word only when exactly one cut carries it', () => {
    // Two cuts are blackwork and two are bold — ambiguous, so no guess.
    expect(resolveCritiqueTarget(session, 'the blackwork one is too busy')).toBeUndefined();
    // Only v1 is both, but neither word alone disambiguates.
    const twoAxis = {
      variations: [
        variations()[0],
        { ...variations()[1], axisPosition: { 'color-blackwork': 'blackwork', 'bold-fine': 'fine' } },
        { ...variations()[2], axisPosition: { 'color-blackwork': 'blackwork', 'bold-fine': 'fine' } },
        { ...variations()[3], axisPosition: { 'color-blackwork': 'blackwork', 'bold-fine': 'fine' } },
      ],
      critiqueCuts: [] as Variation[],
      pickId: undefined,
    };
    expect(resolveCritiqueTarget(twoAxis, 'the color one, riku is missing')?.id).toBe('v1');
  });

  it('falls back to the newest re-cut, then the pick, then nothing', () => {
    const recut: Variation = { id: 'v2-fix1', axisPosition: {}, prompt: 'p2 fixed' };
    expect(resolveCritiqueTarget({ ...session, critiqueCuts: [recut] }, "riku's missing")?.id).toBe(
      'v2-fix1'
    );
    expect(resolveCritiqueTarget({ ...session, pickId: 'v2' }, "riku's missing")?.id).toBe('v2');
    expect(resolveCritiqueTarget(session, "riku's missing")).toBeUndefined();
  });
});

describe('critique — is it a fix request', () => {
  it('treats real criticism as a fix, including the founder’s own examples', () => {
    for (const message of [
      "riku's missing",
      'too busy',
      'make the keyblades bigger',
      'the third one but less color',
      'why is his hand like that',
    ]) {
      expect(isFixRequest(message)).toBe(true);
    }
  });

  it('treats a bare affirmation or thanks as chatter', () => {
    for (const message of ['ok', 'thanks!', 'love it', 'sick', 'yeah', '']) {
      expect(isFixRequest(message)).toBe(false);
    }
  });
});

describe('critique — the re-cut prompt', () => {
  it('carries the user’s own words verbatim (ADR-0010)', () => {
    const prompt = adjustPromptForCritique(variations()[0], "  riku's   missing ");
    expect(prompt).toContain('p1');
    expect(prompt).toContain(`Requested change: "riku's missing"`);
  });

  it('adds a technical directive when a known cue matches', () => {
    expect(adjustPromptForCritique(variations()[0], 'too busy')).toContain('negative space');
    expect(adjustPromptForCritique(variations()[0], 'less color')).toContain('muted palette');
    expect(adjustPromptForCritique(variations()[0], 'make the keyblades bigger')).toContain(
      'scaled up'
    );
  });

  it('leaves an unrecognized critique as the words alone', () => {
    const prompt = adjustPromptForCritique(variations()[0], 'his jacket is the wrong one');
    expect(prompt).toBe(`p1 Requested change: "his jacket is the wrong one".`);
  });
});

describe('critique — the orchestrator turn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMemorySessions();
    delete process.env.NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE;
    delete process.env.STUDIO_FIX_ALLOWANCE;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    mockGenerate.mockResolvedValue({ images: ['https://img/recut.png'] } as never);
    // Nothing staged from a previous attempt; a copy lands at its own path.
    mockRecoverImageAtPath.mockResolvedValue(null);
    mockCopyImageToPath.mockImplementation(async objectPath => durableUrl(objectPath));
    mockUploadImageToPath.mockImplementation(async objectPath => durableUrl(objectPath));
    mockRecordSpend.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE;
    delete process.env.STUDIO_FIX_ALLOWANCE;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  it('re-cuts the named variation on the PINNED model, never re-routing (ADR-0016)', async () => {
    await seed();
    const result = await critique('sess-critique', { message: 'the third one but less color' });

    expect(result.generated).toBe(true);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'imagen-3.0-generate-002',
        aspectRatio: '1:1',
        numImages: 1,
        allowProviderFallback: false,
        // The target's own negative prompt travels with the re-cut.
        negativePrompt: 'n3',
      })
    );
    expect(mockGenerate.mock.calls[0][0].prompt).toContain('p3');
    // Our copy, not the provider's. A re-cut is the image the customer asked
    // for by name, so it is the last one allowed to expire in an hour.
    expect(result.cut?.imageUrl).not.toBe('https://img/recut.png');
    expect(result.cut?.imageUrl).toMatch(
      /^https:\/\/storage\.googleapis\.com\/.*design-sessions\/sess-critique\//
    );
    // The reveal stays the four cuts the pick signal is read against.
    expect(result.session.variations).toHaveLength(4);
    expect(result.session.critiqueCuts).toHaveLength(1);
  });

  it('persists the turn and the new cut on the session', async () => {
    await seed();
    await critique('sess-critique', { message: 'the first one, too busy' });

    const stored = await memorySessionStore.get('sess-critique');
    expect(stored?.fixesUsed).toBe(1);
    expect(stored?.critiqueCuts).toHaveLength(1);
    expect(stored?.critiqueTurns?.[0]).toMatchObject({
      message: 'the first one, too busy',
      targetId: 'v1',
      cutId: 'v1-fix1',
    });
  });

  it('decrements the allowance and blocks at zero without spending', async () => {
    process.env.STUDIO_FIX_ALLOWANCE = '2';
    await seed();

    const first = await critique('sess-critique', { message: 'the first one, too busy' });
    expect(first.fixesRemaining).toBe(1);
    expect(first.exhausted).toBe(false);

    const second = await critique('sess-critique', { message: 'still too busy' });
    expect(second.fixesRemaining).toBe(0);
    expect(second.exhausted).toBe(true);
    expect(mockGenerate).toHaveBeenCalledTimes(2);

    const third = await critique('sess-critique', { message: 'one more, less color' });
    // Refused before any paid call, and spoken — never a silent no-op.
    expect(third.generated).toBe(false);
    expect(third.reply).toBe(ALLOWANCE_SPENT_LINE);
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(third.session.critiqueCuts).toHaveLength(2);
  });

  it('defaults the allowance to the Studio’s knob (ADR-0038)', async () => {
    await seed();
    const result = await critique('sess-critique', { message: 'cut one, too busy' });
    // Tracks the shared constant, not a literal: this asserts the lane reads
    // the Studio's knob, which is the actual claim. Pinning the number meant
    // retuning the allowance broke a test that was never about the number.
    expect(result.fixesRemaining).toBe(DEFAULT_STUDIO_FIX_ALLOWANCE - 1);
  });

  it('spends nothing on chatter', async () => {
    await seed();
    const result = await critique('sess-critique', { message: 'love it' });

    expect(result.generated).toBe(false);
    expect(result.reply).toBe(CHATTER_LINE);
    expect(mockGenerate).not.toHaveBeenCalled();
    // A turn that spent nothing still leaves the allowance whole.
    expect(result.fixesRemaining).toBe(DEFAULT_STUDIO_FIX_ALLOWANCE);
  });

  it('asks which cut rather than guessing, and spends nothing', async () => {
    await seed();
    const result = await critique('sess-critique', { message: "riku's missing" });

    expect(result.generated).toBe(false);
    expect(result.reply).toBe(WHICH_CUT_LINE);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('applies a bare critique to the pick once one exists', async () => {
    await seed({ phase: 'picked', pickId: 'v2', mostNotYouId: 'v4' });
    const result = await critique('sess-critique', { message: "riku's missing" });

    expect(result.generated).toBe(true);
    expect(result.cut?.id).toBe('v2-fix1');
    expect(mockGenerate.mock.calls[0][0].prompt).toContain('p2');
  });

  it('is closed once the Brief exists (ADR-0013 hard stop)', async () => {
    await seed({ phase: 'complete' });
    await expect(critique('sess-critique', { message: 'too busy' })).rejects.toThrow(
      DesignSessionError
    );
    await expect(critique('sess-critique', { message: 'too busy' })).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('is closed before anything is revealed', async () => {
    await seed({ phase: 'intake' });
    await expect(critique('sess-critique', { message: 'too busy' })).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
  });

  it('renders a free stock re-cut in demo mode', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    await seed();
    const result = await critique('sess-critique', { message: 'cut one, too busy' });

    expect(mockGenerate).not.toHaveBeenCalled();
    expect(result.generated).toBe(true);
    expect(result.cut?.imageUrl).toBeTruthy();
    // The allowance still counts down — demo mode changes cost, not policy.
    expect(result.fixesRemaining).toBe(DEFAULT_STUDIO_FIX_ALLOWANCE - 1);
  });

  it('leaves a re-cut pickable, so the loop closes where it started', async () => {
    await seed();
    const result = await critique('sess-critique', { message: 'the first one, too busy' });
    const cutId = result.cut!.id;

    const picked = await recordPick('sess-critique', { pickId: cutId, mostNotYouId: 'v4' });
    expect(picked.phase).toBe('picked');
    expect(picked.pickId).toBe(cutId);
  });
});
