import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ARTIST_MANAGED_IMPORT_FIELDS,
  preserveArtistManagedField,
  preserveVerifiedIdentityField,
} from './artist-managed-import.mjs';

describe('artist-managed import precedence', () => {
  it.each(ARTIST_MANAGED_IMPORT_FIELDS)('preserves artist-managed %s', (field) => {
    const expression = preserveArtistManagedField(field, `$${field}`);
    expect(expression).toContain(`'${field}' IN coalesce(a.artistManagedFields, [])`);
    expect(expression).toContain(`THEN a.${field} ELSE $${field}`);
  });

  it('keeps Instagram immutable after identity verification', () => {
    const expression = preserveVerifiedIdentityField('instagram', '$instagram');
    expect(expression).toContain("a.claimVerificationStatus, '') = 'verified'");
    expect(expression).toContain('THEN a.instagram ELSE $instagram');
  });

  it('rejects unknown managed fields and unsafe aliases', () => {
    expect(() => preserveArtistManagedField('instagram', '$instagram')).toThrow(
      /not artist-managed/i,
    );
    expect(() => preserveArtistManagedField('name', '$name', 'a) DELETE n //')).toThrow(
      /unsafe/i,
    );
  });

  it.each([
    'scripts/import-to-neo4j.js',
    'scripts/insert-artists-to-neo4j.js',
  ])('guards every profile field in %s', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    for (const field of ['name', 'shopName', 'city', 'state', 'bio']) {
      expect(source).toContain(`preserveArtistManagedField('${field}'`);
    }
    expect(source).toContain("preserveVerifiedIdentityField('instagram'");
  });

  it('does not let the legacy Cypher generator overwrite artist-managed names', () => {
    const file = 'scripts/generate-neo4j-cypher.js';
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(source).toContain("preserveArtistManagedField('name'");
  });
});
