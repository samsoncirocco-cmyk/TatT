/**
 * The homepage featured grid must respect takedown suppression.
 *
 * Before this module the grid was a committed JSON file read straight into the
 * page, so a completed takedown left the person on the most prominent surface
 * of the site. These tests pin the two properties that fix depends on: the gate
 * only ever *removes*, and it removes on failure rather than on success.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CURATED_FEATURED,
  PUBLISHABLE_FEATURED_CYPHER,
  candidateKeys,
  retainPublishable,
  getFeaturedArtists,
  type FeaturedArtist,
} from "@/lib/featured-artists";

const execute = vi.hoisted(() => vi.fn());
vi.mock("@/features/match-pulse/services/neo4jService", () => ({
  executeServerCypherQuery: execute,
}));

function artist(over: Partial<FeaturedArtist> = {}): FeaturedArtist {
  return {
    id: "artist_ging",
    name: "Ging Tattoos",
    city: "Austin",
    state: "TX",
    styles: ["Traditional"],
    instagram: "@tattoosbyging",
    rating: 4.9,
    reviewCount: 500,
    ...over,
  };
}

beforeEach(() => execute.mockReset());
afterEach(() => vi.restoreAllMocks());

describe("candidateKeys", () => {
  it("asks about the instagram handle as well as the id", () => {
    // The crawler mints random ids, so an id-only check would miss a re-crawled
    // artist entirely — the same reason the tombstone leads on the handle.
    expect(candidateKeys(artist()).keys).toEqual([
      "instagram:tattoosbyging",
      "artist:artist_ging",
    ]);
  });

  it("normalizes the handle the same way the executor does", () => {
    expect(candidateKeys(artist({ instagram: "https://instagram.com/Foo/" })).keys).toContain(
      "instagram:foo",
    );
  });
});

describe("retainPublishable", () => {
  it("keeps only vouched-for artists, in curated order", () => {
    const a = artist({ id: "a" });
    const b = artist({ id: "b" });
    const c = artist({ id: "c" });
    expect(retainPublishable([a, b, c], ["c", "a"]).map((x) => x.id)).toEqual(["a", "c"]);
  });

  it("can never add an artist the graph did not vouch for", () => {
    const a = artist({ id: "a" });
    expect(retainPublishable([a], ["a", "someone_else"]).map((x) => x.id)).toEqual(["a"]);
  });

  it("returns nothing when nothing is allowed", () => {
    expect(retainPublishable([artist()], [])).toEqual([]);
  });
});

describe("PUBLISHABLE_FEATURED_CYPHER", () => {
  it("requires removedAt to be null", () => {
    expect(PUBLISHABLE_FEATURED_CYPHER).toContain("a.removedAt IS NULL");
  });

  it("suppresses artists marked stale by repeated confirmed dead refreshes", () => {
    expect(PUBLISHABLE_FEATURED_CYPHER).toContain("coalesce(a.stale, false) = false");
  });

  it("suppresses explicit negative account-quality verdicts", () => {
    expect(PUBLISHABLE_FEATURED_CYPHER).toContain(
      "coalesce(a.looksBookable, true) = true",
    );
  });

  it("excludes anyone carrying a tombstone", () => {
    expect(PUBLISHABLE_FEATURED_CYPHER).toContain("TakedownTombstone");
    expect(PUBLISHABLE_FEATURED_CYPHER).toContain("tombstones = 0");
  });

  it("asks both questions in one query so an error cannot fail open", () => {
    // A second, separate tombstone query would return [] on failure, which
    // reads as "nobody is tombstoned" — the exact fail-open trap ADR 0025 §4
    // exists to avoid. One query means an error can only shrink the result.
    expect(PUBLISHABLE_FEATURED_CYPHER.match(/RETURN/g)).toHaveLength(1);
  });
});

describe("getFeaturedArtists", () => {
  it("drops an artist whose node the graph does not return", async () => {
    const kept = artist({ id: "kept" });
    const removed = artist({ id: "removed" });
    execute.mockResolvedValue([{ id: "kept" }]);

    const result = await getFeaturedArtists([kept, removed]);

    expect(result.map((a) => a.id)).toEqual(["kept"]);
  });

  it("returns every artist the graph vouches for", async () => {
    const a = artist({ id: "a" });
    const b = artist({ id: "b" });
    execute.mockResolvedValue([{ id: "a" }, { id: "b" }]);

    expect((await getFeaturedArtists([a, b])).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("FAILS CLOSED: an unreachable graph empties the grid", async () => {
    // executeServerCypherQuery swallows driver errors and returns []. That must
    // read as "vouch for nobody", not "vouch for everybody".
    execute.mockResolvedValue([]);

    expect(await getFeaturedArtists([artist()])).toEqual([]);
  });

  it("FAILS CLOSED: a malformed row is not treated as an allowed id", async () => {
    execute.mockResolvedValue([{ id: null }, {}, { id: 42 }]);

    expect(await getFeaturedArtists([artist()])).toEqual([]);
  });

  it("passes the tombstone keys the executor writes", async () => {
    execute.mockResolvedValue([]);
    await getFeaturedArtists([artist()]);

    expect(execute).toHaveBeenCalledWith(PUBLISHABLE_FEATURED_CYPHER, {
      candidates: [{ id: "artist_ging", keys: ["instagram:tattoosbyging", "artist:artist_ging"] }],
    });
  });

  it("does not query at all for an empty candidate list", async () => {
    expect(await getFeaturedArtists([])).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("the committed snapshot", () => {
  it("is treated as candidates, not as output", async () => {
    // The regression this whole module exists for: the homepage used to render
    // src/data/featured-artists.json directly, with no filter of any kind.
    execute.mockResolvedValue([]);

    expect(CURATED_FEATURED.length).toBeGreaterThan(0);
    expect(await getFeaturedArtists()).toEqual([]);
  });
});
