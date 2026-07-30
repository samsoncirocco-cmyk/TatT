import { describe, it, expect } from "vitest";
import {
  deriveTasteProfile,
  pinnedArtistStyles,
  smartMatchUrlForTaste,
  MIN_TASTE_DATA_POINTS,
  type TasteDesignInput,
} from "./taste-profile";
import { artistSlug } from "./artist-slug";

const design = (prompt: string, title?: string): TasteDesignInput => ({
  prompt,
  title,
});

describe("deriveTasteProfile", () => {
  it("finds the dominant style across a fixture library", () => {
    const profile = deriveTasteProfile([
      design("blackwork raven, outer forearm"),
      design("heavy black linework snake"),
      design("blackwork stencil of a moth"),
      design("fine line script, single needle"),
      design("blackwork dagger through a rose"),
      design("a cool dragon on my arm"), // no readable style — still a save
    ]);
    expect(profile).not.toBeNull();
    expect(profile!.designCount).toBe(6);
    expect(profile!.dataPoints).toBe(6);
    expect(profile!.topStyles[0]).toEqual({ style: "Blackwork", count: 4 });
    expect(profile!.line).toBe(
      "you keep coming back to blackwork — 4 of 6 saves",
    );
  });

  it("names a tie instead of inventing a winner", () => {
    const profile = deriveTasteProfile([
      design("blackwork wolf"),
      design("fine line fern"),
    ]);
    expect(profile).not.toBeNull();
    const counts = profile!.topStyles.map((s) => s.count);
    expect(counts).toEqual([1, 1]);
    expect(profile!.line).toBe("torn between blackwork and fine line — 1 each");
  });

  it("only 'leans' on a single hit instead of claiming a streak", () => {
    const profile = deriveTasteProfile([
      design("blackwork raven"),
      design("something for my ankle"), // save with no readable style
    ]);
    expect(profile!.line).toBe("leaning blackwork — 1 of 2 saves");
  });

  it("hides entirely below the minimum data points", () => {
    expect(MIN_TASTE_DATA_POINTS).toBe(2);
    expect(deriveTasteProfile([])).toBeNull();
    expect(deriveTasteProfile([design("blackwork raven")])).toBeNull();
  });

  it("hides when saves exist but none carry a readable style", () => {
    const profile = deriveTasteProfile([
      design("a cool dragon on my arm"),
      design("something for my ankle"),
    ]);
    expect(profile).toBeNull();
  });

  it("flags a small-n read as early", () => {
    const early = deriveTasteProfile([
      design("blackwork raven"),
      design("blackwork moth"),
      design("blackwork snake"),
    ]);
    expect(early!.earlyRead).toBe(true);

    const settled = deriveTasteProfile([
      design("blackwork raven"),
      design("blackwork moth"),
      design("blackwork snake"),
      design("blackwork dagger"),
      design("blackwork wolf"),
    ]);
    expect(settled!.earlyRead).toBe(false);
  });

  it("reads palette leaning from the prompts, one vote per design", () => {
    const black = deriveTasteProfile([
      design("blackwork raven, black ink only"),
      design("dotwork mandala"),
    ]);
    expect(black!.palette).toBe("blackwork");

    const color = deriveTasteProfile([
      design("watercolor koi, vibrant"),
      design("watercolor hummingbird"),
    ]);
    expect(color!.palette).toBe("color");

    // No explicit palette wording → no palette claim.
    const silent = deriveTasteProfile([
      design("japanese dragon sleeve"),
      design("japanese koi half-sleeve"),
    ]);
    expect(silent!.palette).toBeNull();
  });

  it("counts pinned artists with locally-known styles as data points", () => {
    const profile = deriveTasteProfile(
      [design("blackwork raven")],
      [{ styles: ["Blackwork", "Fine Line"] }],
    );
    expect(profile).not.toBeNull();
    expect(profile!.pinCount).toBe(1);
    expect(profile!.dataPoints).toBe(2);
    expect(profile!.topStyles[0]).toEqual({ style: "Blackwork", count: 2 });
    expect(profile!.line).toBe(
      "you keep coming back to blackwork — 2 of 2 saves & pins",
    );
  });

  it("ignores pins whose styles the vocabulary cannot resolve", () => {
    const profile = deriveTasteProfile(
      [design("blackwork raven")],
      [{ styles: ["vibes", "???"] }],
    );
    // The unreadable pin is not a data point, so we stay below the minimum.
    expect(profile).toBeNull();
  });
});

describe("pinnedArtistStyles", () => {
  const matches = [
    {
      artistId: "artist_1",
      artistName: "Nadia Rook",
      styles: ["Blackwork", "Fine Line"],
    },
    { artistId: "artist_2", artistName: "Ivo Marr", styles: ["Watercolor"] },
    { artistId: "artist_3", artistName: "Tags Only", styles: [], tags: ["Realism"] },
  ];

  it("returns styles only for artists actually pinned", () => {
    const favs = [artistSlug("Nadia Rook", "artist_1")];
    expect(pinnedArtistStyles(matches, favs)).toEqual([
      { styles: ["Blackwork", "Fine Line"] },
    ]);
  });

  it("falls back to tags when styles are empty", () => {
    const favs = [artistSlug("Tags Only", "artist_3")];
    expect(pinnedArtistStyles(matches, favs)).toEqual([{ styles: ["Realism"] }]);
  });

  it("returns nothing when either side is empty", () => {
    expect(pinnedArtistStyles([], ["some--artist_1"])).toEqual([]);
    expect(pinnedArtistStyles(matches, [])).toEqual([]);
  });
});

describe("smartMatchUrlForTaste", () => {
  it("carries the top styles as the ?styles= param", () => {
    const profile = deriveTasteProfile([
      design("blackwork raven"),
      design("blackwork moth, fine line details"),
      design("black & grey portrait"),
    ]);
    const url = smartMatchUrlForTaste(profile!);
    expect(url.startsWith("/smart-match?")).toBe(true);
    const params = new URLSearchParams(url.split("?")[1]);
    const styles = params.get("styles")!.split(",");
    expect(styles[0]).toBe("Blackwork");
    expect(styles.length).toBeLessThanOrEqual(3);
    expect(styles).toContain("Fine Line");
  });

  it("URL-encodes style names safely", () => {
    const profile = deriveTasteProfile([
      design("black & grey portrait"),
      design("black and gray skull"),
    ]);
    const url = smartMatchUrlForTaste(profile!);
    // "Black & Grey" must survive a round-trip through the param.
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("styles")!.split(",")).toContain("Black & Grey");
  });
});
