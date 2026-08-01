// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import type { DesignSession } from '@/services/designSession/types';
import { DesignSessionFlow } from '../components/DesignSessionFlow';
import { parseBinaryChoices } from '../components/RefinementPrompt';

// What the user HEARS at the reveal — derived, in-voice. The raw
// axisSelection.rationale is an internal audit log (ADR-0012) and must
// never render in the chat.
const REVEAL_NARRATION =
  'I split these four on line weight and how much detail they carry — your picks tell me which way to lean.';

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

const variations = [1, 2, 3, 4].map((n) => ({
  id: `v${n}`,
  axisPosition: { 'bold-fine': n % 2 ? 'bold' : 'fine' },
  prompt: `prompt ${n}`,
  imageUrl: `https://img.test/design-${n}.png`,
}));

const baseSession: DesignSession = {
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
  ...baseSession,
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
  brief: {
    placement: 'inner forearm',
    styleTags: ['blackwork'],
    meaning: 'strength after a rough year',
    references: [],
    axisSelection: baseSession.axisSelection,
    placementNotes: ['Fine detail near the wrist crease may blur within a few years.'],
    rejectedAxisPosition: { 'bold-fine': 'fine' },
  },
};

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

async function answerIntake() {
  fireEvent.change(screen.getByLabelText('Where does it go?'), {
    target: { value: 'inner forearm' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send/i }));

  fireEvent.change(await screen.findByLabelText('What do you want to feel?'), {
    target: { value: 'strength after a rough year' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send/i }));
}

