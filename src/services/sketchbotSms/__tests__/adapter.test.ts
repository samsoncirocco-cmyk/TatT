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
  recordOptOut,
  isOptedOut,
} from '../index';
import {
  clearMemoryProfiles,
  memoryProfileStore,
} from '../internal/profileStore';
import { REVEAL_ACK, BUDGET_EXHAUSTED_TEXT, REVEAL_FAILED_TEXT } from '../internal/render';
import { converse, confirmProposal, DesignSessionError } from '@/services/designSession';
import { checkBudget, recordConversationTurnSpend } from '@/lib/budget-tracker';
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
    DesignSessionError,
  };
});

vi.mock('@/lib/budget-tracker', () => ({
  checkBudget: vi.fn(async () => ({ allowed: true, spentCents: 0, remainingCents: 1000 })),
  recordConversationTurnSpend: vi.fn(async () => {}),
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
