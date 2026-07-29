import { normalizeInstagramHandle } from './takedown-tombstone.mjs';
import {
  preserveArtistManagedField,
  preserveVerifiedIdentityField,
} from './artist-managed-import.mjs';

export const DEFAULT_NATIONAL_ARTIST_INPUT =
  'data/national-artists-2026-07-15.json';

function optionValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

export function parseNationalImportArgs(args) {
  if (args.includes('--wipe')) {
    throw new Error(
      '--wipe is not supported by the national importer because the live graph ' +
        'contains claimed profiles, takedown records, and payment state.',
    );
  }

  const supported = new Set(['--apply', '--limit', '--input']);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!supported.has(arg)) throw new Error(`Unknown option: ${arg}`);
    if (arg === '--limit' || arg === '--input') index += 1;
  }

  const rawLimit = optionValue(args, '--limit');
  const limit = rawLimit === null ? Infinity : Number(rawLimit);
  if (rawLimit !== null && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error('--limit must be a positive integer');
  }

  return {
    apply: args.includes('--apply'),
    input: optionValue(args, '--input') ?? DEFAULT_NATIONAL_ARTIST_INPUT,
    limit,
  };
}

export function instagramProfileUrl(raw) {
  const handle = normalizeInstagramHandle(raw);
  return handle ? `https://instagram.com/${handle}` : null;
}

export function tombstoneKeysForNationalArtist(artist) {
  const keys = new Set();
  if (artist?.id) keys.add(`artist:${String(artist.id).trim()}`);

  const handle = normalizeInstagramHandle(artist?.instagram);
  if (handle) keys.add(`instagram:${handle}`);

  for (const sourcePage of artist?.sourcePages ?? []) {
    const source = typeof sourcePage === 'string' ? sourcePage.trim() : '';
    if (source) keys.add(`source:${source}`);
  }
  return [...keys];
}

export function prepareNationalArtist(artist) {
  return {
    ...artist,
    instagramUrl: instagramProfileUrl(artist?.instagram),
    portfolioImages: Array.isArray(artist?.portfolioImages)
      ? artist.portfolioImages.filter((url) => typeof url === 'string' && url.trim())
      : [],
    styles: Array.isArray(artist?.styles) ? artist.styles : [],
    tags: Array.isArray(artist?.tags) ? artist.tags : [],
    tombstoneKeys: tombstoneKeysForNationalArtist(artist),
  };
}

export function partitionProtectedNationalArtists(
  artists,
  {
    removedIds = new Set(),
    claimedIds = new Set(),
    selfRegisteredIds = new Set(),
    pendingRequestIds = new Set(),
    tombstoneGate,
  },
) {
  const allowed = [];
  const counts = {
    removed: 0,
    claimed: 0,
    selfRegistered: 0,
    pendingRequest: 0,
    tombstoned: 0,
  };

  for (const artist of artists) {
    if (removedIds.has(artist.id)) counts.removed += 1;
    else if (claimedIds.has(artist.id)) counts.claimed += 1;
    else if (selfRegisteredIds.has(artist.id)) counts.selfRegistered += 1;
    else if (pendingRequestIds.has(artist.id)) counts.pendingRequest += 1;
    else if ([
      {
        instagram: artist.instagram,
        artistId: artist.id,
      },
      ...(artist.sourcePages ?? []).map((sourceUrl) => ({ sourceUrl })),
    ].some((candidate) => tombstoneGate.isTombstoned(candidate).blocked)) {
      counts.tombstoned += 1;
    } else {
      allowed.push(artist);
    }
  }

  return { allowed, counts };
}

export const NATIONAL_SHOP_IMPORT_CYPHER = `
  UNWIND $rows AS row
  MERGE (s:Shop {placeId: row.place_id})
  SET s.name = row.shopName, s.address = row.address, s.city = row.city,
      s.state = row.state, s.lat = row.lat, s.lng = row.lng,
      s.rating = row.rating, s.reviewCount = row.reviewCount, s.website = row.website
  MERGE (c:City {name: row.city, state: row.state})
  MERGE (s)-[:LOCATED_IN]->(c)
  RETURN count(s) AS written
`;

export const NATIONAL_ARTIST_IMPORT_CYPHER = `
  UNWIND $rows AS row
  CALL (row) {
    WITH row
    OPTIONAL MATCH (t:TakedownTombstone)
    WHERE t.key IN row.tombstoneKeys
    WITH row, count(t) AS tombstoneCount
    OPTIONAL MATCH (r:TakedownRequest {status: 'pending', artistId: row.id})
    RETURN tombstoneCount, count(r) AS pendingRequestCount
  }
  WITH row, tombstoneCount, pendingRequestCount
  WHERE tombstoneCount = 0 AND pendingRequestCount = 0
  MERGE (a:Artist {id: row.id})
  WITH a, row
  WHERE a.removedAt IS NULL
    AND a.claimedByUid IS NULL
    AND coalesce(a.selfRegistered, false) = false
  SET a.name = ${preserveArtistManagedField('name', 'row.name')},
      a.shopName = ${preserveArtistManagedField('shopName', 'row.shopName')},
      a.city = ${preserveArtistManagedField('city', 'row.city')},
      a.state = ${preserveArtistManagedField('state', 'row.state')},
      a.instagram = ${preserveVerifiedIdentityField('instagram', 'row.instagram')},
      a.instagramUrl = ${preserveVerifiedIdentityField('instagramUrl', 'row.instagramUrl')},
      a.rating = row.rating, a.reviewCount = row.reviewCount,
      a.bio = ${preserveArtistManagedField('bio', 'row.bio')},
      a.lat = row.coordinates.lat, a.lng = row.coordinates.lng,
      a.portfolioImages = CASE
        WHEN size(row.portfolioImages) > 0 THEN row.portfolioImages
        ELSE coalesce(a.portfolioImages, [])
      END,
      a.portfolioSource = CASE
        WHEN size(row.portfolioImages) > 0 THEN 'website'
        ELSE a.portfolioSource
      END
  SET a.portfolioImageCount = size(coalesce(a.portfolioImages, []))
  MERGE (c:City {name: row.city, state: row.state})
  MERGE (a)-[:LOCATED_IN]->(c)
  WITH a, row
  CALL (a, row) {
    WITH a, row
    UNWIND row.styles AS styleName
    MERGE (st:Style {name: styleName})
    MERGE (a)-[:SPECIALIZES_IN]->(st)
  }
  CALL (a, row) {
    WITH a, row
    UNWIND row.tags AS tagName
    MERGE (t:Tag {name: tagName})
    MERGE (a)-[:TAGGED_WITH]->(t)
  }
  CALL (a, row) {
    WITH a, row
    MATCH (s:Shop {name: row.shopName, city: row.city, state: row.state})
    MERGE (a)-[:WORKS_AT]->(s)
  }
  RETURN count(a) AS written
`;
