import { describe, expect, it } from "vitest";
import { artistIdFromSlug, artistSlug, kebab } from "./artist-slug";

describe("kebab", () => {
  it("lowercases and collapses non-alphanumerics", () => {
    expect(kebab("Pham Minh Phuc")).toBe("pham-minh-phuc");
    expect(kebab("  Édward   Needle-hands! ")).toBe("dward-needle-hands");
  });
});

describe("artistSlug", () => {
  it("embeds the id verbatim after the -- separator", () => {
    expect(artistSlug("Pham Minh Phuc", "artist_pham.minh.phuc")).toBe(
      "pham-minh-phuc--artist_pham.minh.phuc",
    );
  });

  it("disambiguates name collisions via the id", () => {
    const a = artistSlug("Alex Rivera", "artist_alexr_ink");
    const b = artistSlug("Alex Rivera", "artist_rivera.tattoo");
    expect(a).not.toBe(b);
    expect(artistIdFromSlug(a)).toBe("artist_alexr_ink");
    expect(artistIdFromSlug(b)).toBe("artist_rivera.tattoo");
  });

  it("falls back to the bare id when the name kebabs to nothing", () => {
    expect(artistSlug("✦✦✦", "artist_stars")).toBe("artist_stars");
  });
});

describe("artistIdFromSlug", () => {
  it("round-trips artistSlug", () => {
    const slug = artistSlug("Edward Needlehands", "artist_edward_needlehands");
    expect(artistIdFromSlug(slug)).toBe("artist_edward_needlehands");
  });

  it("accepts a bare id (deep links without a name)", () => {
    expect(artistIdFromSlug("artist_tattoosbyging")).toBe("artist_tattoosbyging");
  });

  it("decodes URL-encoded slugs", () => {
    expect(artistIdFromSlug("pham-minh-phuc--artist_pham%2Eminh%2Ephuc")).toBe(
      "artist_pham.minh.phuc",
    );
  });
});
