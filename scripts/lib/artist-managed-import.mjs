/**
 * Cypher expressions shared by every Artist importer.
 *
 * Once a verified artist edits a public field, scraped/seed data may no longer
 * replace it. Instagram is stricter: verification makes it an identity anchor,
 * so imports preserve it even though it is not an artist-editable field.
 */

export const ARTIST_MANAGED_IMPORT_FIELDS = Object.freeze([
  'name',
  'shopName',
  'bio',
  'bookingUrl',
  'city',
  'state',
]);

function assertIdentifier(value, label) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe ${label}: ${JSON.stringify(value)}`);
  }
}

export function preserveArtistManagedField(field, incomingExpression, artistAlias = 'a') {
  if (!ARTIST_MANAGED_IMPORT_FIELDS.includes(field)) {
    throw new Error(`Field is not artist-managed: ${field}`);
  }
  assertIdentifier(artistAlias, 'artist alias');
  return `CASE WHEN '${field}' IN coalesce(${artistAlias}.artistManagedFields, []) ` +
    `THEN ${artistAlias}.${field} ELSE ${incomingExpression} END`;
}

export function preserveVerifiedIdentityField(
  field,
  incomingExpression,
  artistAlias = 'a',
) {
  assertIdentifier(field, 'identity field');
  assertIdentifier(artistAlias, 'artist alias');
  return `CASE WHEN coalesce(${artistAlias}.claimVerificationStatus, '') = 'verified' ` +
    `THEN ${artistAlias}.${field} ELSE ${incomingExpression} END`;
}
