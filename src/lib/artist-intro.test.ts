import { describe, expect, it } from 'vitest';
import { validateArtistIntroRequest } from './artist-intro';

describe('validateArtistIntroRequest', () => {
  const valid = { artistId: 'artist_nadia.ink', clientName: 'Maya', clientEmail: 'maya@example.com', message: 'Fine-line botanical piece' };

  it('accepts a bounded intro request', () => {
    expect(validateArtistIntroRequest(valid)).toEqual({ ok: true, value: valid });
  });

  it('accepts and trims an optional designSessionId', () => {
    expect(
      validateArtistIntroRequest({ ...valid, designSessionId: '  sess-abc123  ' }),
    ).toEqual({ ok: true, value: { ...valid, designSessionId: 'sess-abc123' } });
  });

  it('omits a blank designSessionId instead of failing', () => {
    expect(validateArtistIntroRequest({ ...valid, designSessionId: '   ' })).toEqual({
      ok: true,
      value: valid,
    });
  });

  it.each([
    [{ ...valid, artistId: '../../artist_1' }],
    [{ ...valid, clientName: '' }],
    [{ ...valid, clientEmail: 'not-email' }],
    [{ ...valid, message: 'x'.repeat(2_001) }],
  ])('rejects malformed public input', (input) => {
    expect(validateArtistIntroRequest(input).ok).toBe(false);
  });
});
