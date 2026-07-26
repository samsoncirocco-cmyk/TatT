// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/services/vectorDbService", () => ({
  searchSimilar: vi.fn(async () => []),
}));

vi.mock("@/services/embeddingService", () => ({
  generateQueryEmbedding: vi.fn(async () => new Array(768).fill(0.1)),
}));

vi.mock("@/features/match-pulse/services/neo4jService", () => ({
  findMatchingArtists: vi.fn(async () => [
    { id: "artist-low-rated", name: "Low Rated", city: "Brooklyn", styles: ["Traditional"], rating: 2 },
    { id: "artist-high-rated", name: "High Rated", city: "Brooklyn", styles: ["Traditional"], rating: 5 },
    { id: "artist-unrated", name: "Unrated", city: "Brooklyn", styles: ["Traditional"] },
  ]),
  findArtistsByEmbeddingIds: vi.fn(async () => []),
  isNeo4jEnabled: vi.fn(() => true),
}));

describe("findMatchingArtists — rating signal", () => {
  beforeEach(() => {
    vi.resetModules();
    // Neutralize the randomVariety signal so ranking order is deterministic —
    // this test is about the rating weight, not the random-variety weight.
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ranks a higher-rated artist above an otherwise-identical lower-rated one", async () => {
    const { findMatchingArtists } = await import("../hybridMatchService");

    const result = await findMatchingArtists("traditional", { styles: ["Traditional"] }, 10);

    const highIndex = result.matches.findIndex((m) => m.id === "artist-high-rated");
    const lowIndex = result.matches.findIndex((m) => m.id === "artist-low-rated");
    const unratedIndex = result.matches.findIndex((m) => m.id === "artist-unrated");

    expect(highIndex).toBeGreaterThanOrEqual(0);
    expect(lowIndex).toBeGreaterThanOrEqual(0);
    expect(highIndex).toBeLessThan(lowIndex);

    // An unrated artist scores neutrally (0.5) — between low and high rated,
    // never penalized just for lacking a published rating.
    expect(unratedIndex).toBeGreaterThan(highIndex);
    expect(unratedIndex).toBeLessThan(lowIndex);
  });
});
