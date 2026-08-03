/**
 * Adapter handling of inbound MMS reference photos (TAT-50): the in-voice
 * acknowledgment that names what was seen, session attach (including the
 * free opener when no conversation is live), the engine-turn annotation,
 * and the honest budget/unreadable lines. The media pipeline and the
 * design-session service are mocked at their module boundaries.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleInbound } from '../index';
import { clearMemoryProfiles, memoryProfileStore } from '../internal/profileStore';
import { REVEAL_ACK } from '../internal/render';
import { analyzeInboundMedia, type MediaIngest } from '../internal/media';
import { converse, confirmProposal, attachReference } from '@/services/designSession';
import {
  REFERENCE_BUDGET_TEXT,
  REFERENCE_UNREADABLE_TEXT,
  type ReferenceAnalysis,
} from '@/services/vision';
import { checkBudget } from '@/lib/budget-tracker';

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
    attachReference: vi.fn(async () => ({ sessionId: 's1', summary: '', notes: {} })),
    getSession: vi.fn(),
    recordPick: vi.fn(),
    refine: vi.fn(),
    critique: vi.fn(),
    attachPlacementPreview: vi.fn(),
    allCuts: (session: { variations?: unknown[]; critiqueCuts?: unknown[] }) => [
      ...(session.variations ?? []),
      ...(session.critiqueCuts ?? []),
    ],
    isFixRequest: () => true,
    DesignSessionError,
  };
});

vi.mock('../internal/media', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../internal/media')>();
  return { ...actual, analyzeInboundMedia: vi.fn() };
});

vi.mock('@/lib/budget-tracker', () => ({
  checkBudget: vi.fn(async () => ({ allowed: true, spentCents: 0, remainingCents: 1000 })),
  recordConversationTurnSpend: vi.fn(async () => {}),
}));
vi.mock('@/lib/firebase-admin', () => ({ ensureAdminApp: () => null }));
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    getUserByPhoneNumber: vi.fn(async () => {
      throw new Error('no user record');
    }),
  })),
}));

const PHONE = '+15551234567';
const MEDIA = [{ url: 'https://api.twilio.com/m/0', contentType: 'image/jpeg' }];

const CHIBI_ANALYSIS: ReferenceAnalysis = {
  summary: 'five chibi anime characters, bold outlines, cel shading, red smoke background',
  subjects: ['group of five characters'],
  characters: [{ name: 'Yusuke Urameshi', series: 'Yu Yu Hakusho' }],
  styleDescriptors: ['chibi', 'anime', 'cel shading'],
  palette: ['red', 'black'],
  composition: 'group shot',
  confidence: 0.9,
};

function ingest(overrides: Partial<MediaIngest> = {}): MediaIngest {
  return {
    analyses: [CHIBI_ANALYSIS],
    unreadable: 0,
    ignored: 0,
    budgetExhausted: false,
    ...overrides,
  };
}

const analyzeMock = vi.mocked(analyzeInboundMedia);
const converseMock = vi.mocked(converse);
const attachMock = vi.mocked(attachReference);

function converseResponse(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: 's1',
    reply: 'Love that direction. Where on your body would it go?',
    stage: 'chatting' as const,
    turn: 1,
    ...overrides,
  };
}

beforeEach(() => {
  clearMemoryProfiles();
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
  vi.mocked(checkBudget).mockResolvedValue({ allowed: true, spentCents: 0, remainingCents: 1000 });
  analyzeMock.mockResolvedValue(ingest());
  converseMock.mockResolvedValue(converseResponse());
});

describe('media-only MMS', () => {
  it('opens a session, attaches the reference, and acknowledges what it saw with ONE follow-up', async () => {
    converseMock.mockResolvedValueOnce(
      converseResponse({ sessionId: 's-new', reply: 'opener', turn: 0 })
    );

    const outcome = await handleInbound({ phone: PHONE, body: '', media: MEDIA });

    expect(outcome.kind).toBe('reply');
    if (outcome.kind !== 'reply') throw new Error('unreachable');
    // Names what was seen — never a silent ingest.
    expect(outcome.text).toContain('five chibi anime characters');
    // Characters recognized → the cast-vs-style fork is the one follow-up.
    expect(outcome.text).toContain('Want the characters themselves in the piece');

    // The opener call created the session and the reference attached to it.
    expect(converseMock).toHaveBeenCalledWith({});
    expect(attachMock).toHaveBeenCalledWith('s-new', CHIBI_ANALYSIS, 'sms');
    const profile = await memoryProfileStore.get(PHONE);
    expect(profile!.activeSessionId).toBe('s-new');
    expect(profile!.sessionIds).toContain('s-new');
  });

  it('says the honest unreadable line when nothing could be read', async () => {
    analyzeMock.mockResolvedValue(ingest({ analyses: [], unreadable: 1 }));

    const outcome = await handleInbound({ phone: PHONE, body: '', media: MEDIA });

    expect(outcome).toEqual({ kind: 'reply', text: REFERENCE_UNREADABLE_TEXT });
    expect(attachMock).not.toHaveBeenCalled();
  });

  it('says the honest capacity line when the vision budget is exhausted', async () => {
    analyzeMock.mockResolvedValue(ingest({ analyses: [], budgetExhausted: true }));

    const outcome = await handleInbound({ phone: PHONE, body: '', media: MEDIA });

    expect(outcome).toEqual({ kind: 'reply', text: REFERENCE_BUDGET_TEXT });
    expect(attachMock).not.toHaveBeenCalled();
  });

  it('acknowledges photos beyond the cap instead of silently dropping them', async () => {
    analyzeMock.mockResolvedValue(ingest({ ignored: 2 }));
    converseMock.mockResolvedValueOnce(
      converseResponse({ sessionId: 's-new', reply: 'opener', turn: 0 })
    );

    const outcome = await handleInbound({ phone: PHONE, body: '', media: MEDIA });

    if (outcome.kind !== 'reply') throw new Error('unreachable');
    expect(outcome.text).toContain('I stuck with the first photo');
  });
});

describe('media + text', () => {
  it('threads the photo into the engine turn as an annotation and prepends the ack', async () => {
    converseMock
      .mockResolvedValueOnce(converseResponse({ sessionId: 's1', reply: 'opener', turn: 0 }))
      .mockResolvedValueOnce(converseResponse());

    const outcome = await handleInbound({
      phone: PHONE,
      body: 'something like this on my forearm',
      media: MEDIA,
    });

    if (outcome.kind !== 'reply') throw new Error('unreachable');
    expect(outcome.text).toMatch(/^Got your photo — I'm seeing five chibi anime characters/);
    expect(outcome.text).toContain('Where on your body would it go?');

    // Second converse call is the real turn, annotated and threaded onto
    // the session the opener created.
    const turnCall = converseMock.mock.calls[1][0];
    expect(turnCall.sessionId).toBe('s1');
    expect(turnCall.message).toContain('something like this on my forearm');
    expect(turnCall.message).toContain('[photo attached — five chibi anime characters');
    expect(attachMock).toHaveBeenCalledWith('s1', CHIBI_ANALYSIS, 'sms');
  });

  it('continues the text turn after a budget-refused analysis, with the capacity line first', async () => {
    analyzeMock.mockResolvedValue(ingest({ analyses: [], budgetExhausted: true }));

    const outcome = await handleInbound({ phone: PHONE, body: 'a rose', media: MEDIA });

    if (outcome.kind !== 'reply') throw new Error('unreachable');
    expect(outcome.text).toMatch(/^I can't study photos right now/);
    expect(outcome.text).toContain('Where on your body would it go?');
    // No annotation without an analysis.
    expect(converseMock.mock.calls[0][0].message).toBe('a rose');
  });
});

describe('media + confirmation', () => {
  it('attaches the reference before arming the reveal and keeps the ack in the reply', async () => {
    // Walk to proposal first.
    converseMock.mockResolvedValueOnce(
      converseResponse({ stage: 'proposal', playback: 'a chibi group on your forearm' })
    );
    await handleInbound({ phone: PHONE, body: 'chibi crew on my forearm' });

    const outcome = await handleInbound({ phone: PHONE, body: 'yes', media: MEDIA });

    expect(outcome.kind).toBe('reveal');
    if (outcome.kind !== 'reveal') throw new Error('unreachable');
    expect(outcome.text).toContain('five chibi anime characters');
    expect(outcome.text).toContain(REVEAL_ACK);
    expect(attachMock).toHaveBeenCalledWith('s1', CHIBI_ANALYSIS, 'sms');
  });
});

describe('a photo after the reveal is the body, not a reference', () => {
  const PHOTO = [{ url: 'https://api.twilio.com/media/ME1', contentType: 'image/jpeg' }];

  /** Walk the phone to a delivered reveal. */
  async function driveToRevealed(phone: string) {
    vi.mocked(converse).mockResolvedValueOnce({
      sessionId: 's1',
      reply: 'Ready?',
      stage: 'proposal',
      turn: 1,
    } as unknown as Awaited<ReturnType<typeof converse>>);
    await handleInbound({ phone, body: 'a snake on my forearm' });
    await handleInbound({ phone, body: 'yes' });
    const profile = await memoryProfileStore.get(phone);
    if (profile) {
      profile.lastStage = 'revealed';
      profile.revealArmedAt = null;
      await memoryProfileStore.save(profile);
    }
  }

  // The whole point of the split: intake is over, so a picture is where the
  // tattoo goes — and reading it as inspiration would spend vision budget
  // and put the texter's own arm in the artist's Brief as a reference.
  it('routes it to placement and never to the vision analyzer', async () => {
    const phone = '+15550001111';
    await driveToRevealed(phone);

    const outcome = await handleInbound({ phone, body: 'here', media: PHOTO });

    expect(outcome.kind).toBe('placement');
    if (outcome.kind === 'placement') {
      expect(outcome.mediaUrl).toBe(PHOTO[0].url);
      expect(outcome.message).toBe('here');
    }
    expect(analyzeInboundMedia).not.toHaveBeenCalled();
  });

  it('still reads a photo BEFORE the reveal as inspiration', async () => {
    const phone = '+15550002222';
    vi.mocked(analyzeInboundMedia).mockResolvedValueOnce({
      analyses: [],
      ignored: 0,
      unreadable: 1,
      budgetExhausted: false,
    } as unknown as MediaIngest);

    const outcome = await handleInbound({ phone, body: '', media: PHOTO });

    expect(outcome.kind).toBe('reply');
    expect(analyzeInboundMedia).toHaveBeenCalledTimes(1);
  });
});
