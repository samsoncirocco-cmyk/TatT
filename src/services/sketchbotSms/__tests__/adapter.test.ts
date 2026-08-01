/**
 * Channel adapter (TAT-49) — conversation round trips, the reveal flow, and
 * every REQUIRED spend guardrail. All mock-based: the design-session
 * service, budget tracker, spend recorder, share store, and Firebase auth
 * are mocked; profiles run on the in-memory store (ensureAdminApp → null).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleInbound,
  executeReveal,
  executeRefine,
  recordOptOut,
  isOptedOut,
} from '../index';
import {
  clearMemoryProfiles,
  memoryProfileStore,
} from '../internal/profileStore';
import {
  REVEAL_ACK,
  BUDGET_EXHAUSTED_TEXT,
  REVEAL_FAILED_TEXT,
  REFINE_FAILED_TEXT,
} from '../internal/render';
import {
  converse,
  confirmProposal,
  getSession,
  recordPick,
  refine,
  DesignSessionError,
} from '@/services/designSession';
import { checkBudget, recordConversationTurnSpend } from '@/lib/budget-tracker';
import { recordImageSpend } from '@/app/api/v1/design-session/shared';
import { resolveSharedDesignStore } from '@/lib/shared-design-store';
import { getAuth } from 'firebase-admin/auth';

vi.mock('@/services/designSession', () => {
  class DesignSessionError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, message = code) {
      super(message);
      this.name = 'DesignSessionError';
      this.code = code;
      this.status = 500;
    }
  }
  return {
    converse: vi.fn(),
    confirmProposal: vi.fn(),
    attachReference: vi.fn(),
    getSession: vi.fn(),
    recordPick: vi.fn(),
    refine: vi.fn(),
    DesignSessionError,
  };
});

vi.mock('@/lib/budget-tracker', () => ({
  checkBudget: vi.fn(async () => ({ allowed: true, spentCents: 0, remainingCents: 1000 })),
  recordConversationTurnSpend: vi.fn(async () => {}),
}));

vi.mock('@/app/api/v1/design-session/shared', () => ({
  recordImageSpend: vi.fn(async () => {}),
  REFINE_IMAGE_COUNT: 1,
}));

const shareSave = vi.fn(async () => {});
vi.mock('@/lib/shared-design-store', () => ({
  resolveSharedDesignStore: vi.fn(() => ({ save: shareSave })),
}));

// Memory stores everywhere: profile store resolves on ensureAdminApp.
vi.mock('@/lib/firebase-admin', () => ({ ensureAdminApp: () => null }));

// Unlinked by default — individual tests flip this to simulate an account
// whose verified phone matches the texter.
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    getUserByPhoneNumber: vi.fn(async () => {
      throw new Error('no user record');
    }),
  })),
}));

const PHONE = '+15551234567';

function mockLinked(uid: string | null) {
  vi.mocked(getAuth).mockImplementation(
    () =>
      ({
        getUserByPhoneNumber: async () => {
          if (!uid) throw new Error('no user record');
          return { uid };
        },
      }) as unknown as ReturnType<typeof getAuth>
  );
}

function turn(
  stage: 'chatting' | 'proposal' | 'handoff',
  overrides: Record<string, unknown> = {}
) {
  return {
    sessionId: 's1',
    reply: 'Love that. What style are you drawn to?',
    stage,
    turn: 1,
    ...overrides,
  };
}

function revealedSession() {
  return {
    id: 's1',
    phase: 'revealed',
    provider: 'vertex',
    intake: {
      placement: 'forearm',
      styleTags: ['Traditional'],
      meaning: 'resilience',
      subject: 'snake and dagger',
      references: [],
      ambiguousAxes: [],
    },
    axisSelection: { mode: 'questionnaire', axes: [], rationale: '' },
    variations: [1, 2, 3, 4].map((n) => ({
      id: `v${n}`,
      axisPosition: {},
      prompt: `prompt ${n}`,
      imageUrl: `https://storage.example/cut-${n}.png`,
    })),
    createdAt: '2026-07-29T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
  };
}

/** Walk the profile to 'proposal' so a yes can arm the reveal. */
async function driveToProposal(phone = PHONE) {
  vi.mocked(converse).mockResolvedValueOnce(
    turn('proposal', { playback: 'a traditional snake and dagger on your forearm' })
  );
  await handleInbound({ phone, body: 'a snake and dagger on my forearm' });
}

