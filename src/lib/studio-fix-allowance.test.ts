import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_STUDIO_FIX_ALLOWANCE,
  FIX_ALLOWANCE_STORAGE_KEY,
  fixAllowanceState,
  readFixesUsed,
  recordFixUsed,
  resetFixesUsed,
  resolveFixAllowance,
} from './studio-fix-allowance';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveFixAllowance — bounded fixes, env-tunable (ADR-0038)', () => {
  it('defaults to the number ADR-0038 currently names', () => {
    // 25 as of the 2026-08-01 amendment, up from the original 5–8 band. The
    // guard is kept — an allowance is a fence, and a fence with no upper
    // bound is not one — but it now tracks the amended ceiling. The real
    // spend stop is BUDGET_MAX_SPEND_CENTS, not this.
    expect(resolveFixAllowance()).toBe(DEFAULT_STUDIO_FIX_ALLOWANCE);
    expect(DEFAULT_STUDIO_FIX_ALLOWANCE).toBe(25);
    expect(DEFAULT_STUDIO_FIX_ALLOWANCE).toBeLessThanOrEqual(50);
  });

  it('honours the public knob that actually reaches the browser bundle', () => {
    vi.stubEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE', '3');
    expect(resolveFixAllowance()).toBe(3);
  });

  it('honours the plain server-side name too', () => {
    vi.stubEnv('STUDIO_FIX_ALLOWANCE', '8');
    expect(resolveFixAllowance()).toBe(8);
  });

  it('falls back to the default rather than unbounding on garbage', () => {
    vi.stubEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE', 'lots');
    expect(resolveFixAllowance()).toBe(DEFAULT_STUDIO_FIX_ALLOWANCE);
    vi.stubEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE', '-4');
    expect(resolveFixAllowance()).toBe(DEFAULT_STUDIO_FIX_ALLOWANCE);
  });
});

describe('the per-design ledger', () => {
  it('counts fixes per design, not globally', () => {
    recordFixUsed('design-a');
    recordFixUsed('design-a');
    recordFixUsed('design-b');

    expect(readFixesUsed('design-a')).toBe(2);
    expect(readFixesUsed('design-b')).toBe(1);
    expect(readFixesUsed('design-c')).toBe(0);
  });

  it('survives a reload — the allowance is per design, not per visit', () => {
    recordFixUsed('design-a');
    const raw = localStorage.getItem(FIX_ALLOWANCE_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string)).toEqual({ 'design-a': 1 });
  });

  it('reports remaining and exhaustion off the resolved allowance', () => {
    vi.stubEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE', '2');

    expect(fixAllowanceState('design-a')).toEqual({
      allowance: 2,
      used: 0,
      remaining: 2,
      exhausted: false,
    });

    recordFixUsed('design-a');
    expect(fixAllowanceState('design-a').remaining).toBe(1);
    expect(fixAllowanceState('design-a').exhausted).toBe(false);

    recordFixUsed('design-a');
    expect(fixAllowanceState('design-a')).toEqual({
      allowance: 2,
      used: 2,
      remaining: 0,
      exhausted: true,
    });
  });

  it('never reports negative remaining once the allowance shrinks', () => {
    recordFixUsed('design-a');
    recordFixUsed('design-a');
    vi.stubEnv('NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE', '1');
    expect(fixAllowanceState('design-a').remaining).toBe(0);
  });

  it('forgets a design on reset', () => {
    recordFixUsed('design-a');
    resetFixesUsed('design-a');
    expect(readFixesUsed('design-a')).toBe(0);
  });

  it('tolerates a corrupted ledger instead of blocking the Studio', () => {
    localStorage.setItem(FIX_ALLOWANCE_STORAGE_KEY, '{not json');
    expect(readFixesUsed('design-a')).toBe(0);
    expect(recordFixUsed('design-a')).toBe(1);
  });
});
