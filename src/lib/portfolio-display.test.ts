import { describe, expect, it } from "vitest";
import {
  IG_PERMALINK_CYPHER,
  filterPermalinksForDisplay,
  filterPortfolioForDisplay,
  igEmbedsEnabled,
  unclaimedPortfolioDisplayEnabled,
} from "./portfolio-display";

const IMAGES = [
  "https://storage.googleapis.com/tatt-pro-assets/artists/artist_x/0.jpg",
  "https://storage.googleapis.com/tatt-pro-assets/artists/artist_x/1.jpg",
];

describe("unclaimedPortfolioDisplayEnabled", () => {
  it("defaults to enabled (current behavior) when the flag is unset", () => {
    expect(unclaimedPortfolioDisplayEnabled({})).toBe(true);
  });

  it('only the literal "false" disables — junk values stay on the safe default', () => {
    expect(unclaimedPortfolioDisplayEnabled({ SHOW_UNCLAIMED_PORTFOLIOS: "false" })).toBe(false);
    expect(unclaimedPortfolioDisplayEnabled({ SHOW_UNCLAIMED_PORTFOLIOS: "true" })).toBe(true);
    expect(unclaimedPortfolioDisplayEnabled({ SHOW_UNCLAIMED_PORTFOLIOS: "0" })).toBe(true);
    expect(unclaimedPortfolioDisplayEnabled({ SHOW_UNCLAIMED_PORTFOLIOS: "" })).toBe(true);
  });
});

describe("filterPortfolioForDisplay", () => {
  const on = {};
  const off = { SHOW_UNCLAIMED_PORTFOLIOS: "false" };

  it("flag on: unclaimed artist's images pass unchanged", () => {
    expect(filterPortfolioForDisplay({ portfolioImages: IMAGES }, on)).toEqual(IMAGES);
    expect(
      filterPortfolioForDisplay({ portfolioImages: IMAGES, claimedByUid: null }, on),
    ).toEqual(IMAGES);
  });

  it("flag on: claimed artist's images pass unchanged", () => {
    expect(
      filterPortfolioForDisplay({ portfolioImages: IMAGES, claimedByUid: "uid_1" }, on),
    ).toEqual(IMAGES);
  });

  it("flag off: unclaimed artist gets [] — the kill switch", () => {
    expect(filterPortfolioForDisplay({ portfolioImages: IMAGES }, off)).toEqual([]);
    expect(
      filterPortfolioForDisplay({ portfolioImages: IMAGES, claimedByUid: null }, off),
    ).toEqual([]);
    // An empty-string uid is not a claim.
    expect(
      filterPortfolioForDisplay({ portfolioImages: IMAGES, claimedByUid: "" }, off),
    ).toEqual([]);
  });

  it("flag off: claimed artist keeps their images (claiming grants the license)", () => {
    expect(
      filterPortfolioForDisplay({ portfolioImages: IMAGES, claimedByUid: "uid_1" }, off),
    ).toEqual(IMAGES);
  });

  it("normalizes junk: non-array and non-string entries never leave", () => {
    expect(filterPortfolioForDisplay({}, on)).toEqual([]);
    expect(filterPortfolioForDisplay({ portfolioImages: null }, on)).toEqual([]);
    expect(filterPortfolioForDisplay({ portfolioImages: "not-an-array" }, on)).toEqual([]);
    expect(
      filterPortfolioForDisplay({ portfolioImages: [IMAGES[0], 42, null] }, on),
    ).toEqual([IMAGES[0]]);
  });

  it("reads process.env by default so callers need no plumbing", () => {
    // No env argument — should behave as flag-on since the test env is unset.
    expect(filterPortfolioForDisplay({ portfolioImages: IMAGES })).toEqual(IMAGES);
  });
});

describe("igEmbedsEnabled", () => {
  it('defaults to DISABLED — only the literal "true" enables', () => {
    expect(igEmbedsEnabled({})).toBe(false);
    expect(igEmbedsEnabled({ ENABLE_IG_EMBEDS: "true" })).toBe(true);
    expect(igEmbedsEnabled({ ENABLE_IG_EMBEDS: "false" })).toBe(false);
    expect(igEmbedsEnabled({ ENABLE_IG_EMBEDS: "1" })).toBe(false);
    expect(igEmbedsEnabled({ ENABLE_IG_EMBEDS: "" })).toBe(false);
  });
});

