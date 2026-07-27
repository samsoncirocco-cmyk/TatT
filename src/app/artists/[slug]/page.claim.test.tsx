// @vitest-environment jsdom
//
// The claim entry point on the public profile (TAT-16).
//
// An artist who finds their scraped profile must be able to reach
// /claim/[artistId] from it in one click — that link IS the self-serve half of
// the dual-entry claim flow (docs/adr/0008). But once a profile has an owner,
// offering "Claim this profile" is a dead end: the claim routes 403 anyone who
// isn't the claimant. So the door renders only while the profile is unclaimed.
// The takedown door (docs/adr/0025) stays either way — that flow does its own
// verification.
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const { mockedQuery } = vi.hoisted(() => ({
  mockedQuery: vi.fn(async () => [] as any[]),
}));
vi.mock("@/features/match-pulse/services/neo4jService", () => ({
  executeServerCypherQuery: mockedQuery,
}));

import ArtistProfilePage from "./page";

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
    portfolioPermalinks: [],
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
});

describe("profile claim entry point (TAT-16)", () => {
  it("unclaimed: links the artist straight into /claim/[artistId]", async () => {
    const { getByRole } = await renderProfile(graphRow());
    const link = getByRole("link", { name: /claim this profile/i });
    expect(link.getAttribute("href")).toBe("/claim/artist_1");
  });

  it("claimed: the claim door is gone — the profile already has an owner", async () => {
    const { queryByRole } = await renderProfile(graphRow({ claimedByUid: "uid_9" }));
    expect(queryByRole("link", { name: /claim this profile/i })).toBeNull();
  });

  it("the takedown door stays one click away in both states", async () => {
    const unclaimed = await renderProfile(graphRow());
    expect(
      unclaimed.getByRole("link", { name: /have it removed/i }).getAttribute("href"),
    ).toBe("/takedown/artist_1");
    unclaimed.unmount();
    mockedQuery.mockReset();

    const claimed = await renderProfile(graphRow({ claimedByUid: "uid_9" }));
    expect(
      claimed.getByRole("link", { name: /have it removed/i }).getAttribute("href"),
    ).toBe("/takedown/artist_1");
  });
});
