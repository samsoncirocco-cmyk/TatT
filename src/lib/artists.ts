import data from "@/data/artists.json";

/**
 * Typed accessor over the artist database (src/data/artists.json —
 * ~6,000 real artists scraped nationally, built by
 * scripts/build-artist-dataset.js). The punk pages read from here;
 * do not hardcode rosters in pages.
 *
 * Fields the scrape can't observe (hourlyRate, yearsExperience,
 * bookingAvailable) are null; the UI hides them when absent. rating /
 * reviewCount are the shop's Google values, shared by artists at the
 * same shop. portfolioImages may be empty (~60% of artists).
 */
export type Artist = {
  id: number;
  name: string;
  slug: string;
  shopName: string;
  city: string;
  state: string;
  location: string;
  styles: string[];
  tags: string[];
  portfolioImages: string[];
  instagram: string;
  hourlyRate: number | null;
  rating: number | null;
  reviewCount: number;
  bio: string;
  yearsExperience: number | null;
  bookingAvailable: boolean | null;
};

/** True when an artist has at least one portfolio image. */
export function hasImage(a: Artist): boolean {
  return a.portfolioImages.length > 0;
}

// The JSON carries a few provenance fields beyond the Artist shape
// (coordinates, sourceId, sourcePages) — declare them so the cast is
// honest rather than forced through `unknown`.
type RawArtist = Omit<Artist, "slug"> & {
  coordinates?: { lat: number | null; lng: number | null };
  sourceId?: string;
  sourcePages?: string[];
};

function kebab(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// A few names repeat in the dataset — suffix duplicates with the id so
// every slug resolves to exactly one artist.
const rawArtists = (data as { artists: RawArtist[] }).artists;
const nameCounts = new Map<string, number>();
for (const a of rawArtists) {
  const k = kebab(a.name);
  nameCounts.set(k, (nameCounts.get(k) ?? 0) + 1);
}

const ARTISTS: Artist[] = rawArtists.map((a) => {
  const k = kebab(a.name);
  return { ...a, slug: (nameCounts.get(k) ?? 0) > 1 ? `${k}-${a.id}` : k };
});

const BY_SLUG = new Map(ARTISTS.map((a) => [a.slug, a]));

export function getAllArtists(): Artist[] {
  return ARTISTS;
}

export function getArtistBySlug(slug: string): Artist | undefined {
  return BY_SLUG.get(slug);
}

/** Distinct primary styles present in the data, alphabetical. */
export function getAllStyles(): string[] {
  return [...new Set(ARTISTS.flatMap((a) => a.styles))].sort();
}

/** Review-weighted rating; 0 when the shop had no rating. */
function weight(a: Artist): number {
  return (a.rating ?? 0) * a.reviewCount;
}

/** Top artists by review volume × rating, one per style for variety. */
export function getFeaturedArtists(n: number): Artist[] {
  const ranked = [...ARTISTS].sort((a, b) => weight(b) - weight(a));
  const seen = new Set<string>();
  const out: Artist[] = [];
  for (const a of ranked) {
    const style = a.styles[0] ?? "";
    if (seen.has(style)) continue;
    seen.add(style);
    out.push(a);
    if (out.length === n) break;
  }
  return out;
}
