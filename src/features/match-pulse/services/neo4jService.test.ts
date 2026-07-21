import { describe, expect, it } from "vitest";
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