describe("filterPermalinksForDisplay (TAT-40 policy matrix)", () => {
  const PERMALINKS = [
    "https://www.instagram.com/p/Abc123xyz_-/",
    "https://www.instagram.com/reel/DEF456/",
  ];
  const embedsOn = { ENABLE_IG_EMBEDS: "true" };
  const embedsOff = {};

  it("embeds flag off (default): nothing leaves, regardless of claim state", () => {
    expect(
      filterPermalinksForDisplay({ portfolioPermalinks: PERMALINKS }, embedsOff),
    ).toEqual([]);
    expect(
      filterPermalinksForDisplay(
        { portfolioPermalinks: PERMALINKS, claimedByUid: "uid_1" },
        embedsOff,
      ),
    ).toEqual([]);
  });

  it("embeds flag on: unclaimed artist's permalinks pass", () => {
    expect(
      filterPermalinksForDisplay({ portfolioPermalinks: PERMALINKS }, embedsOn),
    ).toEqual(PERMALINKS);
    expect(
      filterPermalinksForDisplay(
        { portfolioPermalinks: PERMALINKS, claimedByUid: null },
        embedsOn,
      ),
    ).toEqual(PERMALINKS);
  });

  it("embeds flag on: claimed artist gets [] — licensed hosted images are their display", () => {
    expect(
      filterPermalinksForDisplay(
        { portfolioPermalinks: PERMALINKS, claimedByUid: "uid_1" },
        embedsOn,
      ),
    ).toEqual([]);
  });

  it("independent of the portfolio kill switch — permalinks flow either way when enabled", () => {
    const killSwitchOff = { ENABLE_IG_EMBEDS: "true", SHOW_UNCLAIMED_PORTFOLIOS: "false" };
    expect(
      filterPermalinksForDisplay({ portfolioPermalinks: PERMALINKS }, killSwitchOff),
    ).toEqual(PERMALINKS);
    // ...and the kill switch still withholds the hosted images alongside.
    expect(
      filterPortfolioForDisplay(
        { portfolioImages: IMAGES, portfolioPermalinks: PERMALINKS },
        killSwitchOff,
      ),
    ).toEqual([]);
  });

  it("missing/empty portfolioPermalinks degrades to [] (backfill may not have run)", () => {
    expect(filterPermalinksForDisplay({}, embedsOn)).toEqual([]);
    expect(filterPermalinksForDisplay({ portfolioPermalinks: null }, embedsOn)).toEqual([]);
    expect(filterPermalinksForDisplay({ portfolioPermalinks: [] }, embedsOn)).toEqual([]);
    expect(
      filterPermalinksForDisplay({ portfolioPermalinks: "not-an-array" }, embedsOn),
    ).toEqual([]);
  });

  it("normalizes to canonical https://www.instagram.com permalinks and drops junk", () => {
    expect(
      filterPermalinksForDisplay(
        {
          portfolioPermalinks: [
            "http://instagram.com/p/Abc123",
            "  https://www.instagram.com/reel/DEF456/?utm_source=ig ",
            "https://www.instagram.com/tv/GHI789/",
            "https://www.instagram.com/some.artist/", // profile, not a post
            "https://evil.example.com/p/Abc123/",
            "javascript:alert(1)",
            42,
            null,
          ],
        },
        embedsOn,
      ),
    ).toEqual([
      "https://www.instagram.com/p/Abc123/",
      "https://www.instagram.com/reel/DEF456/",
      "https://www.instagram.com/tv/GHI789/",
    ]);
  });

  it("dedupes permalinks that normalize to the same post", () => {
    expect(
      filterPermalinksForDisplay(
        {
          portfolioPermalinks: [
            "https://instagram.com/p/Abc123",
            "https://www.instagram.com/p/Abc123/",
          ],
        },
        embedsOn,
      ),
    ).toEqual(["https://www.instagram.com/p/Abc123/"]);
  });

  it("reads process.env by default — and the test env has embeds off", () => {
    expect(filterPermalinksForDisplay({ portfolioPermalinks: PERMALINKS })).toEqual([]);
  });
});

// The Cypher twin of IG_PERMALINK, used by the roster's hasPortfolio filter
// (src/lib/artists-graph) so the database's idea of a displayable permalink
// stays the display policy's idea. Cypher `=~` is full-match and Cypher-side
// values go through trim(), so the parity check mirrors both.
describe("IG_PERMALINK_CYPHER (server-side filter parity)", () => {
  const fullMatch = new RegExp(`^(?:${IG_PERMALINK_CYPHER.replace("(?i)", "")})$`, "i");
  const embedsOn = { ENABLE_IG_EMBEDS: "true" };

  it("accepts exactly the permalinks filterPermalinksForDisplay keeps", () => {
    const samples = [
      "https://www.instagram.com/p/Abc123xyz_-/",
      "http://instagram.com/reel/DEF456",
      "HTTPS://WWW.INSTAGRAM.COM/TV/GHI789/",
      "  https://www.instagram.com/reel/DEF456/?utm_source=ig ",
      "https://www.instagram.com/some.artist/", // profile, not a post
      "https://evil.example.com/p/Abc123/",
      "javascript:alert(1)",
      "",
    ];
    for (const s of samples) {
      const kept =
        filterPermalinksForDisplay({ portfolioPermalinks: [s] }, embedsOn).length > 0;
      expect(fullMatch.test(s.trim()), s).toBe(kept);
    }
  });
});
