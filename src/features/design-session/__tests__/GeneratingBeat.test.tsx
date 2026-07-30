// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  GeneratingBeat,
  REVEAL_BEAT_LINES,
  REFINE_BEAT_LINES,
} from '../components/GeneratingBeat';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GeneratingBeat', () => {
  it('reads as a stable Working status while rotating in-voice lines', () => {
    render(<GeneratingBeat lines={REVEAL_BEAT_LINES} />);

    expect(screen.getByRole('status', { name: 'Working' })).toBeTruthy();
    expect(screen.getByText(REVEAL_BEAT_LINES[0])).toBeTruthy();

    act(() => vi.advanceTimersByTime(2600));
    expect(screen.getByText(REVEAL_BEAT_LINES[1])).toBeTruthy();

    // Wraps around instead of running out.
    act(() => vi.advanceTimersByTime(2600 * REVEAL_BEAT_LINES.length));
    expect(screen.getByText(REVEAL_BEAT_LINES[1])).toBeTruthy();
  });

  it('every designed line is generic-true: no fake percentages, no fake specifics', () => {
    for (const line of [...REVEAL_BEAT_LINES, ...REFINE_BEAT_LINES]) {
      expect(line).not.toMatch(/\d+\s*%/); // no fake progress
      expect(line).not.toMatch(/\b(sec|second|minute)s?\b/i); // no fake ETAs
      expect(line).toMatch(/…$/); // in-progress voice, not a claim of completion
    }
  });
});
