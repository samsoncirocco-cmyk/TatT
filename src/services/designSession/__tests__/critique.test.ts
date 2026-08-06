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
  classifyCritiqueTurn,
  isFixRequest,
  resolveCritiqueTarget,
} from '../internal/critique';
import {
  ALLOWANCE_SPENT_LINE,
  CHATTER_LINE,
  NO_SUCH_CUT_LINE,
  SET_REDRAW_UNAVAILABLE_LINE,
  WHICH_CUT_LINE,
} from '../internal/critiqueVoice';
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

/** The cut a resolution landed on, or its non-cut kind — keeps assertions short. */
const resolved = (
  session: Parameters<typeof resolveCritiqueTarget>[0],
  message: string
): string => {
  const result = resolveCritiqueTarget(session, message);
  return result.kind === 'cut' ? result.variation.id : result.kind;
};

/** A compositional round — this is where the designed names live. */
function sleeveCuts(): Variation[] {
  return [
    { id: 'c1', axisPosition: { composition: 'stacked tiers' }, prompt: 'p1' },
    { id: 'c2', axisPosition: { composition: 'connected transitions' }, prompt: 'p2' },
  ];
}

describe('critique — which cut is this about', () => {
  const session = { variations: variations(), critiqueCuts: [] as Variation[], pickId: undefined };

  it('reads an ordinal off the message', () => {
    expect(resolved(session, 'the third one but less color')).toBe('v3');
    expect(resolved(session, '#2 is closer')).toBe('v2');
    expect(resolved(session, 'cut four, keyblades bigger')).toBe('v4');
  });

  it('reads a pole word only when exactly one cut carries it', () => {
    // Two cuts are blackwork — a reference that cannot land, so we ask.
    expect(resolved(session, 'the blackwork one is too busy')).toBe('missed');
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
    expect(resolved(twoAxis, 'the color one, riku is missing')).toBe('v1');
  });

  it('falls back to the newest re-cut, then the pick, then nothing', () => {
    const recut: Variation = { id: 'v2-fix1', axisPosition: {}, prompt: 'p2 fixed' };
    expect(resolved({ ...session, critiqueCuts: [recut] }, "riku's missing")).toBe('v2-fix1');
    expect(resolved({ ...session, pickId: 'v2' }, "riku's missing")).toBe('v2');
    expect(resolved(session, "riku's missing")).toBe('none');
  });
});

/**
 * The failure this fix exists for. The customer read "the totem" under a cut,
 * typed "the totem", and the resolver — which had never seen that name — fell
 * through to its default and re-cut a different design, announcing it by name.
 */
describe('critique — the designed name the grid showed', () => {
  const sleeve = { variations: sleeveCuts(), critiqueCuts: [] as Variation[], pickId: undefined };

  it('resolves the name the customer was actually shown', () => {
    expect(resolved(sleeve, 'the totem but bigger')).toBe('c1');
    expect(resolved(sleeve, 'the run is too busy')).toBe('c2');
  });

  it('accepts the name without its article', () => {
    expect(resolved(sleeve, 'totem, but make the top character bigger')).toBe('c1');
  });

  it('NEVER matches a name inside a longer word', () => {
    // "the running man" is not "the run". Substring matching here is how a
    // near-miss becomes a paid render on the wrong design.
    expect(resolved(sleeve, 'make it look like the running man poster')).toBe('none');
  });

  it('ASKS rather than guessing when the name is from another round', () => {
    // The regression: "the totem" against a round with no stacked-tiers cut
    // used to fall through and re-cut whatever was most recent.
    const noTotem = { variations: [sleeveCuts()[1]], critiqueCuts: [] as Variation[], pickId: undefined };
    expect(resolved(noTotem, 'the totem but bigger')).toBe('missed');
  });

  it('ASKS even when there is a re-cut or a pick to fall back on', () => {
    // The exact shape of the 0f6234e9 failure: context existed, so the old
    // resolver had something to return, and returned it confidently.
    const recut: Variation = { id: 'c2-fix1', axisPosition: {}, prompt: 'p2 fixed' };
    const noTotem = {
      variations: [sleeveCuts()[1]],
      critiqueCuts: [recut],
      pickId: 'c2',
    };
    expect(resolved(noTotem, 'the totem but bigger')).toBe('missed');
  });

  it('ASKS when two cuts answer to the same name', () => {
    const twins = {
      variations: [
        { id: 'c1', axisPosition: { composition: 'centered emblem' }, prompt: 'p1' },
        { id: 'c2', axisPosition: { composition: 'ensemble emblem' }, prompt: 'p2' },
      ],
      critiqueCuts: [] as Variation[],
      pickId: undefined,
    };
    expect(resolved(twins, 'the emblem, but bigger')).toBe('missed');
  });

  it('ASKS when the ordinal runs past the end of the round', () => {
    // Two-cut rounds (ADR-0049) make "the fourth one" reachable and wrong.
    expect(resolved(sleeve, 'the fourth one is closest')).toBe('missed');
  });

  it('does NOT interrogate a pole word nothing carries', () => {
    // "too colorful" on a blackwork round is a complaint about the piece, not
    // a reference to a cut nobody rendered. Treating every pole word as a
    // reference would make the lane ask questions instead of doing work.
    const recut: Variation = { id: 'c2-fix1', axisPosition: {}, prompt: 'p2 fixed' };
    expect(resolved({ ...sleeve, critiqueCuts: [recut] }, 'too colorful')).toBe('c2-fix1');
  });
});

