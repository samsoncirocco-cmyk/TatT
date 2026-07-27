import { describe, expect, it } from "vitest";
import {
  filterPortfolioForDisplay,
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