beforeEach(() => {
  clearMemoryProfiles();
  vi.clearAllMocks();
  mockLinked(null);
  vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://tatttester.com');
  vi.mocked(checkBudget).mockResolvedValue({
    allowed: true,
    spentCents: 0,
    remainingCents: 1000,
  });
  vi.mocked(resolveSharedDesignStore).mockReturnValue({
    save: shareSave,
  } as unknown as ReturnType<typeof resolveSharedDesignStore>);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('conversation round trip', () => {
  it('routes a text through the engine and returns an SMS-shaped reply', async () => {
    vi.mocked(converse).mockResolvedValueOnce(
      turn('chatting', { reply: '**Love it.** A snake has _real_ movement. Where would it go?' })
    );

    const outcome = await handleInbound({ phone: PHONE, body: 'thinking about a snake' });

    expect(outcome).toEqual({
      kind: 'reply',
      text: 'Love it. A snake has real movement. Where would it go?',
    });
    expect(converse).toHaveBeenCalledWith({ message: 'thinking about a snake' });
    // Same per-turn budget line item as the web converse route.
    expect(recordConversationTurnSpend).toHaveBeenCalledTimes(1);
  });

  it('threads the next text onto the same session', async () => {
    vi.mocked(converse).mockResolvedValueOnce(turn('chatting'));
    await handleInbound({ phone: PHONE, body: 'a snake' });

    vi.mocked(converse).mockResolvedValueOnce(turn('chatting', { turn: 2 }));
    await handleInbound({ phone: PHONE, body: 'on my forearm' });

    expect(converse).toHaveBeenLastCalledWith({ sessionId: 's1', message: 'on my forearm' });
  });

  it('records every session on the profile — the ADR-0022 taste trail', async () => {
    vi.mocked(converse).mockResolvedValueOnce(turn('chatting'));
    await handleInbound({ phone: PHONE, body: 'a snake' });

    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.sessionIds).toEqual(['s1']);
    expect(profile?.activeSessionId).toBe('s1');
    expect(profile?.lastStage).toBe('chatting');
  });

  it('answers honestly when every conversation provider is down', async () => {
    vi.mocked(converse).mockRejectedValueOnce(
      new DesignSessionError('CONVERSATION_UNAVAILABLE')
    );
    const outcome = await handleInbound({ phone: PHONE, body: 'a snake' });
    expect(outcome.kind).toBe('reply');
    if (outcome.kind === 'reply') {
      expect(outcome.text).toContain('https://tatttester.com/design');
    }
  });

  it('starts fresh when the stored session is stale, keeping the message', async () => {
    vi.mocked(converse).mockResolvedValueOnce(turn('chatting'));
    await handleInbound({ phone: PHONE, body: 'a snake' });

    vi.mocked(converse)
      .mockRejectedValueOnce(new DesignSessionError('SESSION_NOT_FOUND'))
      .mockResolvedValueOnce(turn('chatting', { sessionId: 's2' }));
    const outcome = await handleInbound({ phone: PHONE, body: 'still here?' });

    expect(outcome.kind).toBe('reply');
    expect(converse).toHaveBeenLastCalledWith({ message: 'still here?' });
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.activeSessionId).toBe('s2');
    expect(profile?.sessionIds).toEqual(['s1', 's2']);
  });

  it('closes the thread on handoff and appends the smart-match link', async () => {
    vi.mocked(converse).mockResolvedValueOnce(
      turn('handoff', { handoffUrl: '/smart-match' })
    );
    const outcome = await handleInbound({ phone: PHONE, body: 'hmm not sure' });

    if (outcome.kind !== 'reply') throw new Error('expected reply');
    expect(outcome.text).toContain('https://tatttester.com/smart-match');
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.activeSessionId).toBeNull();
  });
});

