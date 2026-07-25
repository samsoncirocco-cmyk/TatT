// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/services/vectorDbService", () => ({
  searchSimilar: vi.fn(async () => []),
}));

vi.mock("@/features/match-pulse/services/neo4jService", () => ({
  findArtistMatchesForPulse: vi.fn(async () => [
    { id: "artist-low-rated", name: "Low Rated", city: "Brooklyn", styles: ["Traditional"], rating: 2 },
    { id: "artist-high-rated", name: "High Rated", city: "Brooklyn", styles: ["Traditional"], rating: 5 },
  ]),
  getArtistsByIds: vi.fn(async () => []),
  isNeo4jEnabled: vi.fn(() => true),
}));

vi.mock("@/features/match-pulse/services/demoMatchService", () => ({
  findMatchingArtistsForDemo: vi.fn(async () => []),
}));

describe("getHybridArtistMatches — rating weight reuse", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  it("scores a higher-rated artist above an otherwise-identical lower-rated one", async () => {
    const { getHybridArtistMatches } = await import("../matchService.js");

    const result = await getHybridArtistMatches({ style: "Traditional" }, { limit: 10 });

    const high = result.matches.find((m) => m.id === "artist-high-rated");
    const low = result.matches.find((m) => m.id === "artist-low-rated");

    expect(high.breakdown.rating).toBeGreaterThan(low.breakdown.rating);
    expect(high.matchScore).toBeGreaterThan(low.matchScore);
  });
});