/**
 * The other half of the two dead sessions. "Give me 4 new samples not any
 * particular number" and "more like an unreal engine 5 look" both drew
 * "which one am i fixing?" — the first three times running, the second twice
 * before the customer gave up. Neither was ever about one cut.
 */
describe('critique — what kind of turn is this (ADR-0056)', () => {
  const session = { variations: variations(), critiqueCuts: [] as Variation[], pickId: undefined };

  it('routes the exact messages that deadlocked session 0f6234e9', () => {
    for (const message of [
      'Redo it again and give me 4 new ones',
      'Give me 4 new samples not any particular number',
      'start over',
      'can i get some different options',
    ]) {
      expect(classifyCritiqueTurn(session, message).kind).toBe('reroll-set');
    }
  });

  it('routes a direction for the whole piece, and carries their words', () => {
    const intent = classifyCritiqueTurn(session, 'more like an unreal engine 5 look');

    expect(intent.kind).toBe('reroll-set');
    expect(intent.kind === 'reroll-set' && intent.styleHint).toBe(
      'more like an unreal engine 5 look'
    );
  });

  it('carries the hint on a re-roll that also asks for a direction', () => {
    // Fable's ordering: the destructive reading wins on explicit signal, and
    // the direction rides along rather than being lost.
    const intent = classifyCritiqueTurn(session, 'new ones, more cinematic feel');

    expect(intent.kind).toBe('reroll-set');
    expect(intent.kind === 'reroll-set' && intent.styleHint).toBe('new ones, more cinematic feel');
  });

  it('leaves the hint empty on a bare re-roll', () => {
    const intent = classifyCritiqueTurn(session, 'redo it');

    expect(intent.kind === 'reroll-set' && intent.styleHint).toBe('');
  });

  it('A NAMED CUT OUTRANKS a whole-piece phrase', () => {
    // "the third one, more like an unreal engine 5 look" is a fix to cut
    // three. Only a cut reached by CONTEXT can be re-read as being about the
    // piece — which is what `via` exists to tell us.
    const intent = classifyCritiqueTurn(
      session,
      'the third one, more like an unreal engine 5 look'
    );

    expect(intent.kind).toBe('iterate-cut');
    expect(intent.kind === 'iterate-cut' && intent.target.id).toBe('v3');
  });

  it('does not re-read an unplaceable NAME as a whole-piece request', () => {
    // "the totem" on a round without one, plus a style word. The name failed;
    // that must surface as a question, not get quietly upgraded to a re-roll
    // that throws away the set.
    const sleeve = {
      variations: [{ id: 'c2', axisPosition: { composition: 'connected transitions' }, prompt: 'p' }],
      critiqueCuts: [] as Variation[],
      pickId: undefined,
    };
    const intent = classifyCritiqueTurn(sleeve, 'the totem, but a more cinematic look');

    expect(intent.kind).toBe('ambiguous');
    expect(intent.kind === 'ambiguous' && intent.because).toBe('unplaceable-name');
  });

  it('still routes a plain per-cut fix to the cut', () => {
    expect(classifyCritiqueTurn(session, 'the third one but less color').kind).toBe('iterate-cut');
  });

  it('keeps chatter out of every other arm', () => {
    expect(classifyCritiqueTurn(session, 'love it').kind).toBe('commentary');
  });

  it('distinguishes its two ambiguous reasons', () => {
    expect(
      classifyCritiqueTurn(session, "riku's missing")
    ).toEqual({ kind: 'ambiguous', because: 'no-cut-named' });
    // A two-cut round (ADR-0049) makes "the fourth one" reachable and wrong.
    const round = { variations: sleeveCuts(), critiqueCuts: [] as Variation[], pickId: undefined };
    expect(
      classifyCritiqueTurn(round, 'the fourth one is closest')
    ).toEqual({ kind: 'ambiguous', because: 'unplaceable-name' });
  });
});

