// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import type { DesignSession } from '@/services/designSession/types';
import type { ConverseResponse } from '@/services/designConversation/types';
import { DesignConversation } from '../components/DesignConversation';

// The fetch client attaches Firebase bearer auth (matching the API routes'
// verifyApiAuth gate); stub it so tests need no signed-in user.
vi.mock('@/lib/client-api-auth', () => ({
  getApiAuthHeaders: vi.fn(async () => ({ Authorization: 'Bearer test-token' })),
}));

// Strip framer-motion down to plain elements so the reveal renders
// synchronously in jsdom.
vi.mock('framer-motion', () => {
  const MOTION_PROPS = ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'layout'];
  const strip = (props: Record<string, unknown>) => {
    const rest = { ...props };
    for (const key of MOTION_PROPS) delete rest[key];
    return rest;
  };
  return {
    motion: new Proxy(
      {},
      {
        get: (_target, tag) =>
          function MotionStub({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) {
            return createElement(String(tag), strip(props), children);
          },
      }
    ),
    AnimatePresence: ({ children }: { children?: ReactNode }) => children,
  };
});

const OPENER = 'Where does it go — and what should it feel like when you catch it in the mirror?';

function converseResponse(overrides: Partial<ConverseResponse> = {}): ConverseResponse {
  return {
    sessionId: 'sess-1',
    reply: OPENER,
    stage: 'chatting',
    turn: 0,
    ...overrides,
  };
}

const variations = [1, 2, 3, 4].map((n) => ({
  id: `v${n}`,
  axisPosition: { 'bold-fine': n % 2 ? 'bold' : 'fine' },
  prompt: `prompt ${n}`,
  imageUrl: `https://img.test/design-${n}.png`,
}));

const revealedSession: DesignSession = {
  id: 'sess-1',
  phase: 'revealed',
  intake: {
    placement: 'inner forearm',
    styleTags: ['blackwork'],
    meaning: 'strength after a rough year',
    references: [],
    ambiguousAxes: ['bold-fine', 'minimal-ornate'],
  },
  axisSelection: {
    mode: 'questionnaire',
    axes: ['bold-fine', 'minimal-ornate'],
    rationale: 'Your idea left line weight and density open, so the four split along those.',
  },
  provider: 'replicate',
  variations,
  createdAt: '2026-07-24T00:00:00Z',
  updatedAt: '2026-07-24T00:00:00Z',
};

const pickedSession: DesignSession = {
  ...revealedSession,
  phase: 'picked',
  pickId: 'v2',
  mostNotYouId: 'v3',
  refinementQuestion: 'Bolder lines or keep them fine?',
};

const completeSession: DesignSession = {
  ...pickedSession,
  phase: 'complete',
  refinementAnswer: 'Bolder lines',
  refinedVariation: {
    id: 'v-refined',
    axisPosition: { 'bold-fine': 'bold' },
    prompt: 'refined prompt',
    imageUrl: 'https://img.test/refined.png',
  },
};

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

function sendReply(text: string) {
  fireEvent.change(screen.getByLabelText('Your reply'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /send/i }));
}

/** Walk opener → one detail turn → proposal, leaving the proposal on screen. */
async function reachProposal() {
  fetchMock
    .mockResolvedValueOnce(jsonResponse(converseResponse()))
    .mockResolvedValueOnce(
      jsonResponse(
        converseResponse({
          reply: 'A memorial for your dad — what did he love?',
          stage: 'chatting',
          turn: 1,
        })
      )
    )
    .mockResolvedValueOnce(
      jsonResponse(
        converseResponse({
          // The proposal reply embeds the playback (ADR-0020) — the UI must
          // render this bubble only, never a second raw-playback bubble.
          reply:
            "Here's what I'm hearing: Fine-line blackwork on the inner forearm — strength after a rough year. Want to see four takes, or did I miss something?",
          stage: 'proposal',
          playback: 'Fine-line blackwork on the inner forearm — strength after a rough year.',
          turn: 2,
        })
      )
    );

  render(<DesignConversation />);
  await screen.findByText(OPENER);

  sendReply('inner forearm, for my dad');
  await screen.findByText('A memorial for your dad — what did he love?');

  sendReply('old fishing trips, quiet strength');
  await screen.findByRole('button', { name: /show me/i });
}

