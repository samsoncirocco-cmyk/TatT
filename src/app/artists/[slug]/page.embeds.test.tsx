// @vitest-environment jsdom
//
// Profile-page integration for the Instagram embed tier (TAT-40).
//
// The surface budget is the contract under test: full Instagram embeds render
// on /artists/[slug] and NOWHERE else, only for unclaimed artists, and only
// while ENABLE_IG_EMBEDS=true — so shipping this code changes nothing until
// that flag is deliberately flipped. The page renders whatever permalinks the
// server-side policy (filterPermalinksForDisplay) lets through; these tests
// exercise the page against the real policy via a mocked graph read.
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const { mockedQuery } = vi.hoisted(() => ({
  mockedQuery: vi.fn(async (): Promise<Record<string, unknown>[]> => []),
}));
vi.mock("@/features/match-pulse/services/neo4jService", () => ({
  executeServerCypherQuery: mockedQuery,
}));

import ArtistProfilePage from "./page";

const PERMALINKS = [
  "https://www.instagram.com/p/Post1/",
  "https://www.instagram.com/p/Post2/",
  "https://www.instagram.com/p/Post3/",
  "https://www.instagram.com/p/Post4/",
  "https://www.instagram.com/p/Post5/",
  "https://www.instagram.com/p/Post6/",
];

function graphRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "artist_1",
    name: "Sam Ink",
    shopName: "Ink Shop",
    city: "Austin",
    state: "TX",
    styles: ["Blackwork"],
    instagram: "@sam.ink",
    rating: 4.9,
    reviewCount: 120,
    portfolioImages: [],
    portfolioPermalinks: PERMALINKS,
    claimedByUid: null,
    ...overrides,
  };
}

async function renderProfile(row: Record<string, unknown>) {
  mockedQuery.mockResolvedValue([row]);
  const jsx = await ArtistProfilePage({
    params: Promise.resolve({ slug: "sam-ink-artist_1" }),
  });
  return render(jsx);
}

afterEach(() => {
  mockedQuery.mockReset();
  vi.unstubAllEnvs();
});

describe("artist profile — Instagram embed tier (TAT-40)", () => {
  it("default (ENABLE_IG_EMBEDS unset): no embed section, page unchanged", async () => {
    const { container } = await renderProfile(graphRow());
    expect(
      container.querySelector('[data-testid="instagram-embed"]'),
    ).toBeNull();
    expect(container.querySelector("blockquote.instagram-media")).toBeNull();
    expect(container.textContent).toContain(
      "No portfolio work is shown here yet.",
    );
    expect(container.textContent).not.toContain("The work shown here");
  });

  it("flag on, unclaimed artist: renders official embeds, capped at a handful", async () => {
    vi.stubEnv("ENABLE_IG_EMBEDS", "true");
    const { container } = await renderProfile(graphRow());
    const blockquotes = container.querySelectorAll(
      "blockquote.instagram-media",
    );
    const featured = container.querySelector(
      '[data-testid="instagram-embed-featured"]',
    );
    // 6 permalinks in the graph, but the profile mounts at most 4.
    expect(blockquotes).toHaveLength(4);
    expect(blockquotes[0].getAttribute("data-instgrm-permalink")).toBe(
      PERMALINKS[0],
    );
    expect(
      featured?.querySelectorAll("blockquote.instagram-media"),
    ).toHaveLength(1);
    const normalizedText = container.textContent?.replace(/\s+/g, " ");
    expect(normalizedText).toContain("Featured work · via Instagram");
    expect(normalizedText).toContain("More recent work · via Instagram");
    expect(
      container.querySelector('[data-testid="artist-monogram"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="artist-no-work"]'),
    ).toBeNull();
    expect(container.textContent).toContain(
      "The work shown here is credited to Sam Ink",
    );
    // Embed markup only — no scraped media: every <img> on the page would be
    // a hosted copy, and this artist has none to show.
    expect(container.querySelector("img")).toBeNull();
  });

  it("flag on, claimed artist: hosted licensed images, no embeds", async () => {
    vi.stubEnv("ENABLE_IG_EMBEDS", "true");
    const hosted =
      "https://storage.googleapis.com/tatt-pro-assets/artists/artist_1/0.jpg";
    const { container } = await renderProfile(
      graphRow({ claimedByUid: "uid_9", portfolioImages: [hosted] }),
    );
    expect(container.querySelector("blockquote.instagram-media")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe(hosted);
    expect(
      container.querySelector('[data-testid="instagram-embed-featured"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="artist-monogram"]'),
    ).toBeNull();
  });

  it("kill switch off + embeds on: unclaimed profile shows embeds and zero hosted images", async () => {
    vi.stubEnv("SHOW_UNCLAIMED_PORTFOLIOS", "false");
    vi.stubEnv("ENABLE_IG_EMBEDS", "true");
    const { container } = await renderProfile(
      graphRow({
        portfolioImages: [
          "https://storage.googleapis.com/tatt-pro-assets/artists/artist_1/0.jpg",
        ],
      }),
    );
    expect(
      container.querySelectorAll("blockquote.instagram-media"),
    ).toHaveLength(4);
    expect(container.querySelector("img")).toBeNull();
  });

  it("kill switch off + embeds off (or no permalinks): a compact monogram + no-work state", async () => {
    vi.stubEnv("SHOW_UNCLAIMED_PORTFOLIOS", "false");
    const { container, unmount } = await renderProfile(
      graphRow({
        portfolioImages: [
          "https://storage.googleapis.com/tatt-pro-assets/artists/artist_1/0.jpg",
        ],
      }),
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("blockquote.instagram-media")).toBeNull();
    expect(
      container.querySelector('[data-testid="artist-no-work"]'),
    ).not.toBeNull();
    const monogram = container.querySelector('[data-testid="artist-monogram"]');
    expect(monogram?.textContent).toBe("SI");
    expect(monogram?.className).toContain("h-12");
    unmount();

    // Same result when embeds are on but the backfill hasn't reached this
    // artist: missing permalinks degrade to the stub, not an error.
    vi.stubEnv("ENABLE_IG_EMBEDS", "true");
    const second = await renderProfile(
      graphRow({ portfolioPermalinks: undefined }),
    );
    expect(
      second.container.querySelector("blockquote.instagram-media"),
    ).toBeNull();
    expect(
      second.container.querySelector('[data-testid="artist-no-work"]'),
    ).not.toBeNull();
    expect(
      second.container.querySelector('[data-testid="artist-monogram"]')
        ?.textContent,
    ).toBe("SI");
  });
});
