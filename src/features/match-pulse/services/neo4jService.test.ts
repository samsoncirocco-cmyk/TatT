import { afterEach, describe, expect, it, vi } from "vitest";
import { buildHasPortfolioClause } from "./neo4jService";

describe("buildHasPortfolioClause", () => {
  it("gates on the real hosted portfolioImages array, never the stale count", () => {
    const clause = buildHasPortfolioClause();
    expect(clause).toContain("a.portfolioImages IS NOT NULL");
    expect(clause).toContain("size(a.portfolioImages) > 0");
    expect(clause).not.toContain("portfolioImageCount");
  });

  it("still allows legacy demo-data Tattoo-node portfolios through", () => {
    expect(buildHasPortfolioClause()).toContain("size(portfolio) > 0");
  });
});

describe("findMatchingArtists (demo mode)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("never pads a narrow filter back out to the full mock roster", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    process.env.NEXT_PUBLIC_NEO4J_ENABLED = "false";

    const { findMatchingArtists } = await import("./neo4jService");

    // A style/location combo no mock artist satisfies must come back thin
    // (or empty) — never silently swapped for the entire mock roster.
    const results = await findMatchingArtists({
      styles: ["Definitely Not A Real Style"],
    });

    expect(results.length).toBe(0);
  });
});