describe('reveal flow', () => {
  it('arms the reveal on a yes at the proposal', async () => {
    await driveToProposal();
    const outcome = await handleInbound({ phone: PHONE, body: 'yes' });

    expect(outcome).toEqual({
      kind: 'reveal',
      text: REVEAL_ACK,
      sessionId: 's1',
      phone: PHONE,
    });
    // Generation is NOT fired synchronously — the route defers it.
    expect(confirmProposal).not.toHaveBeenCalled();
  });

  it('treats a correction at the proposal as another conversation turn', async () => {
    await driveToProposal();
    vi.mocked(converse).mockResolvedValueOnce(turn('proposal', { turn: 2 }));

    const outcome = await handleInbound({
      phone: PHONE,
      body: 'actually make it a dagger only',
    });
    expect(outcome.kind).toBe('reply');
    expect(confirmProposal).not.toHaveBeenCalled();
  });

  it('delivers four captioned cuts and a share link, and records the spend', async () => {
    await driveToProposal();
    await handleInbound({ phone: PHONE, body: 'yes' });
    vi.mocked(confirmProposal).mockResolvedValueOnce(
      revealedSession() as unknown as Awaited<ReturnType<typeof confirmProposal>>
    );

    const delivery = await executeReveal('s1', PHONE);

    expect(delivery.cuts).toHaveLength(4);
    expect(delivery.cuts[0]).toEqual({
      caption: 'Cut 1 of 4',
      mediaUrl: 'https://storage.example/cut-1.png',
    });
    expect(delivery.closingText).toMatch(/https:\/\/tatttester\.com\/share\/[a-z0-9-]+/i);
    // Same pool, same constants as the web reveal.
    expect(recordImageSpend).toHaveBeenCalledWith('vertex', 4);
    // The share carries all four cuts and the intake context.
    expect(shareSave).toHaveBeenCalledTimes(1);
    const share = shareSave.mock.calls[0][0] as Record<string, unknown>;
    expect(share.imageUrls).toHaveLength(4);
    expect(share.bodyPart).toBe('forearm');

    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.lastStage).toBe('revealed');
  });

  it('waits patiently while a reveal is in flight — no double fire', async () => {
    await driveToProposal();
    await handleInbound({ phone: PHONE, body: 'yes' });

    const again = await handleInbound({ phone: PHONE, body: 'yes' });
    expect(again.kind).toBe('reply');
    if (again.kind === 'reply') expect(again.text).toContain('Still sketching');
    expect(converse).toHaveBeenCalledTimes(1); // only the proposal turn
  });

  it('refunds the slot, tells the truth, and allows a retry when generation fails', async () => {
    await driveToProposal();
    await handleInbound({ phone: PHONE, body: 'yes' });
    vi.mocked(confirmProposal).mockRejectedValueOnce(new Error('provider blew up'));

    const delivery = await executeReveal('s1', PHONE);
    expect(delivery.cuts).toHaveLength(0);
    expect(delivery.closingText).toBe(REVEAL_FAILED_TEXT);

    // The failed reveal did not count: the cap slot is back and the
    // proposal is re-armed for another yes.
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.dailyReveals.count).toBe(0);
    expect(profile?.totalReveals).toBe(0);
    expect(profile?.lastStage).toBe('proposal');

    const retry = await handleInbound({ phone: PHONE, body: 'yes' });
    expect(retry.kind).toBe('reveal');
  });

  it('falls back to the design surface when no durable share store exists', async () => {
    vi.mocked(resolveSharedDesignStore).mockReturnValue(null);
    await driveToProposal();
    await handleInbound({ phone: PHONE, body: 'yes' });
    vi.mocked(confirmProposal).mockResolvedValueOnce(
      revealedSession() as unknown as Awaited<ReturnType<typeof confirmProposal>>
    );

    const delivery = await executeReveal('s1', PHONE);
    expect(delivery.closingText).toContain('https://tatttester.com/design');
  });
});

