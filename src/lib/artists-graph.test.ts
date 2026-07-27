import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ROSTER_PAGE_SIZE,
  buildRosterFilter,
  getRosterArtistById,
  instagramUrl,
  rosterPageWindow,
  toRosterArtist,
} from "./artists-graph";

const mockedQuery = vi.hoisted(() => vi.fn(async () => [] as any[]));
vi.mock("@/features/match-pulse/services/neo4jService", () => ({
  executeServerCypherQuery: mockedQuery,
}));

describe("buildRosterFilter", () => {
  it("nulls out empty filters so the WHERE clause passes everything", () => {
    expect(buildRosterFilter({}).params).toEqual({
      q: null,
      styleVariants: [],
      hasPortfolio: false,
    });
    expect(buildRosterFilter({ q: "  ", style: "" }).params).toEqual({
      q: null,
      styleVariants: [],
      hasPortfolio: false,
    });
  });

  it("trims and forwards active filters as parameters, never inline", () => {
    const { where, params } = buildRosterFilter({ q: " austin ", style: "Blackwork" });
    expect(params.q).toBe("austin");
    expect(params.hasPortfolio).toBe(false);
    // The style reaches Cypher as its spelling group, not as a bare name.
    expect(params.styleVariants).toContain("blackwork");
    // Values must reach Cypher only via $params (no string interpolation).
    expect(where).not.toContain("austin");
    expect(where).not.toContain("Blackwork");
    expect(where).toContain("$q");
    expect(where).toContain("$styleVariants");
  });

  // A takedown that the roster ignores is cosmetic. Every roster read must be
  // gated on removedAt — see docs/adr/0025.
  it("suppresses taken-down artists unconditionally, whatever the filters", () => {
    for (const filter of [{}, { q: "austin" }, { style: "Blackwork" }, { hasPortfolio: true }]) {
      expect(buildRosterFilter(filter).where).toContain("a.removedAt IS NULL");
    }
  });

  it("gates the roster on real stored portfolioImages, not the stale count", () => {
    const { where, params } = buildRosterFilter({ hasPortfolio: true });
    expect(params.hasPortfolio).toBe(true);
    // Keys off the real self-hosted array, never portfolioImageCount.
    expect(where).toContain("$hasPortfolio");
    expect(where).toContain("a.portfolioImages IS NOT NULL");
    expect(where).toContain("size(a.portfolioImages) > 0");
    expect(where).not.toContain("portfolioImageCount");
  });

  it("searches name, city, and shop; matches style case-insensitively", () => {
    const { where } = buildRosterFilter({ q: "x", style: "Blackwork" });
    expect(where).toContain("a.name");
    expect(where).toContain("a.city");
    expect(where).toContain("a.shopName");
    expect(where).toContain("toLower(s) IN $styleVariants");
  });
});

describe("rosterPageWindow", () => {
  it("defaults to page 1", () => {
    expect(rosterPageWindow(undefined)).toEqual({
      page: 1,
      skip: 0,
      limit: ROSTER_PAGE_SIZE,
    });
  });

  it("computes the skip window from the 1-based page", () => {
    expect(rosterPageWindow("3")).toEqual({
      page: 3,
      skip: 2 * ROSTER_PAGE_SIZE,
      limit: ROSTER_PAGE_SIZE,
    });
  });

  it("clamps junk to page 1 and truncates floats", () => {
    expect(rosterPageWindow("-2").page).toBe(1);
    expect(rosterPageWindow("banana").page).toBe(1);
    expect(rosterPageWindow(["2", "9"]).page).toBe(1);
    expect(rosterPageWindow("2.9").page).toBe(2);
  });
});

describe("instagramUrl", () => {
  it("normalizes handles, urls, and trailing paths", () => {
    expect(instagramUrl("@ink.by.sam")).toBe("https://instagram.com/ink.by.sam");
    expect(instagramUrl("https://www.instagram.com/ink.by.sam/reels")).toBe(
      "https://instagram.com/ink.by.sam",
    );
    expect(instagramUrl("")).toBeNull();
    expect(instagramUrl(null)).toBeNull();
  });
});

