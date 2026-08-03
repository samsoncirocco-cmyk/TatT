import { beforeEach, describe, expect, it, vi } from 'vitest';

const { recordSpend } = vi.hoisted(() => ({ recordSpend: vi.fn() }));

vi.mock('@/lib/budget-tracker', () => ({
  recordSpend,
  VERTEX_IMAGEN_COST_CENTS: 4,
}));

import { recordImageSpend, REPLICATE_COST_CENTS } from '../internal/spend';

describe('recordImageSpend', () => {
  beforeEach(() => recordSpend.mockReset());

  it('records every Replicate image bought in a four-cut reveal', async () => {
    await recordImageSpend('replicate', 4);

    expect(recordSpend).toHaveBeenCalledWith(REPLICATE_COST_CENTS * 4);
  });

  it('records every Vertex image bought', async () => {
    await recordImageSpend('vertex', 4);

    expect(recordSpend).toHaveBeenCalledWith(16);
  });
});
