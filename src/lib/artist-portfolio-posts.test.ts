import { describe, expect, it } from "vitest";
import { selectOwnedInstagramMedia } from "./artist-portfolio-posts";
import type { InstagramMedia } from "./artist-instagram";

const available: InstagramMedia[] = [
  {
    id: "one",
    permalink: "https://www.instagram.com/p/ONE/",
    mediaType: "IMAGE",
    mediaUrl: null,
    thumbnailUrl: null,
    caption: null,
    timestamp: null,
  },
  {
    id: "two",
    permalink: "https://www.instagram.com/reel/TWO/",
    mediaType: "VIDEO",
    mediaUrl: null,
    thumbnailUrl: null,
    caption: null,
    timestamp: null,
  },
];

describe("selectOwnedInstagramMedia", () => {
  it("preserves artist-selected order and removes duplicates", () => {
    expect(selectOwnedInstagramMedia(available, ["two", "one", "two"])).toMatchObject({
      ok: true,
      selected: [{ id: "two" }, { id: "one" }],
    });
  });

  it("rejects ids not returned for the connected account", () => {
    expect(selectOwnedInstagramMedia(available, ["one", "someone-elses-post"])).toEqual({
      ok: false,
      error: "One or more selected posts are not owned by the connected account.",
    });
  });

  it("allows clearing the selected portfolio", () => {
    expect(selectOwnedInstagramMedia(available, [])).toEqual({ ok: true, selected: [] });
  });
});
