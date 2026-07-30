/**
 * Reference-image analysis (TAT-50): structured output, the REQUIRED
 * budget guardrails, fail-soft contract, and demo mode. All mock-based —
 * budget tracker and the Vertex fetch are mocked; no network, no spend.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { analyzeReferenceImage } from '../index';
import { sanitizeAnalysis } from '../internal/referenceAnalysis';
import {
  checkBudget,
  recordSpend,
  VISION_ANALYSIS_COST_CENTS,
} from '@/lib/budget-tracker';

vi.mock('@/lib/budget-tracker', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/budget-tracker')>();
  return {
    ...actual,
    checkBudget: vi.fn(async () => ({ allowed: true, spentCents: 0, remainingCents: 1000 })),
    recordSpend: vi.fn(async () => {}),
  };
});

vi.mock('@/lib/google-auth-edge', () => ({
  getGcpAccessToken: vi.fn(async () => 'test-token'),
}));

const IMAGE = { data: Buffer.from('png-bytes').toString('base64'), mimeType: 'image/png' };

const GEMINI_ANALYSIS = {
  summary: 'five chibi anime characters, bold outlines, cel shading, red smoke background',
  subjects: ['group of five characters'],
  characters: [
    { name: 'Yusuke Urameshi', series: 'Yu Yu Hakusho' },
    { name: 'Hiei', series: 'Yu Yu Hakusho' },
  ],
  styleDescriptors: ['chibi', 'cel shading', 'bold outlines'],
  palette: ['red', 'black'],
  composition: 'group shot in a loose cluster',
  confidence: 0.87,
};

function geminiResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
    }),
  } as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
  vi.stubEnv('GCP_PROJECT_ID', 'tatt-test');
  vi.mocked(checkBudget).mockResolvedValue({
    allowed: true,
    spentCents: 0,
    remainingCents: 1000,
  });
  fetchMock.mockResolvedValue(geminiResponse(GEMINI_ANALYSIS));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('analyzeReferenceImage', () => {
  it('returns the sanitized structured analysis and records the vision spend', async () => {
    const outcome = await analyzeReferenceImage(IMAGE);

    expect(outcome.status).toBe('analyzed');
    if (outcome.status !== 'analyzed') throw new Error('unreachable');
    expect(outcome.analysis.summary).toContain('five chibi anime characters');
    expect(outcome.analysis.characters).toHaveLength(2);
    expect(outcome.analysis.characters[0]).toEqual({
      name: 'Yusuke Urameshi',
      series: 'Yu Yu Hakusho',
    });
    expect(outcome.analysis.styleDescriptors).toContain('chibi');
    expect(recordSpend).toHaveBeenCalledWith(VISION_ANALYSIS_COST_CENTS);

    // The multimodal request carries the image inline plus the brief prompt.
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.contents[0].parts[0].inlineData).toEqual({
      mimeType: 'image/png',
      data: IMAGE.data,
    });
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('skips the model call entirely when the budget is exhausted', async () => {
    vi.mocked(checkBudget).mockResolvedValue({
      allowed: false,
      spentCents: 50_000,
      remainingCents: 0,
    });

    const outcome = await analyzeReferenceImage(IMAGE);

    expect(outcome).toEqual({ status: 'budget_exhausted' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(recordSpend).not.toHaveBeenCalled();
  });

  it('fails soft on a provider error — no throw, no spend recorded', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    } as Response);

    const outcome = await analyzeReferenceImage(IMAGE);

    expect(outcome).toEqual({ status: 'failed' });
    expect(recordSpend).not.toHaveBeenCalled();
  });

  it('fails soft on an unparseable model response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'not json at all' }] } }],
      }),
    } as Response);

    const outcome = await analyzeReferenceImage(IMAGE);

    expect(outcome).toEqual({ status: 'failed' });
    expect(recordSpend).not.toHaveBeenCalled();
  });

  it('refuses non-image content types without spending anything', async () => {
    const outcome = await analyzeReferenceImage({ data: 'xxx', mimeType: 'application/pdf' });

    expect(outcome).toEqual({ status: 'failed' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(checkBudget).not.toHaveBeenCalled();
  });

  it('demo mode returns the canned analysis with no model call and no spend', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');

    const outcome = await analyzeReferenceImage(IMAGE);

    expect(outcome.status).toBe('analyzed');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(checkBudget).not.toHaveBeenCalled();
    expect(recordSpend).not.toHaveBeenCalled();
  });
});

describe('sanitizeAnalysis', () => {
  it('drops a reading with no summary', () => {
    expect(sanitizeAnalysis({ subjects: ['dragon'] })).toBeNull();
    expect(sanitizeAnalysis(null)).toBeNull();
    expect(sanitizeAnalysis('text')).toBeNull();
  });

  it('bounds lists, coerces string characters, and clamps confidence', () => {
    const analysis = sanitizeAnalysis({
      summary: 'a dragon',
      subjects: Array.from({ length: 20 }, (_, i) => `subject-${i}`),
      characters: ['Goku', { name: 'Vegeta', series: 'Dragon Ball Z' }, { series: 'nameless' }],
      styleDescriptors: ['fine line', 42, '  '],
      palette: ['red'],
      composition: 'centered',
      confidence: 7,
    });

    expect(analysis).not.toBeNull();
    expect(analysis!.subjects).toHaveLength(8);
    expect(analysis!.characters).toEqual([
      { name: 'Goku' },
      { name: 'Vegeta', series: 'Dragon Ball Z' },
    ]);
    expect(analysis!.styleDescriptors).toEqual(['fine line']);
    expect(analysis!.confidence).toBe(1);
  });
});
