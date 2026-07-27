import { describe, expect, it } from 'vitest';
import { validateArtistProfilePatch } from './artist-profile';

describe('artist-managed profile validation', () => {
  it('normalizes the launch-safe editable fields', () => {
    const result = validateArtistProfilePatch({
      name: '  Nadia Ink ',
      bio: ' Blackwork and botanicals. ',
      bookingUrl: 'https://nadia.example/book',
      shopName: '',
    });
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Nadia Ink',
        shopName: null,
        bio: 'Blackwork and botanicals.',
        bookingUrl: 'https://nadia.example/book',
      },
      fields: ['name', 'shopName', 'bio', 'bookingUrl'],
    });
  });

  it.each([
    [{ instagram: '@attacker' }, /cannot be edited/i],
    [{ portfolioImages: ['https://example.com/stolen.jpg'] }, /cannot be edited/i],
    [{ bookingUrl: 'http://example.com' }, /https/i],
    [{ name: '   ' }, /cannot be blank/i],
  ])('rejects unsafe profile input %#', (input, error) => {
    const result = validateArtistProfilePatch(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(error);
  });
});

