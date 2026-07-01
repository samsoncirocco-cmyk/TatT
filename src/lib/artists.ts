import data from "@/data/artists.json";

/**
 * Typed accessor over the artist database (src/data/artists.json —
 * 100 artists with portfolio images keyed to public/portfolio/*.png).
 * The punk pages read from here; do not hardcode rosters in pages.
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
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  bio: string;
  yearsExperience: number;
  bookingAvailable: boolean;
};

type RawArtist = Omit<Artist, "slug">;

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

/** Top artists by review volume × rating, one per style for variety. */
export function getFeaturedArtists(n: number): Artist[] {
  const ranked = [...ARTISTS].sort(
    (a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount,
  );
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
