import { describe, expect, it } from "vitest";
import {
  ROSTER_PAGE_SIZE,
  buildRosterFilter,
  instagramUrl,
  rosterPageWindow,
} from "./artists-graph";

describe("buildRosterFilter", () => {
  it("nulls out empty filters so the WHERE clause passes everything", () => {
    expect(buildRosterFilter({}).params).toEqual({ q: null, style: null });
    expect(buildRosterFilter({ q: "  ", style: "" }).params).toEqual({
      q: null,
      style: null,
    });
  });

  it("trims and forwards active filters as parameters, never inline", () => {
    const { where, params } = buildRosterFilter({ q: " austin ", style: "Blackwork" });
    expect(params).toEqual({ q: "austin", style: "Blackwork" });
    // Values must reach Cypher only via $params (no string interpolation).
    expect(where).not.toContain("austin");
    expect(where).not.toContain("Blackwork");
    expect(where).toContain("$q");
    expect(where).toContain("$style");
  });

  it("searches name, city, and shop; matches style case-insensitively", () => {
    const { where } = buildRosterFilter({ q: "x" });
    expect(where).toContain("a.name");
    expect(where).toContain("a.city");
    expect(where).toContain("a.shopName");
    expect(where).toContain("toLower(s) = toLower($style)");
  });
});

describe("rosterPageWindow", () => {
  it("defaults to page 1", () => {
    expect(rosterPageWindow(undefined)).toEqual({
      page: 1,
      skip: 0,
      limit: ROSTER_PAGE_SIZE,
    });
  });

  it("computes the skip window from the 1-based page", () => {
    expect(rosterPageWindow("3")).toEqual({
      page: 3,
      skip: 2 * ROSTER_PAGE_SIZE,
      limit: ROSTER_PAGE_SIZE,
    });
  });

  it("clamps junk to page 1 and truncates floats", () => {
    expect(rosterPageWindow("-2").page).toBe(1);
    expect(rosterPageWindow("banana").page).toBe(1);
    expect(rosterPageWindow(["2", "9"]).page).toBe(1);
    expect(rosterPageWindow("2.9").page).toBe(2);
  });
});

describe("instagramUrl", () => {
  it("normalizes handles, urls, and trailing paths", () => {
    expect(instagramUrl("@ink.by.sam")).toBe("https://instagram.com/ink.by.sam");
    expect(instagramUrl("https://www.instagram.com/ink.by.sam/reels")).toBe(
      "https://instagram.com/ink.by.sam",
    );
    expect(instagramUrl("")).toBeNull();
    expect(instagramUrl(null)).toBeNull();
  });
});
