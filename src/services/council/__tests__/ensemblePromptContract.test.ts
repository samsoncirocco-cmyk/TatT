/**
 * Prompt-contract regression for the Kingdom Hearts session (TAT-57).
 *
 * The customer asked for "a kingdom hearts sleeve for my left arm" with
 * Roxas, Sora, Axel and Riku sparring. Intake extracted all four correctly.
 * The reveal came back as character portraits — one of the four was a single
 * cropped face — because the generation prompt asked for four characters and
 * then said `Avoid: ... multiple people`. For the Flux lane negatives are
 * folded into the prompt, so the model received both instructions at once.
 *
 * Root cause: the negative builder re-derived the cast by regex against the
 * character catalog instead of reading `requestedCharacters`. The catalog
 * covers anime only, and Kingdom Hearts is a game — so a four-character
 * request scored as single-subject.
 *
 * These tests assert the CONTRACT (what the prompt may and may not say),
 * not merely that the names appear somewhere in a string. The pre-existing
 * cast regression passed throughout the failure precisely because presence
 * of a name and absence of its contradiction are different claims.
 */
import { describe, it, expect } from 'vitest';
import { enhanceStructured } from '../internal/structuredMode';
import { getBaseNegativePrompt } from '../internal/councilService';
import type { IntakeRecord } from '../../intake/types';

const KINGDOM_HEARTS: IntakeRecord = {
  placement: 'left arm',
  styleTags: ['anime', 'color', 'illustrative', 'neo traditional'],
  meaning: 'a kingdom hearts sleeve',
  subject: 'Roxas, Sora, Axel, and Riku sparring with their unique Keyblades',
  requestedCharacters: ['Roxas', 'Sora', 'Axel', 'Riku'],
  ambiguousAxes: [],
} as IntakeRecord;

/** `cartoon` as a standalone entry, not the substring inside another token. */
const hasCartoonNegative = (negative: string) =>
  negative.split(',').some(entry => entry.trim() === 'cartoon');

describe('ensemble prompt contract — the Kingdom Hearts session', () => {
  it('never forbids "multiple people" when the customer named a cast', async () => {
    const result = await enhanceStructured(KINGDOM_HEARTS);

    expect(result.variations).toHaveLength(4);
    for (const [index, variation] of result.variations.entries()) {
      expect(
        variation.negativePrompt,
        `variation ${index + 1} told the model to avoid multiple people ` +
          'while asking for four characters'
      ).not.toContain('multiple people');
    }
  });

  it('guards the real ensemble failure — figures melting together', async () => {
    const result = await enhanceStructured(KINGDOM_HEARTS);

    for (const variation of result.variations) {
      expect(variation.negativePrompt).toContain('merged bodies');
      expect(variation.negativePrompt).toContain('fused characters');
    }
  });

  it('does not negate "cartoon" on an illustrative-style session', async () => {
    const result = await enhanceStructured(KINGDOM_HEARTS);

    for (const [index, variation] of result.variations.entries()) {
      expect(
        hasCartoonNegative(variation.negativePrompt ?? ''),
        `variation ${index + 1} negated "cartoon" on an anime/illustrative session`
      ).toBe(false);
    }
  });

  it('still keeps every requested name in the prompt', async () => {
    const result = await enhanceStructured(KINGDOM_HEARTS);

    for (const variation of result.variations) {
      const prompt = variation.prompts.detailed ?? variation.prompts.simple ?? '';
      for (const name of KINGDOM_HEARTS.requestedCharacters ?? []) {
        expect(prompt, `prompt lost ${name}`).toContain(name);
      }
    }
  });
});

/*
 * The other half of the same reveal: one of the four came back as a single
 * cropped face. `close crop` ("subject rendered large and close") and
 * `negative space` ("small off-center subject") cannot hold four sparring
 * characters — those two cuts were spent before the model ran.
 */
describe('compositional treatments — an ensemble gets four cuts that can hold it', () => {
  const compositionsOf = async (record: IntakeRecord) =>
    (await enhanceStructured(record)).variations.map(
      variation => (variation.axisPosition as { composition: string }).composition
    );

  it('never offers a close crop or negative space to a named cast', async () => {
    const compositions = await compositionsOf(KINGDOM_HEARTS);

    expect(compositions).not.toContain('close crop');
    expect(compositions).not.toContain('negative space');
  });

  it('keeps exactly four distinct cuts for the ensemble (ADR-0012)', async () => {
    const compositions = await compositionsOf(KINGDOM_HEARTS);

    expect(compositions).toHaveLength(4);
    expect(new Set(compositions).size).toBe(4);
  });

  it('still offers both to a single-subject brief', async () => {
    const compositions = await compositionsOf({
      ...KINGDOM_HEARTS,
      subject: 'Sora holding his Keyblade',
      requestedCharacters: ['Sora'],
    });

    expect(compositions).toContain('close crop');
    expect(compositions).toContain('negative space');
  });

  it('treats a brief with no roster as single-subject rather than guessing', async () => {
    const { requestedCharacters: _roster, ...noRoster } = KINGDOM_HEARTS;

    expect(await compositionsOf(noRoster as IntakeRecord)).toContain('close crop');
  });
});

describe('getBaseNegativePrompt — cast size is the intake\'s call, not the catalog\'s', () => {
  it('trusts requestedCharacterCount over catalog detection', () => {
    // The catalog cannot see this cast; without the count it scores as a
    // single subject, which is exactly the production failure.
    const subject = 'Roxas, Sora, Axel, and Riku sparring with their unique Keyblades';

    expect(getBaseNegativePrompt(subject)).toContain('multiple people');
    expect(
      getBaseNegativePrompt(subject, { requestedCharacterCount: 4 })
    ).not.toContain('multiple people');
  });

  it('keeps single-subject negatives when the cast really is one', () => {
    const negative = getBaseNegativePrompt('a koi swimming upstream', {
      requestedCharacterCount: 1,
    });

    expect(negative).toContain('multiple people');
    expect(negative).not.toContain('merged bodies');
  });

  it('drops style-contradicting negatives only for the styles that contradict', () => {
    expect(
      hasCartoonNegative(getBaseNegativePrompt('a koi', { styleTags: ['anime'] }))
    ).toBe(false);
    expect(
      hasCartoonNegative(getBaseNegativePrompt('a koi', { styleTags: ['blackwork'] }))
    ).toBe(true);
  });

  it('falls back to catalog detection when no count is supplied', () => {
    // Legacy callers (the classic enhance() path) pass no roster.
    expect(getBaseNegativePrompt('Deku and Todoroki fighting')).toContain(
      'merged bodies'
    );
  });
});
