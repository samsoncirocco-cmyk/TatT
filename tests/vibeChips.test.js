/**
 * Vibe Chip Suggestions Tests
 *
 * Tests keyword-to-chip mapping logic from useVibeChipSuggestions.
 * Since the hook uses React state + useEffect, we test the underlying
 * generateSuggestions logic by importing and driving the hook via
 * a lightweight renderHook helper.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useVibeChipSuggestions from '../src/hooks/useVibeChipSuggestions';

describe('useVibeChipSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return empty suggestions for empty input', () => {
    const { result } = renderHook(() => useVibeChipSuggestions(''));
    expect(result.current.suggestions).toEqual({ style: [], element: [], mood: [] });
  });

  it('should return empty suggestions for short input (< 3 chars)', () => {
    const { result } = renderHook(() => useVibeChipSuggestions('ab'));
    expect(result.current.suggestions).toEqual({ style: [], element: [], mood: [] });
  });

  it('should return style suggestions for "dragon"', async () => {
    const { result } = renderHook(() => useVibeChipSuggestions('dragon', 0));

    // Advance past debounce
    act(() => { vi.advanceTimersByTime(10); });

    expect(result.current.suggestions.style).toContain('Irezumi');
    expect(result.current.suggestions.style).toContain('Traditional');
  });

  it('should return mood suggestions for "fierce"', () => {
    const { result } = renderHook(() => useVibeChipSuggestions('fierce', 0));
    act(() => { vi.advanceTimersByTime(10); });

    expect(result.current.suggestions.mood).toContain('Aggressive');
    expect(result.current.suggestions.mood).toContain('Bold');
  });

  it('should return element suggestions for "lightning"', () => {
    const { result } = renderHook(() => useVibeChipSuggestions('lightning', 0));
    act(() => { vi.advanceTimersByTime(10); });

    expect(result.current.suggestions.element).toContain('Lightning effects');
  });

  it('should return multiple categories for "rose"', () => {
    const { result } = renderHook(() => useVibeChipSuggestions('rose', 0));
    act(() => { vi.advanceTimersByTime(10); });

    expect(result.current.suggestions.style.length).toBeGreaterThan(0);
    expect(result.current.suggestions.element).toContain('Floral accents');
  });

  it('should handle multi-word input', () => {
    const { result } = renderHook(() =>
      useVibeChipSuggestions('fierce dragon with lightning', 0)
    );
    act(() => { vi.advanceTimersByTime(10); });

    const { style, element, mood } = result.current.suggestions;
    expect(style).toContain('Irezumi');
    expect(element).toContain('Lightning effects');
    expect(mood).toContain('Aggressive');
  });

  it('should limit each category to at most 3 items', () => {
    // Use a prompt that triggers many keywords
    const { result } = renderHook(() =>
      useVibeChipSuggestions('dragon wolf lion butterfly geometric mandala', 0)
    );
    act(() => { vi.advanceTimersByTime(10); });

    expect(result.current.suggestions.style.length).toBeLessThanOrEqual(3);
    expect(result.current.suggestions.element.length).toBeLessThanOrEqual(3);
    expect(result.current.suggestions.mood.length).toBeLessThanOrEqual(3);
  });

  it('should recognize "geometric" as producing Minimalist mood', () => {
    const { result } = renderHook(() => useVibeChipSuggestions('geometric', 0));
    act(() => { vi.advanceTimersByTime(10); });

    expect(result.current.suggestions.mood).toContain('Minimalist');
    expect(result.current.suggestions.style).toContain('Geometric patterns');
  });

  it('should recognize "watercolor" style keyword', () => {
    const { result } = renderHook(() => useVibeChipSuggestions('watercolor', 0));
    act(() => { vi.advanceTimersByTime(10); });

    expect(result.current.suggestions.style).toContain('Watercolor');
  });
});
