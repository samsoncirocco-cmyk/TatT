/**
 * Prompt quality heuristics (issue #69).
 *
 * Pure, network-free helpers used to decide whether a user's rough tattoo
 * idea is too short/vague to generate a good result without AI Council
 * enhancement (Vertex AI Gemini, ~$0.02/request — see CLAUDE.md cost table).
 * Keep this dependency-free so it can run client-side and in tests without
 * hitting any service.
 */

/** Prompts shorter than this many words are considered low-detail. */
export const VAGUE_WORD_COUNT_THRESHOLD = 4;

/** Prompts shorter than this many characters are considered low-detail. */
export const VAGUE_CHAR_COUNT_THRESHOLD = 15;

/**
 * Returns true when a prompt is short/low-detail enough that Council
 * enhancement should auto-enable to help fill in the gaps.
 *
 * @param {string} prompt - The user's raw prompt text (before enhancement).
 * @returns {boolean}
 */
export function isPromptVague(prompt) {
    const trimmed = (prompt || '').trim();
    if (!trimmed) return true;

    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    return wordCount < VAGUE_WORD_COUNT_THRESHOLD || trimmed.length < VAGUE_CHAR_COUNT_THRESHOLD;
}
