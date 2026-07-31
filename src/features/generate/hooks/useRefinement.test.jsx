// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const inpaintTattooDesign = vi.fn();

vi.mock('../../inpainting/services/inpaintingService', () => ({
  inpaintTattooDesign: (...args) => inpaintTattooDesign(...args),
  INPAINT_BUDGET_EXHAUSTED: 'budget_exhausted',
}));

// jsdom has no 2d context; the mask itself is covered by regionMask's tests.
vi.mock('../services/regionMask', () => ({
  buildRegionMask: vi.fn(() => ({ width: 1024, height: 1024, __mask: true })),
}));

import { useRefinement } from './useRefinement';
import {
  ALLOWANCE_SPENT_LINE,
  AT_CAPACITY_LINE,
  BEFORE_AFTER_LINE,
  REFINEMENT_FAILED_LINE,
  REVERTED_LINE,
} from '../services/refineryVoice';

const REGION = [
  { x: 0.2, y: 0.2 },
  { x: 0.6, y: 0.2 },
  { x: 0.6, y: 0.6 },
];

beforeEach(() => {
  localStorage.clear();
  inpaintTattooDesign.mockReset();
  inpaintTattooDesign.mockResolvedValue('https://cdn.test/fixed.png');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function setup(overrides = {}) {
  const onApply = vi.fn();
  const view = renderHook(() =>
    useRefinement({
      designId: 'design-1',
      imageUrl: 'https://cdn.test/original.png',
      onApply,
      ...overrides,
    })
  );
  return { ...view, onApply };
}

describe('region + instruction → the existing inpainting pipeline', () => {
  it('sends the typed words as the prompt with the region mask, and nothing else', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.refine({
        points: REGION,
        instruction: '  the hand is mangled  ',
      });
    });

    expect(inpaintTattooDesign).toHaveBeenCalledTimes(1);
    const call = inpaintTattooDesign.mock.calls[0][0];
    expect(call.imageUrl).toBe('https://cdn.test/original.png');
    expect(call.prompt).toBe('the hand is mangled');
    expect(call.maskCanvas).toMatchObject({ __mask: true });
  });

  it('holds the result for keep-or-revert instead of applying it silently', async () => {
    const { result, onApply } = setup();

    await act(async () => {
      await result.current.refine({ points: REGION, instruction: 'fix the hand' });
    });

    expect(onApply).not.toHaveBeenCalled();
    expect(result.current.status).toBe('review');
    expect(result.current.pending).toEqual({
      before: 'https://cdn.test/original.png',
      after: 'https://cdn.test/fixed.png',
    });
    expect(result.current.line).toBe(BEFORE_AFTER_LINE);
  });

  it('applies the fix on keep', async () => {
    const { result, onApply } = setup();

    await act(async () => {
      await result.current.refine({ points: REGION, instruction: 'fix the hand' });
    });
    act(() => result.current.keep());

    expect(onApply).toHaveBeenCalledWith('https://cdn.test/fixed.png');
    expect(result.current.pending).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('drops the fix on revert, leaving the design untouched', async () => {
    const { result, onApply } = setup();

    await act(async () => {
      await result.current.refine({ points: REGION, instruction: 'fix the hand' });
    });
    act(() => result.current.revert());

    expect(onApply).not.toHaveBeenCalled();
    expect(result.current.pending).toBeNull();
    expect(result.current.line).toBe(REVERTED_LINE);
  });

  it('refuses an empty instruction without spending anything', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.refine({ points: REGION, instruction: '   ' });
    });

    expect(inpaintTattooDesign).not.toHaveBeenCalled();
  });
});

describe('the fix allowance — bounded, then a booking prompt (ADR-0038)', () => {
  it('counts down one per successful refinement', async () => {
    vi.stubEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE', '2');
    const { result } = setup();

    expect(result.current.allowance.remaining).toBe(2);

    await act(async () => {
      await result.current.refine({ points: REGION, instruction: 'fix the hand' });
    });

    expect(result.current.allowance.used).toBe(1);
    expect(result.current.allowance.remaining).toBe(1);
  });

  it('does not charge the allowance for a render that never came back', async () => {
    vi.stubEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE', '2');
    inpaintTattooDesign.mockRejectedValueOnce(new Error('Inpainting failed: timeout'));
    const { result } = setup();

    await act(async () => {
      await result.current.refine({ points: REGION, instruction: 'fix the hand' });
    });

    expect(result.current.allowance.remaining).toBe(2);
    expect(result.current.line).toBe(REFINEMENT_FAILED_LINE);
    expect(result.current.status).toBe('idle');
  });

  it('stops spending at the ceiling and says so in voice, not as a paywall', async () => {
    vi.stubEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE', '1');
    const { result } = setup();

    await act(async () => {
      await result.current.refine({ points: REGION, instruction: 'fix the hand' });
    });
    act(() => result.current.keep());

    expect(result.current.allowance.exhausted).toBe(true);

    await act(async () => {
      await result.current.refine({ points: REGION, instruction: 'now the other hand' });
    });

    // The second attempt never reaches a paid endpoint.
    expect(inpaintTattooDesign).toHaveBeenCalledTimes(1);
    expect(result.current.line).toBe(ALLOWANCE_SPENT_LINE);
    expect(result.current.line).toContain('artist');
    expect(result.current.line).not.toMatch(/upgrade|pay|credits?|limit reached/i);
  });

  it('opens already exhausted when the design has spent its fixes before', async () => {
    vi.stubEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE', '1');
    localStorage.setItem('tatt:studio-fixes', JSON.stringify({ 'design-1': 1 }));
    const { result } = setup();

    expect(result.current.allowance.exhausted).toBe(true);

    await act(async () => {
      await result.current.refine({ points: REGION, instruction: 'one more' });
    });

    expect(inpaintTattooDesign).not.toHaveBeenCalled();
  });
});

describe('the global budget — honest capacity, never silence', () => {
  it('says "at capacity" when the shared cap answers 402, and stops trying', async () => {
    const budgetError = new Error('Inpainting failed: Budget limit reached');
    budgetError.code = 'budget_exhausted';
    inpaintTattooDesign.mockRejectedValueOnce(budgetError);
    const { result } = setup();

    await act(async () => {
      await result.current.refine({ points: REGION, instruction: 'fix the hand' });
    });

    expect(result.current.atCapacity).toBe(true);
    expect(result.current.line).toBe(AT_CAPACITY_LINE);
    // The allowance is untouched — the refusal was the cap, not the user.
    expect(result.current.allowance.used).toBe(0);

    await act(async () => {
      await result.current.refine({ points: REGION, instruction: 'try again' });
    });

    expect(inpaintTattooDesign).toHaveBeenCalledTimes(1);
    expect(result.current.line).toBe(AT_CAPACITY_LINE);
  });
});
