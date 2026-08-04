/*
 * Seam tests for the unrequested-lettering guard (#297).
 *
 * fetch is stubbed once and dispatched by URL, because the guard and the
 * render share the transport: a test that could not tell a vision call from a
 * render call could not prove the re-roll spent a second render, which is the
 * whole cost question.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/google-auth-edge', () => ({
  getGcpAccessToken: vi.fn().mockResolvedValue('test-token'),
}));

vi.mock('@/lib/observability', () => ({ logEvent: vi.fn() }));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { checkBudgetMock, recordSpendMock } = vi.hoisted(() => ({
  checkBudgetMock: vi.fn(),
  recordSpendMock: vi.fn(),
}));

vi.mock('@/lib/budget-tracker', () => ({
  checkBudget: checkBudgetMock,
  recordSpend: recordSpendMock,
  VISION_ANALYSIS_COST_CENTS: 1,
}));

import { generate } from '../index';
import { requestsLettering } from '../internal/textGuard';

describe('requestsLettering — the half that is deliberately not a model call', () => {
  it.each([
    "script lettering reading Margaret, my grandmother's name",
    'a banner bearing the date 1994',
    'the word RESILIENCE in bold cursive',
    'a scroll with a quote from her favourite poem',
  ])('recognises a request for writing: %s', (prompt) => {
    expect(requestsLettering(prompt)).toBe(true);
  });

  it.each([
    'Goku, Vegeta and Piccolo from Dragon Ball Z standing together',
    'a wolf head in profile, fine detail, high contrast',
    'Batman and the Joker facing each other',
  ])('does not treat a named subject as a request for writing: %s', (prompt) => {
    // The failure this whole split exists to prevent: a character named in the
    // request is a figure to draw, not a name to letter across the artwork.
    expect(requestsLettering(prompt)).toBe(false);
  });
});

/** A Vertex image render: 200 with one inline image part. */
function renderResponse() {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        { content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'IMG' } }] } },
      ],
    }),
  };
}

/**
 * The guard's vision call is pure OCR — it reports what lettering is in the
 * image and nothing else. Whether that lettering was requested is decided
 * afterwards from the prompt, so these stubs carry words only.
 */
function ocrResponse(words: string[] = []) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ words }) }] } }],
    }),
  };
}