/**
 * Found by review on #340: checking pole words one at a time made being more
 * specific give a worse answer than being vaguer.
 */
describe('critique — more pole words can only narrow', () => {
  // Three cuts share a locked 'fine' pole; only one is also blackwork.
  const locked = {
    variations: [
      { id: 'a', axisPosition: { 'bold-fine': 'fine', 'color-blackwork': 'color' }, prompt: 'p' },
      { id: 'b', axisPosition: { 'bold-fine': 'fine', 'color-blackwork': 'color' }, prompt: 'p' },
      { id: 'c', axisPosition: { 'bold-fine': 'fine', 'color-blackwork': 'blackwork' }, prompt: 'p' },
    ],
    critiqueCuts: [] as Variation[],
    pickId: undefined,
  };

  it('resolves the maximally specific reference', () => {
    // 'fine' alone matches three. Checked first and alone, it used to give up
    // here — while the vaguer 'the blackwork one' resolved fine.
    expect(resolved(locked, 'the fine blackwork one, riku is missing')).toBe('c');
  });

  it('still asks when the words together match more than one', () => {
    expect(resolved(locked, 'the fine color one')).toBe('missed');
  });

  it('asks when they described a pairing this round never drew', () => {
    expect(resolved(locked, 'the bold blackwork one')).toBe('missed');
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

  it('SPENDS NOTHING on a cut name it cannot place, even with a pick to fall back on', async () => {
    // The money path of the 0f6234e9 failure. A pick exists, so the old
    // resolver had a target to return and returned it — a paid render on a
    // design the customer never referred to, announced by name as if correct.
    await seed({ phase: 'picked', pickId: 'v2', mostNotYouId: 'v4' });
    const result = await critique('sess-critique', { message: 'the totem, but bigger' });

    expect(result.generated).toBe(false);
    expect(result.reply).toBe(NO_SUCH_CUT_LINE);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockRecordSpend).not.toHaveBeenCalled();
    // Nothing was fixed, so nothing came off the allowance.
    expect(result.fixesRemaining).toBe(DEFAULT_STUDIO_FIX_ALLOWANCE);
  });

  it('answers a re-roll with a sentence, never a stack trace or the wrong question', async () => {
    // The route is decided; the executor that draws a fresh set lands with the
    // re-roll work. Until then this must be honest copy — the old behaviour
    // was "which one am i fixing?", three times, at a customer who had just
    // said they were not fixing one.
    await seed();
    const result = await critique('sess-critique', {
      message: 'Give me 4 new samples not any particular number',
    });

    expect(result.generated).toBe(false);
    expect(result.reply).toBe(SET_REDRAW_UNAVAILABLE_LINE);
    expect(result.reply).not.toBe(WHICH_CUT_LINE);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockRecordSpend).not.toHaveBeenCalled();
  });

  it('does NOT refuse a re-roll out of the fix allowance', async () => {
    // A fresh set is a generation round (one credit, ADR-0049), not a fix.
    // Spending the fix allowance must not silently close the re-roll door.
    process.env.STUDIO_FIX_ALLOWANCE = '0';
    await seed();
    const result = await critique('sess-critique', { message: 'start over' });

    expect(result.reply).toBe(SET_REDRAW_UNAVAILABLE_LINE);
    expect(result.reply).not.toBe(ALLOWANCE_SPENT_LINE);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('names the cut back with the name the grid showed', async () => {
    // What we say and what we resolve come from one table now — the reply
    // that announced the wrong cut is the same string the resolver matched on.
    await seed({ variations: sleeveCuts() });
    const result = await critique('sess-critique', { message: 'the totem, but bigger' });

    expect(result.generated).toBe(true);
    expect(result.reply).toContain('the totem');
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
