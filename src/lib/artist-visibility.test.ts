import { describe, expect, it } from "vitest";
import {
  LOOKS_BOOKABLE_CLAUSE,
  NOT_STALE_CLAUSE,
  PUBLIC_ARTIST_CLAUSE,
} from "@/lib/artist-visibility";

describe("PUBLIC_ARTIST_CLAUSE", () => {
  it("suppresses removed and confirmed-stale artists without hiding legacy nodes", () => {
    expect(PUBLIC_ARTIST_CLAUSE).toContain("a.removedAt IS NULL");
    expect(PUBLIC_ARTIST_CLAUSE).toContain(NOT_STALE_CLAUSE);
    expect(NOT_STALE_CLAUSE).toContain("coalesce(a.stale, false)");
    expect(PUBLIC_ARTIST_CLAUSE).toContain(LOOKS_BOOKABLE_CLAUSE);
    expect(LOOKS_BOOKABLE_CLAUSE).toContain("coalesce(a.looksBookable, true)");
  });
});