describe('the pick', () => {
  /** Walk a phone all the way to delivered cuts, awaiting the pick. */
  async function driveToRevealed(phone = PHONE) {
    await driveToProposal(phone);
    await handleInbound({ phone, body: 'yes' });
    vi.mocked(confirmProposal).mockResolvedValueOnce(
      revealedSession() as unknown as Awaited<ReturnType<typeof confirmProposal>>
    );
    await executeReveal('s1', phone);
    vi.mocked(getSession).mockResolvedValue(
      revealedSession() as unknown as Awaited<ReturnType<typeof getSession>>
    );
  }

  it('holds the first tap and asks for its opposite', async () => {
    await driveToRevealed();

    const outcome = await handleInbound({ phone: PHONE, body: '3' });

    expect(outcome.kind).toBe('reply');
    if (outcome.kind === 'reply') expect(outcome.text).toContain('least you');
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.pendingPickId).toBe('v3');
    expect(profile?.lastStage).toBe('pick-pending');
    // Nothing is recorded until both ids are in hand.
    expect(recordPick).not.toHaveBeenCalled();
  });

  it('records the pair on the second tap and asks the refinement question', async () => {
    await driveToRevealed();
    await handleInbound({ phone: PHONE, body: 'the third one' });

    vi.mocked(recordPick).mockResolvedValueOnce({
      ...revealedSession(),
      phase: 'picked',
      refinementQuestion: 'Bolder, or keep it fine?',
    } as unknown as Awaited<ReturnType<typeof recordPick>>);

    const outcome = await handleInbound({ phone: PHONE, body: '1' });

    expect(recordPick).toHaveBeenCalledWith('s1', { pickId: 'v3', mostNotYouId: 'v1' });
    expect(outcome.kind).toBe('reply');
    if (outcome.kind === 'reply') expect(outcome.text).toBe('Bolder, or keep it fine?');
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.lastStage).toBe('refine-pending');
    expect(profile?.pendingPickId).toBeNull();
  });

  // The regression this branch exists to prevent: without it a numbered
  // reply falls through to conversationTurn, which opens a brand-new session
  // because the continuable set is intake-only — discarding the reveal.
  it('never opens a new session while answering about a reveal', async () => {
    await driveToRevealed();
    const before = vi.mocked(converse).mock.calls.length;

    await handleInbound({ phone: PHONE, body: '2' });
    await handleInbound({ phone: PHONE, body: '2 and 3' });

    expect(vi.mocked(converse).mock.calls.length).toBe(before);
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.activeSessionId).toBe('s1');
  });

  it('re-asks when the reply names several cuts', async () => {
    await driveToRevealed();

    const several = await handleInbound({ phone: PHONE, body: '2 and 3' });

    expect(several.kind).toBe('reply');
    if (several.kind === 'reply') expect(several.text).toContain('1 to 4');
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.lastStage).toBe('revealed');
    expect(profile?.pendingPickId).toBeFalsy();
  });

  // The channel's existing rule survives the new branch: a text that isn't
  // answering the pick question opens a fresh design rather than trapping
  // the texter in "just give me a number".
  it('lets a new idea after the reveal start a new design', async () => {
    await driveToRevealed();
    vi.mocked(converse).mockResolvedValueOnce(turn('chatting', { sessionId: 's2' }));

    const outcome = await handleInbound({ phone: PHONE, body: 'actually I want a dragon' });

    expect(outcome.kind).toBe('reply');
    expect(converse).toHaveBeenLastCalledWith({ message: 'actually I want a dragon' });
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.activeSessionId).toBe('s2');
  });

  it('abandons a half-finished pick when the texter moves on', async () => {
    await driveToRevealed();
    await handleInbound({ phone: PHONE, body: '3' });
    vi.mocked(converse).mockResolvedValueOnce(turn('chatting', { sessionId: 's2' }));

    await handleInbound({ phone: PHONE, body: 'scrap it, I want a koi instead' });

    expect(recordPick).not.toHaveBeenCalled();
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.pendingPickId).toBeNull();
    expect(profile?.activeSessionId).toBe('s2');
  });

  it('refuses a most-not-you that names the kept cut', async () => {
    await driveToRevealed();
    await handleInbound({ phone: PHONE, body: '2' });

    const outcome = await handleInbound({ phone: PHONE, body: '2' });

    expect(recordPick).not.toHaveBeenCalled();
    expect(outcome.kind).toBe('reply');
    if (outcome.kind === 'reply') expect(outcome.text).toContain('different number');
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.lastStage).toBe('pick-pending');
  });

  it('starts a fresh design when the session expired underneath the profile', async () => {
    await driveToRevealed();
    vi.mocked(getSession).mockRejectedValueOnce(new DesignSessionError('SESSION_NOT_FOUND'));
    vi.mocked(converse).mockResolvedValueOnce(turn('chatting', { sessionId: 's2' }));

    const outcome = await handleInbound({ phone: PHONE, body: '3' });

    expect(outcome.kind).toBe('reply');
    expect(converse).toHaveBeenLastCalledWith({ message: '3' });
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.activeSessionId).toBe('s2');
  });

  it('clears post-reveal state when the session already moved on', async () => {
    await driveToRevealed();
    await handleInbound({ phone: PHONE, body: '4' });
    vi.mocked(recordPick).mockRejectedValueOnce(new DesignSessionError('INVALID_PHASE'));

    const outcome = await handleInbound({ phone: PHONE, body: '1' });

    expect(outcome.kind).toBe('reply');
    if (outcome.kind === 'reply') expect(outcome.text).toContain('fresh one');
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.lastStage).toBeNull();
    expect(profile?.activeSessionId).toBeNull();
    expect(profile?.pendingPickId).toBeNull();
  });
});