describe('DesignSessionFlow', () => {
  it('walks intake → reveal → pick → most-not-you → refine → complete', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(baseSession))
      .mockResolvedValueOnce(jsonResponse(pickedSession))
      .mockResolvedValueOnce(jsonResponse(completeSession));

    render(<DesignSessionFlow />);

    // Intake reads as conversation — two bot turns, no labeled form fields.
    expect(screen.getByText('Where does it go?')).toBeTruthy();
    await answerIntake();

    // Start call hits the frozen contract path with both answers.
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/design-session',
      expect.objectContaining({ method: 'POST' })
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      placementAnswer: 'inner forearm',
      meaningAnswer: 'strength after a rough year',
    });

    // Reveal: in-voice narration + 4 designs. The raw audit rationale must
    // never reach the transcript (a live session leaked "Questionnaire
    // mode: intake left …" as a chat bubble).
    await screen.findByText(REVEAL_NARRATION);
    expect(screen.queryByText(baseSession.axisSelection.rationale)).toBeNull();
    expect(screen.queryByText(/questionnaire mode/i)).toBeNull();
    expect(screen.getAllByAltText(/^Design \d$/)).toHaveLength(4);

    // Pick one → most-not-you prompt over the remaining three.
    fireEvent.click(screen.getByRole('button', { name: /^Pick design 2 / }));
    await screen.findByText(/which one feels most/i);
    expect(screen.getByText('Your pick')).toBeTruthy();
    const notYouButtons = screen.getAllByRole('button', { name: /feels most not me/i });
    expect(notYouButtons).toHaveLength(3);

    // Most-not-you tap → pick POST with both signals.
    fireEvent.click(screen.getByRole('button', { name: /^Design 3 feels most not me / }));
    await screen.findByText(pickedSession.refinementQuestion!);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/design-session/sess-1/pick',
      expect.objectContaining({ method: 'POST' })
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      pickId: 'v2',
      mostNotYouId: 'v3',
    });

    // Binary question renders as two choices; answering triggers refine POST.
    fireEvent.click(screen.getByRole('button', { name: 'Bolder lines' }));
    await screen.findByAltText('Your refined design');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/design-session/sess-1/refine',
      expect.objectContaining({ method: 'POST' })
    );
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ answer: 'Bolder lines' });

    // Handoff card: brief summary quoted back + honest placement note (ADR-0014).
    // ("inner forearm" also appears in the intake transcript, hence getAllByText.)
    expect(screen.getAllByText('inner forearm').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/“strength after a rough year”/)).toBeTruthy();
    expect(screen.getByText(/wrist crease may blur/i)).toBeTruthy();

    // CTAs out — AR mirror, artist matching, and the refinery (which only
    // appears once the refined cut has landed in the local library, and
    // carries that design id into /studio — ADR-0038).
    expect(screen.getByRole('link', { name: /see it on your skin/i }).getAttribute('href')).toContain('/visualize?');
    expect(screen.getByRole('link', { name: /see it on your skin/i }).getAttribute('href')).toContain('ds=sess-1');
    expect(screen.getByRole('link', { name: /find your artist/i }).getAttribute('href')).toBe('/smart-match?ds=sess-1');
    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /fine-tune in the studio/i }).getAttribute('href'),
      ).toMatch(/^\/studio\?design=/),
    );
  });

  it('offers no second refinement affordance after completion (ADR-0013 hard stop)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(baseSession))
      .mockResolvedValueOnce(jsonResponse(pickedSession))
      .mockResolvedValueOnce(jsonResponse(completeSession));

    render(<DesignSessionFlow />);
    await answerIntake();
    await screen.findByText(REVEAL_NARRATION);
    fireEvent.click(screen.getByRole('button', { name: /^Pick design 2 / }));
    fireEvent.click(await screen.findByRole('button', { name: /^Design 3 feels most not me / }));
    fireEvent.click(await screen.findByRole('button', { name: 'Bolder lines' }));
    await screen.findByAltText('Your refined design');

    // No regenerate/iterate controls, no free-text input, no lingering grid taps.
    expect(screen.queryByRole('button', { name: /regenerate|try again|another|one more|refine/i })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /pick design/i })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  // ADR-0039: the chat used to die at the reveal — there was no reply box at
  // all, so "riku's missing" had nowhere to go. These pin that it survives,
  // that the re-cut it produces is pickable, and that it still closes at the
  // Brief.
  describe('critique lane (ADR-0039)', () => {
    async function reachReveal() {
      fetchMock.mockResolvedValueOnce(jsonResponse(baseSession));
      render(<DesignSessionFlow />);
      await answerIntake();
      await screen.findByText(REVEAL_NARRATION);
    }

    it('keeps the reply box open at the reveal and re-cuts on plain criticism', async () => {
      await reachReveal();

      const box = screen.getByLabelText("Tell me what's wrong with it");
      expect(screen.getByText(/if something.s off, just say it/i)).toBeTruthy();

      const recut = {
        id: 'v3-fix1',
        axisPosition: { 'bold-fine': 'bold' },
        prompt: 'prompt 3 recut',
        imageUrl: 'https://img.test/recut.png',
      };
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          success: true,
          session: { ...baseSession, critiqueCuts: [recut], fixesUsed: 1 },
          reply: 're-cut cut three with that. 5 more re-cuts before i hand you over.',
          cut: recut,
          fixesRemaining: 5,
          exhausted: false,
          generated: true,
        })
      );

      fireEvent.change(box, { target: { value: 'the third one but less color' } });
      fireEvent.submit(box.closest('form')!);

      await screen.findByText(/re-cut cut three with that/i);
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/v1/design-session/sess-1/critique',
        expect.objectContaining({ method: 'POST' })
      );
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
        message: 'the third one but less color',
      });

      // The user's words are echoed back, and the re-cut renders beside the
      // four — pickable, so the loop closes where it started.
      expect(screen.getByText('the third one but less color')).toBeTruthy();
      expect(screen.getAllByAltText(/^Design \d$/)).toHaveLength(5);
      // The re-cut counts on from the reveal's four, so no two pick targets
      // announce themselves as the same design.
      expect(screen.getByRole('button', { name: /^Pick design 5 / })).toBeTruthy();
    });

    it('speaks the ceiling instead of silently refusing, and never renders past it', async () => {
      await reachReveal();

      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          success: true,
          session: baseSession,
          reply: "you've been round this a few times now — that's your artist's job, honestly.",
          fixesRemaining: 0,
          exhausted: true,
          generated: false,
        })
      );

      const box = screen.getByLabelText("Tell me what's wrong with it");
      fireEvent.change(box, { target: { value: 'one more, less color' } });
      fireEvent.submit(box.closest('form')!);

      await screen.findByText(/that.s your artist.s job/i);
      // Refusal spoken, no new cut — the four are still all there is.
      expect(screen.getAllByAltText(/^Design \d$/)).toHaveLength(4);
    });

    it('keeps the reveal usable when a critique turn fails', async () => {
      await reachReveal();

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'The image provider is busy right now — retrying shortly usually clears it.', code: 'GENERATION_UNAVAILABLE', retryable: true }),
      } as Response);

      const box = screen.getByLabelText("Tell me what's wrong with it");
      fireEvent.change(box, { target: { value: 'too busy' } });
      fireEvent.submit(box.closest('form')!);

      await screen.findByText(/image provider is busy/i);
      // The failure is a line in the lane, not a banner over the reveal: the
      // four cuts are still tappable.
      expect(screen.getByRole('button', { name: /^Pick design 2 / })).toBeTruthy();
      expect(screen.getByLabelText("Tell me what's wrong with it")).toBeTruthy();
    });

    it('lets a customer take a re-cut forward after the first pick', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(baseSession))
        .mockResolvedValueOnce(jsonResponse(pickedSession));
      render(<DesignSessionFlow />);
      await answerIntake();
      await screen.findByText(REVEAL_NARRATION);
      fireEvent.click(screen.getByRole('button', { name: /^Pick design 2 / }));
      fireEvent.click(await screen.findByRole('button', { name: /^Design 3 feels most not me / }));
      await screen.findByText(pickedSession.refinementQuestion!);

      const recut = {
        id: 'v1-fix1',
        axisPosition: { 'bold-fine': 'bold' },
        prompt: 'prompt 1 with Riku restored',
        imageUrl: 'https://img.test/recut-after-pick.png',
      };
      fetchMock
        .mockResolvedValueOnce(jsonResponse({
          success: true,
          session: { ...pickedSession, critiqueCuts: [recut], fixesUsed: 1 },
          reply: 're-cut cut one with that.',
          cut: recut,
          fixesRemaining: 5,
          exhausted: false,
          generated: true,
        }))
        .mockResolvedValueOnce(jsonResponse({ ...pickedSession, pickId: recut.id }));

      const box = screen.getByLabelText("Tell me what's wrong with it");
      fireEvent.change(box, { target: { value: "riku's missing" } });
      fireEvent.submit(box.closest('form')!);

      const recutButton = await screen.findByRole('button', { name: /^Pick design 5 / });
      expect(recutButton.hasAttribute('disabled')).toBe(false);
      fireEvent.click(recutButton);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/v1/design-session/sess-1/pick',
        expect.objectContaining({ method: 'POST' })
      );
      expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({
        pickId: recut.id,
        mostNotYouId: 'v3',
      });
    });
  });

  it('shows a thinking line while the session starts, then the rationale', async () => {
    let resolveStart!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveStart = resolve;
      })
    );

    render(<DesignSessionFlow />);
    await answerIntake();

    expect(screen.getByRole('status', { name: 'Working' })).toBeTruthy();
    resolveStart!(jsonResponse(baseSession));
    await screen.findByText(REVEAL_NARRATION);
    expect(screen.queryByRole('status', { name: 'Working' })).toBeNull();
  });
});

describe('parseBinaryChoices', () => {
  it('splits a binary question into two choices', () => {
    expect(parseBinaryChoices('Bolder lines or keep them fine?')).toEqual([
      'Bolder lines',
      'keep them fine',
    ]);
  });

  it('returns null for open questions', () => {
    expect(parseBinaryChoices('What should change about the linework?')).toBeNull();
  });
});
