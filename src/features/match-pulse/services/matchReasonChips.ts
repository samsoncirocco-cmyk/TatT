/**
 * Human-readable "why this artist" chips, derived ONLY from fields the
 * semantic match payload actually carries (see neo4jService.findMatchingArtists
 * RETURN clause → hybridMatchService.scoreArtists spread):
 *
 *   styles[]      — (a)-[:SPECIALIZES_IN]->(:Style) names
 *   city/location — a.city / "City, ST"
 *   rating        — a.rating (0–5), reviewCount — a.reviewCount
 *   portfolio[]   — (a)-[:CREATED]->(:Tattoo).imageUrl list
 *
 * Hard rule: every chip is backed by a payload field. A sparse payload
 * yields fewer chips (or none) — nothing is ever invented to pad the row.
 * Each chip stays at ≤4 words so it reads on a swipe card.
 */

export interface ReasonChipArtist {
    styles?: string[] | null;
    /** "City, ST" display string from the graph. */
    location?: string | null;
    city?: string | null;
    portfolio?: string[] | null;
    rating?: number | null;
    reviewCount?: number | null;
}

export interface ReasonChipPrefs {
    /** Canonical style labels the user picked on /smart-match. */
    styles?: string[] | null;
    /** The location the user typed, if any. */
    location?: string | null;
}

export const MAX_REASON_CHIPS = 3;

/** Ratings below this aren't a selling point — no chip, never a fudge. */
const MIN_RATING_FOR_CHIP = 4.5;
const MIN_REVIEWS_FOR_COUNT = 10;
/** Fewer pieces than this isn't "depth"; skip the chip rather than inflate. */
const MIN_PORTFOLIO_FOR_CHIP = 10;

/**
 * Same tolerance the graph's style filter has (style-vocabulary variants):
 * "Japanese" should credit an artist stored as "Japanese (Irezumi)".
 */
function styleMatches(prefStyle: string, artistStyle: string): boolean {
    const pref = prefStyle.trim().toLowerCase();
    const artist = artistStyle.trim().toLowerCase();
    if (!pref || !artist) return false;
    return pref === artist || artist.includes(pref) || pref.includes(artist);
}

function locationMatches(prefLocation: string, artist: ReasonChipArtist): boolean {
    const pref = prefLocation.trim().toLowerCase();
    if (!pref) return false;
    const haystacks = [artist.city, artist.location]
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .map((v) => v.toLowerCase());
    return haystacks.some((h) => h.includes(pref) || pref.includes(h));
}

/** "Austin, TX" → "Austin"; already-bare city strings pass through. */
function cityLabel(artist: ReasonChipArtist): string | null {
    const raw = artist.city || artist.location;
    if (!raw || typeof raw !== "string") return null;
    const city = raw.split(",")[0].trim();
    return city.length > 0 ? city : null;
}

/**
 * Derive 0–3 honest reason chips for one matched artist.
 * Priority: style overlap → location → rating → portfolio depth.
 */
export function deriveReasonChips(
    artist: ReasonChipArtist,
    prefs: ReasonChipPrefs = {}
): string[] {
    const chips: string[] = [];

    // 1. Style — the user's own pick when it overlaps, otherwise the
    //    artist's graph-declared specialty. Both are payload-backed.
    const artistStyles = (artist.styles || []).filter(Boolean);
    const prefStyles = (prefs.styles || []).filter(Boolean);
    const matchedPref = prefStyles.find((p) =>
        artistStyles.some((s) => styleMatches(p, s))
    );
    if (matchedPref) {
        chips.push(`${matchedPref} — your pick`);
    } else if (artistStyles.length > 0) {
        chips.push(`${artistStyles[0]} specialist`);
    }

    // 2. Location — only when the user gave one AND the artist's city/state
    //    actually matches it. No location signal ⇒ no "near you" claim.
    if (prefs.location && locationMatches(prefs.location, artist)) {
        const city = cityLabel(artist);
        if (city) chips.push(`${city} — near you`);
    }

    // 3. Rating — published shop/artist rating, only when it's genuinely
    //    strong. Review count rides along when it's meaningful.
    const rating = artist.rating;
    if (typeof rating === "number" && !Number.isNaN(rating) && rating >= MIN_RATING_FOR_CHIP) {
        const reviews = artist.reviewCount;
        chips.push(
            typeof reviews === "number" && reviews >= MIN_REVIEWS_FOR_COUNT
                ? `${rating.toFixed(1)}★, ${reviews} reviews`
                : `Rated ${rating.toFixed(1)}★`
        );
    }

    // 4. Portfolio depth — count of real portfolio image URLs in the payload.
    const pieces = Array.isArray(artist.portfolio) ? artist.portfolio.length : 0;
    if (pieces >= MIN_PORTFOLIO_FOR_CHIP) {
        chips.push(`${pieces} pieces shown`);
    }

    return chips.slice(0, MAX_REASON_CHIPS);
}