describe('the refinement round', () => {
  /** Walk a phone to 'refine-pending' — pick recorded, question asked. */
  async function driveToRefinePending(phone = PHONE) {
    await driveToProposal(phone);
    await handleInbound({ phone, body: 'yes' });
    vi.mocked(confirmProposal).mockResolvedValueOnce(
      revealedSession() as unknown as Awaited<ReturnType<typeof confirmProposal>>
    );
    await executeReveal('s1', phone);
    vi.mocked(getSession).mockResolvedValue(
      revealedSession() as unknown as Awaited<ReturnType<typeof getSession>>
    );
    await handleInbound({ phone, body: '3' });
    vi.mocked(recordPick).mockResolvedValueOnce({
      ...revealedSession(),
      phase: 'picked',
      refinementQuestion: 'Bolder, or keep it fine?',
    } as unknown as Awaited<ReturnType<typeof recordPick>>);
    await handleInbound({ phone, body: '1' });
  }

  function completedSession() {
    return {
      ...revealedSession(),
      phase: 'complete',
      refinedVariation: {
        id: 'v3-refined',
        axisPosition: {},
        prompt: 'prompt 3 bolder',
        imageUrl: 'https://storage.example/refined.png',
      },
      brief: { placement: 'forearm', styleTags: ['Traditional'], meaning: 'resilience' },
    };
  }

  it('treats the answer as free text and defers the render', async () => {
    await driveToRefinePending();

    const outcome = await handleInbound({ phone: PHONE, body: 'bolder, heavier lines' });

    expect(outcome.kind).toBe('refine');
    if (outcome.kind === 'refine') {
      expect(outcome.answer).toBe('bolder, heavier lines');
      expect(outcome.sessionId).toBe('s1');
    }
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.lastStage).toBe('refine-running');
  });

  it('delivers the regen and a handoff link carrying the session id', async () => {
    await driveToRefinePending();
    await handleInbound({ phone: PHONE, body: 'bolder' });
    vi.mocked(refine).mockResolvedValueOnce(
      completedSession() as unknown as Awaited<ReturnType<typeof refine>>
    );

    const delivery = await executeRefine('s1', PHONE, 'bolder');

    expect(refine).toHaveBeenCalledWith('s1', { answer: 'bolder' });
    expect(delivery.cuts).toEqual([
      { caption: 'The tightened version', mediaUrl: 'https://storage.example/refined.png' },
    ]);
    // The whole point of reaching 'complete': /smart-match can now load the
    // brief, and the id threads onward into the booking.
    expect(delivery.closingText).toContain('https://tatttester.com/smart-match?ds=s1');
    // One image on the session's pinned provider (ADR-0013).
    expect(recordImageSpend).toHaveBeenLastCalledWith('vertex', 1);
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.lastStage).toBe('complete');
  });

  // The two-deliverable payoff: the texter approved a render, the artist
  // needs line art, and both travel together.
  it('sends the stencil alongside the design when one was derived', async () => {
    await driveToRefinePending();
    await handleInbound({ phone: PHONE, body: 'bolder' });
    vi.mocked(refine).mockResolvedValueOnce({
      ...completedSession(),
      brief: {
        placement: 'forearm',
        styleTags: ['Traditional'],
        meaning: 'resilience',
        stencilUrl: 'https://gcs.example/stencil.png',
      },
    } as unknown as Awaited<ReturnType<typeof refine>>);

    const delivery = await executeRefine('s1', PHONE, 'bolder');

    expect(delivery.cuts).toHaveLength(2);
    expect(delivery.cuts[1].mediaUrl).toBe('https://gcs.example/stencil.png');
    expect(delivery.cuts[1].caption).toMatch(/stencil/i);
    expect(delivery.closingText).toMatch(/two files/i);
  });

  // Derivation is off by default and can fail. Promising two files when one
  // arrived reads as a broken send.
  it('never promises a stencil that was not derived', async () => {
    await driveToRefinePending();
    await handleInbound({ phone: PHONE, body: 'bolder' });
    vi.mocked(refine).mockResolvedValueOnce(
      completedSession() as unknown as Awaited<ReturnType<typeof refine>>
    );

    const delivery = await executeRefine('s1', PHONE, 'bolder');

    expect(delivery.cuts).toHaveLength(1);
    expect(delivery.closingText).not.toMatch(/two files/i);
  });

  it('never double-fires the render on an impatient second text', async () => {
    await driveToRefinePending();
    await handleInbound({ phone: PHONE, body: 'bolder' });

    const again = await handleInbound({ phone: PHONE, body: 'bolder!!' });

    expect(again.kind).toBe('reply');
    if (again.kind === 'reply') expect(again.text).toContain('Still reworking');
  });

  it('re-arms for another answer when the regen fails', async () => {
    await driveToRefinePending();
    await handleInbound({ phone: PHONE, body: 'bolder' });
    vi.mocked(refine).mockRejectedValueOnce(new Error('provider blew up'));

    const delivery = await executeRefine('s1', PHONE, 'bolder');

    expect(delivery.cuts).toHaveLength(0);
    expect(delivery.closingText).toBe(REFINE_FAILED_TEXT);
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.lastStage).toBe('refine-pending');
    expect(recordImageSpend).not.toHaveBeenCalledWith('vertex', 1);
  });

  it('refuses the render when the global budget is gone', async () => {
    await driveToRefinePending();
    vi.mocked(checkBudget).mockResolvedValueOnce({
      allowed: false,
      spentCents: 50000,
      remainingCents: 0,
    });

    const outcome = await handleInbound({ phone: PHONE, body: 'bolder' });

    expect(outcome.kind).toBe('reply');
    if (outcome.kind === 'reply') expect(outcome.text).toBe(BUDGET_EXHAUSTED_TEXT);
    expect(refine).not.toHaveBeenCalled();
  });
});