describe('generation seam — unrequested-lettering guard', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let renderCalls: number;
  let guardCalls: number;

  /**
   * Queue verdicts in order; every image call returns a render. The guard
   * model id is what distinguishes the two, so the routing of the stub mirrors
   * the routing of the real calls.
   */
  function wire(reads: Array<string[] | 'fail'>) {
    let v = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('flash-lite')) {
        guardCalls += 1;
        const next = reads[Math.min(v++, reads.length - 1)];
        if (next === 'fail') return { ok: false, status: 503, text: async () => 'down' };
        return ocrResponse(next);
      }
      renderCalls += 1;
      return renderResponse();
    });
  }

  beforeEach(() => {
    renderCalls = 0;
    guardCalls = 0;
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('REPLICATE_API_TOKEN', '');
    vi.stubEnv('GCP_PROJECT_ID', 'tatt-test');
    vi.stubEnv('TEXT_GUARD_MODEL', 'gemini-3.1-flash-lite');
    checkBudgetMock.mockResolvedValue({ allowed: true });
    recordSpendMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('does not screen at all unless the caller asks for it', async () => {
    wire([[]]);

    const result = await generate({ prompt: 'a fox', style: 'realism', modelId: 'imagen3' });

    expect(guardCalls).toBe(0);
    expect(renderCalls).toBe(1);
    // Absent, not false: "not checked" and "checked and clean" are different.
    expect(result.metadata.textIntrusion).toBeUndefined();
  });

  it('passes a clean render through without spending a second render', async () => {
    wire([[]]);

    const result = await generate({
      prompt: 'a fox',
      style: 'realism',
      modelId: 'imagen3',
      screenText: {},
    });

    expect(renderCalls).toBe(1);
    expect(guardCalls).toBe(1);
    expect(result.metadata.textIntrusion).toBe(false);
    expect(result.metadata.textGuardRerolls).toBeUndefined();
  });

  it('re-rolls once when lettering appears, and returns the clean second render', async () => {
    wire([['GOKU'], []]);

    const result = await generate({
      prompt: 'Goku and Vegeta',
      style: 'anime',
      modelId: 'imagen3',
      screenText: {},
    });

    expect(renderCalls).toBe(2);
    expect(result.metadata.textIntrusion).toBe(false);
    expect(result.metadata.textGuardRerolls).toBe(1);
  });

  it('returns the render flagged rather than throwing when the re-roll budget runs out', async () => {
    // Still lettered after the bounded retry. Showing a flagged design beats
    // showing nothing — the caller decides.
    wire([['GOKU'], ['VEGETA']]);

    const result = await generate({
      prompt: 'Goku and Vegeta',
      style: 'anime',
      modelId: 'imagen3',
      screenText: {},
    });

    expect(renderCalls).toBe(2);
    expect(result.images).toHaveLength(1);
    expect(result.metadata.textIntrusion).toBe(true);
    expect(result.metadata.textIntrusionWords).toEqual(['VEGETA']);
    expect(result.metadata.textGuardRerolls).toBe(1);
  });

  it('honours a larger re-roll budget', async () => {
    wire([['A'], ['B'], []]);

    const result = await generate({
      prompt: 'a fox',
      style: 'realism',
      modelId: 'imagen3',
      screenText: { maxRerolls: 2 },
    });

    expect(renderCalls).toBe(3);
    expect(result.metadata.textIntrusion).toBe(false);
    expect(result.metadata.textGuardRerolls).toBe(2);
  });

  it('does not re-roll lettering the customer asked for', async () => {
    // OCR still reads "Margaret" — the request asked for script lettering, so
    // requestsLettering() clears it. A gate that rejected memorial names would
    // break the product to protect it.
    wire([['Margaret']]);

    const result = await generate({
      prompt: "script lettering reading Margaret, my grandmother's name",
      style: 'fine-line',
      modelId: 'imagen3',
      screenText: {},
    });

    expect(renderCalls).toBe(1);
    expect(result.metadata.textIntrusion).toBe(false);
  });

  it('reports a failed check as skipped, never as clean', async () => {
    wire(['fail']);

    const result = await generate({
      prompt: 'a fox',
      style: 'realism',
      modelId: 'imagen3',
      screenText: {},
    });

    expect(renderCalls).toBe(1);
    expect(result.metadata.textGuardSkipped).toBe('provider');
    // The critical assertion: an outage must not look like a pass.
    expect(result.metadata.textIntrusion).toBeUndefined();
  });

  it('skips screening when the budget is exhausted, and still returns the render', async () => {
    checkBudgetMock.mockResolvedValue({ allowed: false });
    wire([[]]);

    const result = await generate({
      prompt: 'a fox',
      style: 'realism',
      modelId: 'imagen3',
      screenText: {},
    });

    expect(guardCalls).toBe(0);
    expect(result.images).toHaveLength(1);
    expect(result.metadata.textGuardSkipped).toBe('budget');
  });

  it('re-rolls when one image is lettered even if a sibling screen fails', async () => {
    // Mixed batch: OCR finds lettering on one image, the other vision call
    // fails. Known intrusion must win over the skip — otherwise lettered
    // images ship with only textGuardSkipped set.
    wire([['GOKU'], 'fail', [], []]);

    const result = await generate({
      prompt: 'Goku and Vegeta',
      style: 'anime',
      modelId: 'imagen3',
      numImages: 2,
      screenText: {},
    });

    expect(renderCalls).toBe(4);
    expect(result.metadata.textIntrusion).toBe(false);
    expect(result.metadata.textGuardRerolls).toBe(1);
    expect(result.metadata.textGuardSkipped).toBeUndefined();
  });

  it('does not mark an empty image batch as screened clean', async () => {
    // Replicate can succeed with output: []. That is not a clean pass.
    vi.stubEnv('REPLICATE_API_TOKEN', 'r8_test');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pred_1', status: 'succeeded', output: [] }),
    });

    const result = await generate({
      prompt: 'a fox',
      style: 'realism',
      modelId: 'flux-dev',
      screenText: {},
    });

    expect(result.images).toEqual([]);
    expect(guardCalls).toBe(0);
    expect(result.metadata.textIntrusion).toBeUndefined();
  });
});
