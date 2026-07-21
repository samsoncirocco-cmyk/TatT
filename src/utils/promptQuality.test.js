import { describe, it, expect } from 'vitest';
import {
    isPromptVague,
    VAGUE_WORD_COUNT_THRESHOLD,
    VAGUE_CHAR_COUNT_THRESHOLD
} from './promptQuality';

describe('isPromptVague', () => {
    it('treats an empty or whitespace-only prompt as vague', () => {
        expect(isPromptVague('')).toBe(true);
        expect(isPromptVague('   ')).toBe(true);
        expect(isPromptVague(undefined)).toBe(true);
        expect(isPromptVague(null)).toBe(true);
    });

    it('treats a short, low-detail prompt as vague', () => {
        expect(isPromptVague('dragon')).toBe(true);
        expect(isPromptVague('a small rose')).toBe(true);
    });

    it('treats a detailed, multi-word prompt as not vague', () => {
        expect(isPromptVague(
            'A coiling Japanese dragon with lightning, storm clouds, and bold linework'
        )).toBe(false);
    });

    it('respects the word-count threshold at the boundary', () => {
        const justUnder = Array(VAGUE_WORD_COUNT_THRESHOLD - 1).fill('word').join(' ');
        const atThreshold = Array(VAGUE_WORD_COUNT_THRESHOLD).fill('lengthyword').join(' ');
        expect(isPromptVague(justUnder)).toBe(true);
        expect(atThreshold.length).toBeGreaterThanOrEqual(VAGUE_CHAR_COUNT_THRESHOLD);
        expect(isPromptVague(atThreshold)).toBe(false);
    });

    it('respects the character-count threshold even with enough words', () => {
        // Meets the word-count threshold but is still very short overall.
        const short = 'a b c d';
        expect(short.length).toBeLessThan(VAGUE_CHAR_COUNT_THRESHOLD);
        expect(isPromptVague(short)).toBe(true);
    });
});
