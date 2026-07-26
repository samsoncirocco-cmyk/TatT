/**
 * Flash-art-on-white is a hard product constraint, not a rendering
 * preference (ADR-0023): the placement preview strips the near-white
 * background to real alpha before compositing onto the user's photo, so a
 * render photographed on skin has nothing to strip and pastes a stranger's
 * arm onto the user's body.
 *
 * structuredMode's own tests pin the clause on the four REVEAL prompts. This
 * pins the other end of the session — the refinement regen, whose image is
 * the one that reaches the Brief and therefore the placement step. That
 * prompt is built by adjustPromptForAnswer from the picked variation, and
 * nothing else asserted the presentation survived that step.
 */
import { describe, it, expect } from 'vitest';
import { enhanceStructured } from '../../council';
import type { IntakeRecord } from '../../intake/types';
import { adjustPromptForAnswer } from '../internal/refinement';
import type { DesignSession, Variation } from '../types';

const FLASH_ART_CLAUSE = 'Flash art tattoo design on a pure white background';

function recordWith(styleTags: string[]): IntakeRecord {
  return {
    placement: 'left forearm',
    styleTags,
    meaning: 'a hummingbird for my grandmother',
    references: [],
    ambiguousAxes: ['bold-fine', 'color-blackwork', 'literal-abstract', 'minimal-ornate'],
  };
}

/** Every palette a session can land on — color must not opt out. */
const PALETTES: [string[]][] = [
  [['fine-line']], // monochrome
  [['neo-traditional']], // color
  [[]], // unresolved
];

describe('flash-art-on-white survives the whole session (ADR-0023)', () => {
  it.each(PALETTES)('refinement keeps the presentation for styleTags %j', async (styleTags) => {
    const { variations, axisSelection } = await enhanceStructured(recordWith(styleTags));

    for (const structured of variations) {
      const prompt = structured.prompts.detailed ?? structured.prompts.simple ?? '';
      expect(prompt).toContain(FLASH_ART_CLAUSE);

      const picked: Variation = {
        id: 'v1',
        axisPosition: structured.axisPosition as Record<string, string>,
        prompt,
        negativePrompt: structured.negativePrompt,
      };
      const session: Pick<DesignSession, 'axisSelection'> = { axisSelection };

      // Both answer directions, plus one the signal regexes don't match.
      for (const answer of ['too bold', 'not bold enough', 'it is fine']) {
        expect(adjustPromptForAnswer(session, picked, answer)).toContain(FLASH_ART_CLAUSE);
      }
    }
  });
});
