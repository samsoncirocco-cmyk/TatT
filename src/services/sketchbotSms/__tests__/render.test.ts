import { describe, it, expect } from 'vitest';
import {
  stripMarkdown,
  renderSmsReply,
  SMS_MAX_CHARS,
  capReachedText,
  linkGateText,
  revealClosingText,
  cutCaption,
  BUDGET_EXHAUSTED_TEXT,
} from '../internal/render';

describe('stripMarkdown', () => {
  it('removes emphasis, code, headers and keeps the words', () => {
    expect(stripMarkdown('**bold** and *italic* and `code`')).toBe(
      'bold and italic and code'
    );
    expect(stripMarkdown('# Heading\ntext')).toBe('Heading text');
  });

  it('keeps link URLs — SMS has no anchors', () => {
    expect(stripMarkdown('[see it](https://tatttester.com/share/x)')).toBe(
      'see it https://tatttester.com/share/x'
    );
  });

  it('collapses newlines into a single paragraph', () => {
    expect(stripMarkdown('one\n\ntwo\nthree')).toBe('one two three');
  });
});

describe('renderSmsReply', () => {
  it('passes a short turn through untouched', () => {
    expect(renderSmsReply('Love that. Where on your body?')).toBe(
      'Love that. Where on your body?'
    );
  });

  it('tightens a long turn without ever cutting mid-sentence', () => {
    const opener = 'A snake and dagger on the forearm is a classic for a reason.';
    const filler = Array.from(
      { length: 12 },
      (_, i) => `Filler sentence number ${i} adding conversational weight and detail.`
    ).join(' ');
    const closer = 'So — traditional bold lines, or something finer?';
    const result = renderSmsReply(`${opener} ${filler} ${closer}`);

    expect(result.length).toBeLessThanOrEqual(SMS_MAX_CHARS);
    // The closing question always survives — it carries the turn's ask.
    expect(result.endsWith(closer)).toBe(true);
    // The opener survives too; the middle is what gets dropped.
    expect(result.startsWith(opener)).toBe(true);
    // Every kept fragment is a whole sentence.
    expect(result).toMatch(/[.!?…]$/);
  });

  it('keeps only the closing sentence when nothing else fits', () => {
    const closer = 'Which direction pulls you?';
    const text = `${'x'.repeat(600)}. ${closer}`;
    expect(renderSmsReply(text)).toBe(closer);
  });

  it('word-cuts only the pathological single giant sentence', () => {
    const giant = `word ${'reallylong '.repeat(80)}end`;
    const result = renderSmsReply(giant);
    expect(result.length).toBeLessThanOrEqual(SMS_MAX_CHARS);
    expect(result.endsWith('…')).toBe(true);
    // Cut lands on a word boundary, never inside one.
    expect(result.slice(0, -1).endsWith('reallylong')).toBe(true);
  });
});

describe('channel phrasings', () => {
  it('cap refusal is in-voice and carries the web link', () => {
    const text = capReachedText('https://tatttester.com/design');
    expect(text).toContain('https://tatttester.com/design');
    // Never surfaced as a limit (ADR-0021 discipline).
    expect(text.toLowerCase()).not.toContain('limit');
    expect(text.toLowerCase()).not.toContain('cap');
  });

  it('budget refusal is honest capacity, not silence or blame', () => {
    expect(BUDGET_EXHAUSTED_TEXT).toContain('capacity');
  });

  it('link gate carries the signup URL', () => {
    expect(linkGateText('https://tatttester.com/signup')).toContain(
      'https://tatttester.com/signup'
    );
  });

  it('reveal closing text carries the share link', () => {
    expect(revealClosingText('https://tatttester.com/share/abc')).toContain(
      '/share/abc'
    );
  });

  it('cut captions are 1-based n of total', () => {
    expect(cutCaption(0, 4)).toBe('Cut 1 of 4');
    expect(cutCaption(3, 4)).toBe('Cut 4 of 4');
  });
});