describe('DesignConversation', () => {
  it('opens the conversation on mount with the bot speaking first', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(converseResponse()));

    render(<DesignConversation />);

    expect(await screen.findByText(OPENER)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/design-session/converse',
      expect.objectContaining({ method: 'POST' })
    );
    // Opening call carries no sessionId and no message.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({});
    // Free-text reply line present, no scripted intake question.
    expect(screen.getByLabelText('Your reply')).toBeTruthy();
    expect(screen.queryByText('Where does it go?')).toBeNull();
  });

  it('holds a multi-turn exchange, disabling input and typing while a turn is in flight', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(converseResponse()));
    render(<DesignConversation />);
    await screen.findByText(OPENER);

    let resolveTurn!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveTurn = resolve;
      })
    );

    sendReply('inner forearm, for my dad');

    // User bubble renders immediately; bot is "typing"; input disabled.
    expect(screen.getByText('inner forearm, for my dad')).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Working' })).toBeTruthy();
    expect((screen.getByLabelText('Your reply') as HTMLInputElement).disabled).toBe(true);

    resolveTurn!(
      jsonResponse(
        converseResponse({ reply: 'A memorial for your dad — what did he love?', turn: 1 })
      )
    );
    await screen.findByText('A memorial for your dad — what did he love?');

    // Turn carried the sessionId + message; indicator gone; input live again.
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      sessionId: 'sess-1',
      message: 'inner forearm, for my dad',
    });
    expect(screen.queryByRole('status', { name: 'Working' })).toBeNull();
    expect((screen.getByLabelText('Your reply') as HTMLInputElement).disabled).toBe(false);
  });

  it('renders the proposal reply once (no duplicate playback bubble) and transitions confirm → existing reveal UI', async () => {
    await reachProposal();

    // The reply bubble embeds the playback and is the ONLY place it renders —
    // no second bot bubble repeating the raw playback.
    expect(screen.getAllByText(/Fine-line blackwork on the inner forearm/)).toHaveLength(1);

    fetchMock.mockResolvedValueOnce(jsonResponse(revealedSession));
    fireEvent.click(screen.getByRole('button', { name: /show me/i }));

    // Confirm hits the frozen contract path.
    await screen.findByText(revealedSession.axisSelection.rationale);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/design-session/sess-1/confirm',
      expect.objectContaining({ method: 'POST' })
    );

    // The EXISTING reveal UI: four designs, pick affordances.
    expect(screen.getAllByAltText(/^Design \d$/)).toHaveLength(4);
    expect(screen.getAllByRole('button', { name: /pick design/i })).toHaveLength(4);
    // Conversation transcript kept above the reveal; no proposal CTA left.
    expect(screen.getByText(OPENER)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /show me/i })).toBeNull();
  });

  it('fast-lanes a complete first prompt: a turn-1 proposal auto-confirms into the reveal (ADR-0028)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(converseResponse()))
      .mockResolvedValueOnce(
        jsonResponse(
          converseResponse({
            reply:
              "Here's what I'm hearing: Fine-line blackwork on the inner forearm — strength after a rough year. Want to see four takes, or did I miss something?",
            stage: 'proposal',
            playback: 'Fine-line blackwork on the inner forearm — strength after a rough year.',
            turn: 1,
          })
        )
      )
      .mockResolvedValueOnce(jsonResponse(revealedSession));

    render(<DesignConversation />);
    await screen.findByText(OPENER);

    sendReply('fine-line blackwork on my inner forearm — strength after a rough year');

    // Straight to the reveal — the confirm fired without a consent tap.
    await screen.findByText(revealedSession.axisSelection.rationale);
    expect(fetchMock.mock.calls[2][0]).toBe('/api/v1/design-session/sess-1/confirm');
    expect(screen.getAllByAltText(/^Design \d$/)).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /show me/i })).toBeNull();
  });

  it('sends a deep-linked prompt as the first message instead of the opener (ADR-0028)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        converseResponse({ reply: 'Where on your body is it going?', stage: 'chatting', turn: 1 })
      )
    );

    render(<DesignConversation initialPrompt="a dragon" />);

    // The prompt is the user's opening line — one round trip, no opener.
    await screen.findByText('Where on your body is it going?');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ message: 'a dragon' });
    expect(screen.getByText('a dragon')).toBeTruthy();
    expect(screen.queryByText(OPENER)).toBeNull();
  });

  it('treats typed confirmation intent as one confirm transition, never another proposal turn', async () => {
    await reachProposal();
    fetchMock.mockResolvedValueOnce(jsonResponse(revealedSession));

    sendReply('yes, show me');

    await screen.findByText(revealedSession.axisSelection.rationale);
    const confirmCalls = fetchMock.mock.calls.filter(
      ([path]) => path === '/api/v1/design-session/sess-1/confirm'
    );
    // Turns 0-2 walked to the proposal; nothing after it may re-converse.
    const repeatedConverseCalls = fetchMock.mock.calls.filter(
      ([path], index) => index >= 3 && path === '/api/v1/design-session/converse'
    );
    expect(confirmCalls).toHaveLength(1);
    expect(repeatedConverseCalls).toHaveLength(0);
    expect(screen.getAllByText(/Fine-line blackwork on the inner forearm/)).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /show me/i })).toBeNull();
  });

  it('treats a correction at the proposal as another turn and keeps chatting', async () => {
    await reachProposal();

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        converseResponse({
          reply: 'Got it — upper arm, not forearm. What else did I get wrong?',
          stage: 'chatting',
          turn: 3,
        })
      )
    );

    // A correction is just another converse message (ADR-0020), not confirm.
    sendReply('actually, upper arm');
    await screen.findByText('Got it — upper arm, not forearm. What else did I get wrong?');

    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({
      sessionId: 'sess-1',
      message: 'actually, upper arm',
    });
    // Proposal affordance gone; the conversation continues.
    expect(screen.queryByRole('button', { name: /show me/i })).toBeNull();
    expect((screen.getByLabelText('Your reply') as HTMLInputElement).disabled).toBe(false);
  });

  it('renders the warm handoff with a CTA and no limit language', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(converseResponse()))
      .mockResolvedValueOnce(
        jsonResponse(
          converseResponse({
            reply:
              'Sounds like you’re still working out the concept — that’s actually a great reason to talk to an artist directly. Want me to find a few who do free consultations in your style?',
            stage: 'handoff',
            handoffUrl: '/smart-match?src=design-handoff',
            turn: 20,
          })
        )
      );

    render(<DesignConversation />);
    await screen.findByText(OPENER);
    sendReply('hmm, still not sure');

    // Warm bot bubble + CTA out — no dead end.
    await screen.findByText(/free consultations in your style/i);
    const cta = screen.getByRole('link', { name: /find my artist/i });
    expect(cta.getAttribute('href')).toBe('/smart-match?src=design-handoff');

    // Never framed as a limit the user hit (ADR-0021).
    expect(screen.queryByText(/limit|maximum|too many|out of turns|ran out/i)).toBeNull();
  });

  it('downgrades seamlessly to the scripted intake on 503', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'Conversation unavailable' }, 503)
    );

    render(<DesignConversation />);

    // Soft one-liner, then the existing scripted two-question intake.
    await screen.findByText(/two quick questions/i);
    expect(screen.getByText('Where does it go?')).toBeTruthy();
    expect(screen.getByLabelText('Where does it go?')).toBeTruthy();
    // No error surface, no retry — the downgrade is seamless.
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();

    // The scripted flow is live: answering the first question advances it.
    fireEvent.change(screen.getByLabelText('Where does it go?'), {
      target: { value: 'inner forearm' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText('And what do you want to feel when you look at it?');
  });

  it('offers no second refinement affordance downstream of the conversation (ADR-0013 re-assert)', async () => {
    await reachProposal();

    fetchMock
      .mockResolvedValueOnce(jsonResponse(revealedSession))
      .mockResolvedValueOnce(jsonResponse(pickedSession))
      .mockResolvedValueOnce(jsonResponse(completeSession));

    fireEvent.click(screen.getByRole('button', { name: /show me/i }));
    await screen.findByText(revealedSession.axisSelection.rationale);

    fireEvent.click(screen.getByRole('button', { name: 'Pick design 2' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Design 3 feels most not me' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Bolder lines' }));
    await screen.findByAltText('Your refined design');

    // Hard stop: no regenerate/iterate controls, no free-text input (the
    // conversation's reply box included), no lingering grid taps.
    expect(screen.queryByRole('button', { name: /regenerate|try again|another|one more|refine|show me/i })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /pick design/i })).toBeNull();
  });
});
