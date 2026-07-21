import { describe, it, expect } from 'vitest';
import { platformFeeCents, PLATFORM_FEE_BPS } from './stripe';

describe('platformFeeCents', () => {
  it('defaults to a 10% take rate (1000 bps)', () => {
    expect(PLATFORM_FEE_BPS).toBe(1000);
  });

  it('takes 10% of the gross amount', () => {
    expect(platformFeeCents(15000)).toBe(1500); // $150 deposit → $15 fee
    expect(platformFeeCents(7500)).toBe(750); // $75 deposit → $7.50 fee
  });

  it('rounds to the nearest cent', () => {
    // 999 * 1000 / 10000 = 99.9 → 100
    expect(platformFeeCents(999)).toBe(100);
  });

  it('never exceeds the gross amount', () => {
    const gross = 30000;
    expect(platformFeeCents(gross)).toBeLessThan(gross);
  });

  it('returns 0 for a 0 amount', () => {
    expect(platformFeeCents(0)).toBe(0);
  });
});