// The SHOW_UNCLAIMED_PORTFOLIOS kill switch (TAT-31): every roster surface —
// /artists cards and the /artists/[slug] profile — reads through
// toRosterArtist, so this seam is where withholding scraped images for
// unclaimed artists must actually happen.
describe("roster portfolio kill switch", () => {
  const GCS_IMAGES = [
    "https://storage.googleapis.com/tatt-pro-assets/artists/artist_1/0.jpg",
  ];

  afterEach(() => {
    mockedQuery.mockReset();
    mockedQuery.mockResolvedValue([]);
    vi.unstubAllEnvs();
  });

  it("selects claimedByUid in the roster page and profile queries", () => {
    // Source-level check: the mapper can only gate on a claim binding the
    // Cypher actually returns. Both RETURN blocks must select it.
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/artists-graph.ts"),
      "utf8",
    );
    const hits = source.match(/a\.claimedByUid AS claimedByUid/g) ?? [];
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  it("default (flag unset): unclaimed artists keep their images — current behavior", () => {
    const row = toRosterArtist({
      id: "artist_1",
      name: "A",
      portfolioImages: GCS_IMAGES,
      claimedByUid: null,
    });
    expect(row.portfolioImages).toEqual(GCS_IMAGES);
  });

  it("flag off: an unclaimed artist's roster card carries no images", () => {
    vi.stubEnv("SHOW_UNCLAIMED_PORTFOLIOS", "false");
    const row = toRosterArtist({
      id: "artist_1",
      name: "A",
      portfolioImages: GCS_IMAGES,
      claimedByUid: null,
    });
    expect(row.portfolioImages).toEqual([]);
  });

  it("flag off: a claimed artist's images still show — claiming grants the license", () => {
    vi.stubEnv("SHOW_UNCLAIMED_PORTFOLIOS", "false");
    const row = toRosterArtist({
      id: "artist_1",
      name: "A",
      portfolioImages: GCS_IMAGES,
      claimedByUid: "uid_9",
    });
    expect(row.portfolioImages).toEqual(GCS_IMAGES);
  });

  it("flag off: the /artists/[slug] profile read comes back image-less end to end", async () => {
    vi.stubEnv("SHOW_UNCLAIMED_PORTFOLIOS", "false");
    mockedQuery.mockResolvedValue([
      { id: "artist_1", name: "A", portfolioImages: GCS_IMAGES, claimedByUid: null },
    ]);
    const artist = await getRosterArtistById("artist_1");
    expect(artist?.portfolioImages).toEqual([]);
    // And the profile query itself asked for the claim binding.
    expect(mockedQuery.mock.calls[0][0]).toContain("a.claimedByUid AS claimedByUid");
  });
});

// The Instagram embed tier (TAT-40): permalinks ride the same toRosterArtist
// seam as the kill switch, and are inert ([]) until ENABLE_IG_EMBEDS=true.
describe("roster Instagram permalinks (TAT-40)", () => {
  const PERMALINKS = ["https://www.instagram.com/p/Abc123/"];

  afterEach(() => {
    mockedQuery.mockReset();
    mockedQuery.mockResolvedValue([]);
    vi.unstubAllEnvs();
  });

  it("selects portfolioPermalinks in the roster page and profile queries", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/artists-graph.ts"),
      "utf8",
    );
    const hits = source.match(/a\.portfolioPermalinks AS portfolioPermalinks/g) ?? [];
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  it("default (ENABLE_IG_EMBEDS unset): permalinks stay behind the flag — []", () => {
    const row = toRosterArtist({
      id: "artist_1",
      name: "A",
      portfolioPermalinks: PERMALINKS,
      claimedByUid: null,
    });
    expect(row.portfolioPermalinks).toEqual([]);
  });

  it("flag on: an unclaimed artist's permalinks pass through", () => {
    vi.stubEnv("ENABLE_IG_EMBEDS", "true");
    const row = toRosterArtist({
      id: "artist_1",
      name: "A",
      portfolioPermalinks: PERMALINKS,
      claimedByUid: null,
    });
    expect(row.portfolioPermalinks).toEqual(PERMALINKS);
  });

  it("flag on: a claimed artist gets [] — hosted licensed images are their display", () => {
    vi.stubEnv("ENABLE_IG_EMBEDS", "true");
    const row = toRosterArtist({
      id: "artist_1",
      name: "A",
      portfolioPermalinks: PERMALINKS,
      claimedByUid: "uid_9",
    });
    expect(row.portfolioPermalinks).toEqual([]);
  });

  it("graph rows without the property (backfill not run) degrade to []", () => {
    vi.stubEnv("ENABLE_IG_EMBEDS", "true");
    const row = toRosterArtist({ id: "artist_1", name: "A", claimedByUid: null });
    expect(row.portfolioPermalinks).toEqual([]);
  });

  it("kill switch off + embeds on: profile read is image-less but carries permalinks", async () => {
    vi.stubEnv("SHOW_UNCLAIMED_PORTFOLIOS", "false");
    vi.stubEnv("ENABLE_IG_EMBEDS", "true");
    mockedQuery.mockResolvedValue([
      {
        id: "artist_1",
        name: "A",
        portfolioImages: ["https://storage.googleapis.com/tatt-pro-assets/a/0.jpg"],
        portfolioPermalinks: PERMALINKS,
        claimedByUid: null,
      },
    ]);
    const artist = await getRosterArtistById("artist_1");
    expect(artist?.portfolioImages).toEqual([]);
    expect(artist?.portfolioPermalinks).toEqual(PERMALINKS);
    expect(mockedQuery.mock.calls[0][0]).toContain(
      "a.portfolioPermalinks AS portfolioPermalinks",
    );
  });
});
