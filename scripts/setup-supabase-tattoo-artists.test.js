import { describe, expect, it } from 'vitest';
import { generateInsertSQL } from './setup-supabase-tattoo-artists.js';

const artist = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Fixture Artist',
  location_city: 'Phoenix',
  location_region: 'Arizona',
  location_country: 'United States',
  has_multiple_locations: false,
  profile_url: 'https://example.com/fixture',
  is_curated: false,
  created_at: '2026-07-28T00:00:00.000Z',
  styles: ['Old School', 'Photo Realism', 'Japanese (Irezumi)'],
  color_palettes: [],
  specializations: [],
};

describe('Supabase seed SQL vocabulary', () => {
  it('writes canonical ontology labels, including normalization of old artifacts', () => {
    const sql = generateInsertSQL([artist]);
    expect(sql).toContain("ARRAY['Traditional','Realism','Japanese']::TEXT[]");
    expect(sql).not.toContain('Old School');
    expect(sql).not.toContain('Photo Realism');
    expect(sql).not.toContain('Japanese (Irezumi)');
  });

  it('refuses an unapproved style before producing SQL', () => {
    expect(() => generateInsertSQL([{ ...artist, styles: ['Vaporwave'] }])).toThrow(
      /outside data\/style-ontology\.json: Vaporwave/,
    );
  });
});
