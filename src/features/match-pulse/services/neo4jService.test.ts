import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildHasPortfolioClause, buildNotRemovedClause } from "./neo4jService";

// Matching is the widest artist read surface in the app, and unlike the roster
// it has no shared WHERE builder — each query site was written separately. A
// taken-down artist that still surfaces in match results has not been taken
// down. See docs/adr/0024.
describe("buildNotRemovedClause", () => {
  it("gates on removedAt", () => {
    expect(buildNotRemovedClause()).toBe("a.removedAt IS NULL");
  });

  it("is applied at every :Artist read site in the module", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/features/match-pulse/services/neo4jService.ts"),
      "utf8",
    );
    const lines = source.split("\n");

    // Every read binding an artist as `a` must interpolate the guard within the
    // query that follows. Checked per site rather than by counting, so a query
    // added later without the guard names itself here instead of silently
    // leaking a removed artist into match results.
    const siteLines: number[] = [];
    lines.forEach((line, i) => {
      if (/MATCH \(a:Artist[\s)]/.test(line)) siteLines.push(i);
    });

    const unguarded: string[] = [];
    siteLines.forEach((start, n) => {
      // Each site's query ends where the next one begins — otherwise the
      // embedding_id writer's SET leaks backwards and wrongly exempts the
      // query above it (which is exactly how this test first passed while
      // findArtistsByEmbeddingIds was unguarded).
      const end = siteLines[n + 1] ?? lines.length;
      const query = lines.slice(start, end).join("\n");

      // The one legitimate exception: a writer stamping embedding_id onto a
      // node by id. It returns nothing to a caller.
      if (/SET a\.embedding_id/.test(query)) return;
      if (!query.includes("${NOT_REMOVED}")) {
        unguarded.push(`line ${start + 1}: ${lines[start].trim()}`);
      }
    });

    expect(siteLines.length).toBeGreaterThan(3);
    expect(unguarded).toEqual([]);
  });
});

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
