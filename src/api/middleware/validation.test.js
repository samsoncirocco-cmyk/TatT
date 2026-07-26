// validateCouncilEnhanceRequest's `style` allow-list used to be a hand-typed
// array that had already drifted from data/style-ontology.json — the single
// closed style vocabulary #166 established for the rest of the app (see
// src/lib/style-vocabulary.ts). Real ontology styles like "neo-traditional"
// and "chicano" 400'd here even though they're legitimate vocabulary.
import { describe, expect, it } from 'vitest';
import { validateCouncilEnhanceRequest } from './validation.js';

function run(body) {
  const req = { body };
  let statusCode;
  let jsonBody;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      jsonBody = body;
      return this;
    },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };
  validateCouncilEnhanceRequest(req, res, next);
  return { statusCode, jsonBody, nextCalled };
}

describe('validateCouncilEnhanceRequest — style allow-list', () => {
  it('accepts ontology styles missing from the old hand-typed list', () => {
    for (const style of ['neo-traditional', 'illustrative', 'chicano', 'black-and-grey']) {
      const { nextCalled, statusCode } = run({ user_prompt: 'a dragon wraps the forearm', style });
      expect({ style, nextCalled, statusCode }).toEqual({ style, nextCalled: true, statusCode: undefined });
    }
  });

  it('still accepts every style the old hard-coded list allowed', () => {
    const previouslyAllowed = [
      'anime', 'traditional', 'fine-line', 'tribal', 'watercolor',
      'blackwork', 'realism', 'geometric', 'japanese', 'minimalist',
    ];
    for (const style of previouslyAllowed) {
      const { nextCalled } = run({ user_prompt: 'a dragon wraps the forearm', style });
      expect(nextCalled).toBe(true);
    }
  });

  it('still rejects a style outside the ontology entirely', () => {
    const { statusCode, jsonBody, nextCalled } = run({
      user_prompt: 'a dragon wraps the forearm',
      style: 'not-a-real-style',
    });
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(400);
    expect(jsonBody.details).toContainEqual(
      expect.objectContaining({ field: 'style' })
    );
  });
});
