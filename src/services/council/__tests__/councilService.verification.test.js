/**
 * Verification Tests for the Council module's internal helpers.
 *
 * Covers: token estimation, prompt validation, and aspect ratio guidance.
 * (The generateWithRetry tests that used to live here moved to
 * src/services/__tests__/generationService.retry.test.js in ticket 04.)
 */

import { describe, it, expect } from 'vitest';
import {
  estimateTokenCount,
  validatePromptLength,
  getAspectRatioGuidance
} from '../internal/councilService';

// ─── Token Estimation ───────────────────────────────────────────────

describe('estimateTokenCount', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokenCount('')).toBe(0);
  });

  it('returns 0 for whitespace-only input', () => {
    expect(estimateTokenCount('   \t\n  ')).toBe(0);
  });

  it('estimates single word as ~1.3 tokens (ceil = 2)', () => {
    expect(estimateTokenCount('hello')).toBe(2); // ceil(1 * 1.3)
  });

  it('estimates 10 words as 13 tokens', () => {
    const tenWords = 'one two three four five six seven eight nine ten';
    expect(estimateTokenCount(tenWords)).toBe(13); // ceil(10 * 1.3)
  });

  it('estimates 100 words as 130 tokens', () => {
    const hundredWords = Array.from({ length: 100 }, () => 'word').join(' ');
    expect(estimateTokenCount(hundredWords)).toBe(130);
  });

  it('handles extra whitespace between words', () => {
    const text = 'hello   world   foo';
    expect(estimateTokenCount(text)).toBe(4); // 3 words => ceil(3 * 1.3) = 4
  });
});

// ─── Prompt Validation ──────────────────────────────────────────────

describe('validatePromptLength', () => {
  it('passes for short prompt (<300 words)', () => {
    const shortPrompt = 'A dragon tattoo on my forearm with bold lines';
    const result = validatePromptLength(shortPrompt);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('passes for 200-word prompt (well under limit)', () => {
    const prompt = Array.from({ length: 200 }, () => 'word').join(' ');
    const result = validatePromptLength(prompt);
    expect(result.valid).toBe(true);
    expect(result.tokenCount).toBe(260); // ceil(200 * 1.3)
  });

  it('fails for 500+ word prompt (exceeds default 450 token limit)', () => {
    const longPrompt = Array.from({ length: 500 }, () => 'word').join(' ');
    const result = validatePromptLength(longPrompt);
    expect(result.valid).toBe(false);
    expect(result.tokenCount).toBe(650); // ceil(500 * 1.3)
    expect(result.error).toMatch(/Prompt too long/);
    expect(result.suggestion).toBeDefined();
  });

  it('fails for 520-word prompt', () => {
    const longPrompt = Array.from({ length: 520 }, () => 'word').join(' ');
    const result = validatePromptLength(longPrompt);
    expect(result.valid).toBe(false);
    expect(result.tokenCount).toBe(676); // ceil(520 * 1.3)
  });

  it('passes for exactly-at-limit prompt', () => {
    // 450 tokens / 1.3 ~= 346 words => ceil(346 * 1.3) = 450
    const prompt = Array.from({ length: 346 }, () => 'word').join(' ');
    const result = validatePromptLength(prompt);
    expect(result.valid).toBe(true);
    expect(result.tokenCount).toBe(450);
  });

  it('fails for one-over-limit prompt', () => {
    // 347 words => ceil(347 * 1.3) = ceil(451.1) = 452 > 450
    const prompt = Array.from({ length: 347 }, () => 'word').join(' ');
    const result = validatePromptLength(prompt);
    expect(result.valid).toBe(false);
    expect(result.tokenCount).toBe(452);
  });

  it('respects custom maxTokens parameter', () => {
    const prompt = Array.from({ length: 100 }, () => 'word').join(' ');
    // 100 words => 130 tokens
    const passResult = validatePromptLength(prompt, 200);
    expect(passResult.valid).toBe(true);

    const failResult = validatePromptLength(prompt, 100);
    expect(failResult.valid).toBe(false);
  });

  it('handles empty/null prompt gracefully', () => {
    const result = validatePromptLength('');
    expect(result.valid).toBe(true);
    expect(result.tokenCount).toBe(0);
  });

  it('always includes tokenCount in response', () => {
    const shortResult = validatePromptLength('hello world');
    expect(shortResult).toHaveProperty('tokenCount');

    const longResult = validatePromptLength(
      Array.from({ length: 500 }, () => 'word').join(' ')
    );
    expect(longResult).toHaveProperty('tokenCount');
  });
});

// ─── Aspect Ratio Guidance ──────────────────────────────────────────

describe('getAspectRatioGuidance', () => {
  it('returns 1:3 ratio for forearm', () => {
    const result = getAspectRatioGuidance('forearm');
    expect(result).toContain('1:3');
  });

  it('returns 4:5 ratio for chest', () => {
    const result = getAspectRatioGuidance('chest');
    expect(result).toContain('4:5');
  });

  it('returns 1:3 ratio for shin', () => {
    const result = getAspectRatioGuidance('shin');
    expect(result).toContain('1:3');
  });

  it('returns 2:3 ratio for back', () => {
    const result = getAspectRatioGuidance('back');
    expect(result).toContain('2:3');
  });

  it('returns 1:2 ratio for thigh', () => {
    const result = getAspectRatioGuidance('thigh');
    expect(result).toContain('1:2');
  });

  it('returns radial composition for shoulder', () => {
    const result = getAspectRatioGuidance('shoulder');
    expect(result).toContain('radial');
  });

  it('returns 1:1 ratio for bicep', () => {
    const result = getAspectRatioGuidance('bicep');
    expect(result).toContain('1:1');
  });

  it('returns fallback for unknown body part', () => {
    const result = getAspectRatioGuidance('earlobes');
    expect(result).toBe('balanced composition');
  });

  it('is case-insensitive', () => {
    const upper = getAspectRatioGuidance('FOREARM');
    const lower = getAspectRatioGuidance('forearm');
    expect(upper).toBe(lower);
  });

  it('trims whitespace', () => {
    const result = getAspectRatioGuidance('  chest  ');
    expect(result).toContain('4:5');
  });

  it('returns fallback for empty string', () => {
    expect(getAspectRatioGuidance('')).toBe('balanced composition');
  });

  it('handles undefined/null gracefully', () => {
    expect(getAspectRatioGuidance(undefined)).toBe('balanced composition');
    expect(getAspectRatioGuidance(null)).toBe('balanced composition');
  });
});
