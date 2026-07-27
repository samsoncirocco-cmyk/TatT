export const ARTIST_MANAGED_PROFILE_FIELDS = [
  'name',
  'shopName',
  'bio',
  'bookingUrl',
  'city',
  'state',
] as const;

export type ArtistManagedProfileField = (typeof ARTIST_MANAGED_PROFILE_FIELDS)[number];
export type ArtistProfilePatch = Partial<Record<ArtistManagedProfileField, string | null>>;

const LIMITS: Record<ArtistManagedProfileField, number> = {
  name: 100,
  shopName: 120,
  bio: 1200,
  bookingUrl: 500,
  city: 80,
  state: 40,
};

export function validateArtistProfilePatch(
  input: unknown,
): { ok: true; value: ArtistProfilePatch; fields: ArtistManagedProfileField[] } | {
  ok: false;
  error: string;
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Profile must be an object.' };
  }
  const raw = input as Record<string, unknown>;
  const unknown = Object.keys(raw).filter(
    (key) => !(ARTIST_MANAGED_PROFILE_FIELDS as readonly string[]).includes(key),
  );
  if (unknown.length) {
    return { ok: false, error: `These fields cannot be edited here: ${unknown.join(', ')}.` };
  }

  const value: ArtistProfilePatch = {};
  const fields: ArtistManagedProfileField[] = [];
  for (const field of ARTIST_MANAGED_PROFILE_FIELDS) {
    if (!(field in raw)) continue;
    const candidate = raw[field];
    if (candidate !== null && typeof candidate !== 'string') {
      return { ok: false, error: `${field} must be text or null.` };
    }
    const normalized = typeof candidate === 'string' ? candidate.trim() : null;
    if (normalized && normalized.length > LIMITS[field]) {
      return { ok: false, error: `${field} is too long (maximum ${LIMITS[field]} characters).` };
    }
    if (field === 'name' && !normalized) {
      return { ok: false, error: 'Name cannot be blank.' };
    }
    if (field === 'bookingUrl' && normalized) {
      try {
        const url = new URL(normalized);
        if (url.protocol !== 'https:') {
          return { ok: false, error: 'Booking URL must use https.' };
        }
      } catch {
        return { ok: false, error: 'Booking URL must be a complete https URL.' };
      }
    }
    value[field] = normalized || null;
    fields.push(field);
  }
  if (!fields.length) return { ok: false, error: 'No editable profile fields were supplied.' };
  return { ok: true, value, fields };
}

