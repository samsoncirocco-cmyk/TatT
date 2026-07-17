#!/usr/bin/env node
/**
 * build-artist-dataset.js
 *
 * Transforms the scraped national dataset into the app schema that
 * src/lib/artists.ts consumes, writing src/data/artists.json.
 *
 * Source: data/national-artists-2026-07-15.json (scrape output — see
 *   execution/scrape_artists.py). ~6,434 real artists + shops.
 * Target: src/data/artists.json — the shape lib/artists.ts reads.
 *
 * Design decisions (approved 2026-07-17):
 *  - hourlyRate / yearsExperience stay NULL when unobservable. The scrape
 *    never fabricated them; the UI hides these fields when absent.
 *  - rating / reviewCount are the SHOP's Google values (the scrape can't
 *    see per-artist ratings). Carried through; artists at the same shop
 *    share them. The `shop-rating` tag flags this.
 *  - Artists WITH portfolio images sort first, so /artists shows the
 *    strongest tiles up top without extra page logic.
 *  - Numeric ids are assigned 1..N over the sorted order (the app schema
 *    keys on numeric id; the scrape's string id becomes `sourceId`).
 *
 * Idempotent, no network. Re-run after any re-scrape:
 *   node scripts/build-artist-dataset.js
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = resolve(__dirname, "..");
const SOURCE = join(ROOT, "data", "national-artists-2026-07-15.json");
const TARGET = join(ROOT, "src", "data", "artists.json");

function loadSource() {
  if (!existsSync(SOURCE)) {
    console.error(`Source dataset not found: ${SOURCE}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(SOURCE, "utf-8"));
}

// Non-person filter. The scrape captured some page titles and UI chrome as
// "artists" (e.g. "Meet the Team", "Home", "Our NIL Deals"). We filter on
// NAME only — handles are unreliable (many real artists have "tattoo" in
// their handle, so a handle filter would delete real people). Evidence-based
// from a survey of the 6,434-row dataset; see the PR for the drop list.
// Each entry is one alternative; joined with "|" so a line break can never
// silently fuse two words (an earlier bug: "book\s+now" + "directory" merged).
const JUNK_ALTERNATIVES = [
  "home", "menu", "contact", "about", "faq", "aftercare",
  "policy", "policies", "booking", "book\\s+now", "directory",
  "gift\\s*cards?", "our\\s+\\w+", "meet\\s+(the|our)",
  "staff", "team", "trainees?", "apprentice", "curriculum",
  "sponsorships?", "management", "retail", "careers?", "hours?",
  "directions?", "reviews?", "specials?", "events?", "merch",
  "financing", "guest\\s+spots?", "piercer", "owner",
  "added\\s+to\\s+your\\s+cart", "item\\s+added", "just\\s+added",
  "find\\s+us", "connect\\s+with", "get\\s+in\\s+touch", "see\\s+us",
  "keep\\s+up", "check\\s+out", "social\\s+media", "examples?\\s+of",
  "visit\\s+any", "higher\\s+standard", "a\\s+place", "where\\s+ink",
  "sticker",
];
const JUNK_NAME = new RegExp(`\\b(${JUNK_ALTERNATIVES.join("|")})\\b`, "i");
const ADDRESS_LIKE = /\b(rd|st|ave|blvd|dr|ln|suite|ste|#\d|\d{5})\b\.?/i;
const DATE_LIKE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b\.?\s*\d/i;
const SPACED_LETTERS = /^([A-Za-z]\s+){3,}[A-Za-z]$/;

function isNonPerson(name) {
  const n = (name || "").trim();
  if (n.length < 2) return true;
  if (JUNK_NAME.test(n)) return true;
  if (ADDRESS_LIKE.test(n)) return true;
  if (DATE_LIKE.test(n)) return true;
  if (n.split(/\s+/).length > 4) return true; // sentences, not names
  if (SPACED_LETTERS.test(n)) return true; // "M A R I E L" logos
  return false;
}

/**
 * Map one scraped artist to the app schema. Preserves honest nulls;
 * does not invent fields the scrape couldn't observe.
 */
function toAppArtist(raw) {
  const styles = Array.isArray(raw.styles) ? raw.styles : [];
  // The scrape tags every artist with "shop-rating"; drop that internal
  // marker from the user-facing tag list but keep any real descriptors.
  const tags = (Array.isArray(raw.tags) ? raw.tags : []).filter(
    (t) => t !== "shop-rating",
  );
  const coords = raw.coordinates || {};

  return {
    // id assigned later, over the sorted order
    name: raw.name,
    shopName: raw.shopName,
    city: raw.city,
    state: raw.state,
    location: raw.location || `${raw.city}, ${raw.state}`,
    coordinates: {
      lat: typeof coords.lat === "number" ? coords.lat : null,
      lng: typeof coords.lng === "number" ? coords.lng : null,
    },
    styles,
    tags,
    portfolioImages: Array.isArray(raw.portfolioImages)
      ? raw.portfolioImages
      : [],
    instagram: raw.instagram || "",
    hourlyRate: null, // not observable — never fabricated
    rating: typeof raw.rating === "number" ? raw.rating : null,
    reviewCount: typeof raw.reviewCount === "number" ? raw.reviewCount : 0,
    bio: raw.bio || `Tattoo artist at ${raw.shopName} in ${raw.location}.`,
    yearsExperience: null, // not observable — never fabricated
    bookingAvailable: null, // not observable
    // provenance so the transform is traceable back to the scrape
    sourceId: raw.id,
    sourcePages: Array.isArray(raw.sourcePages) ? raw.sourcePages : [],
  };
}

function build() {
  const source = loadSource();
  const rawArtists = Array.isArray(source.artists) ? source.artists : [];

  const droppedNonPerson = rawArtists.filter((r) => isNonPerson(r.name)).length;
  const mapped = rawArtists
    .filter((r) => !isNonPerson(r.name))
    .map(toAppArtist);

  // Image-havers first; within each group, higher review-weighted rating
  // first so the strongest cards lead. Stable on name for determinism.
  mapped.sort((a, b) => {
    const ai = a.portfolioImages.length > 0 ? 1 : 0;
    const bi = b.portfolioImages.length > 0 ? 1 : 0;
    if (ai !== bi) return bi - ai;
    const aw = (a.rating || 0) * a.reviewCount;
    const bw = (b.rating || 0) * b.reviewCount;
    if (aw !== bw) return bw - aw;
    return a.name.localeCompare(b.name);
  });

  const artists = mapped.map((a, i) => ({ id: i + 1, ...a }));

  const cities = [
    ...new Set(artists.map((a) => a.location).filter(Boolean)),
  ].sort();
  const styles = [
    ...new Set(artists.flatMap((a) => a.styles)),
  ].sort();

  const out = {
    generatedAt: source.t || null,
    generatedFrom: "data/national-artists-2026-07-15.json",
    artists,
    cities,
    styles,
  };

  writeFileSync(TARGET, JSON.stringify(out, null, 1));

  const withImages = artists.filter((a) => a.portfolioImages.length > 0).length;
  const withStyles = artists.filter((a) => a.styles.length > 0).length;
  console.log(`Wrote ${TARGET}`);
  console.log(
    `  ${artists.length} artists | ${withImages} with images | ` +
      `${withStyles} with styles | ${cities.length} cities | ` +
      `${styles.length} styles`,
  );
  console.log(
    `  dropped ${droppedNonPerson} non-person entries ` +
      `(page titles / UI chrome) from ${rawArtists.length} scraped rows`,
  );
}

build();