describe('spend guardrails', () => {
  async function completeReveal(sessionId = 's1') {
    vi.mocked(confirmProposal).mockResolvedValueOnce(
      revealedSession() as unknown as Awaited<ReturnType<typeof confirmProposal>>
    );
    await executeReveal(sessionId, PHONE);
  }

  it('refuses the third reveal of the day in-voice (default cap 2)', async () => {
    mockLinked('user-1'); // linked, so the daily cap is the binding guardrail

    for (let i = 0; i < 2; i++) {
      await driveToProposal();
      const armed = await handleInbound({ phone: PHONE, body: 'yes' });
      expect(armed.kind).toBe('reveal');
      await completeReveal();
    }

    await driveToProposal();
    const third = await handleInbound({ phone: PHONE, body: 'yes' });
    expect(third.kind).toBe('reply');
    if (third.kind === 'reply') {
      expect(third.text).toContain("I've put a lot in front of you today");
      expect(third.text).toContain('https://tatttester.com/design');
    }
    expect(confirmProposal).toHaveBeenCalledTimes(2); // never a third render
  });

  it('honors an env-tuned cap', async () => {
    vi.stubEnv('SKETCHBOT_SMS_REVEALS_PER_DAY', '1');
    mockLinked('user-1');

    await driveToProposal();
    expect((await handleInbound({ phone: PHONE, body: 'yes' })).kind).toBe('reveal');
    await completeReveal();

    await driveToProposal();
    expect((await handleInbound({ phone: PHONE, body: 'yes' })).kind).toBe('reply');
  });

  it('gates the third lifetime reveal behind an account for unlinked numbers', async () => {
    vi.stubEnv('SKETCHBOT_SMS_REVEALS_PER_DAY', '10'); // daily cap out of the way

    for (let i = 0; i < 2; i++) {
      await driveToProposal();
      expect((await handleInbound({ phone: PHONE, body: 'yes' })).kind).toBe('reveal');
      await completeReveal();
    }

    await driveToProposal();
    const gated = await handleInbound({ phone: PHONE, body: 'yes' });
    expect(gated.kind).toBe('reply');
    if (gated.kind === 'reply') {
      expect(gated.text).toContain('https://tatttester.com/signup');
    }
  });

  it('upgrades a guest to their account mid-conversation and lifts the gate', async () => {
    vi.stubEnv('SKETCHBOT_SMS_REVEALS_PER_DAY', '10');

    for (let i = 0; i < 2; i++) {
      await driveToProposal();
      await handleInbound({ phone: PHONE, body: 'yes' });
      await completeReveal();
    }

    // The texter signs up with this verified phone; the next yes re-checks
    // and links the guest profile in place — history intact, gate lifted.
    mockLinked('user-42');
    await driveToProposal();
    const outcome = await handleInbound({ phone: PHONE, body: 'yes' });

    expect(outcome.kind).toBe('reveal');
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.uid).toBe('user-42');
    expect(profile?.totalReveals).toBe(3);
    expect(profile?.sessionIds.length).toBeGreaterThan(0);
  });

  it('answers the budget-exhausted day honestly and refunds the slot', async () => {
    await driveToProposal();
    vi.mocked(checkBudget).mockResolvedValueOnce({
      allowed: false,
      spentCents: 50_000,
      remainingCents: 0,
    });

    const outcome = await handleInbound({ phone: PHONE, body: 'yes' });
    expect(outcome).toEqual({ kind: 'reply', text: BUDGET_EXHAUSTED_TEXT });

    // The refused reveal consumed nothing.
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile?.dailyReveals.count).toBe(0);
    expect(profile?.totalReveals).toBe(0);
    // And the proposal is still live: budget back → the yes works.
    const retry = await handleInbound({ phone: PHONE, body: 'yes' });
    expect(retry.kind).toBe('reveal');
  });
});

describe('opt-out', () => {
  it('goes silent for a number that texted STOP, and re-opens on START', async () => {
    await recordOptOut(PHONE, 'STOP');
    expect(await isOptedOut(PHONE)).toBe(true);

    const outcome = await handleInbound({ phone: PHONE, body: 'hello?' });
    expect(outcome).toEqual({ kind: 'silent' });
    expect(converse).not.toHaveBeenCalled();

    await recordOptOut(PHONE, 'START');
    expect(await isOptedOut(PHONE)).toBe(false);
    vi.mocked(converse).mockResolvedValueOnce(turn('chatting'));
    expect((await handleInbound({ phone: PHONE, body: 'back' })).kind).toBe('reply');
  });

  it('asks for words on a media-only MMS', async () => {
    const outcome = await handleInbound({ phone: PHONE, body: '   ' });
    expect(outcome.kind).toBe('reply');
    expect(converse).not.toHaveBeenCalled();
  });
});
