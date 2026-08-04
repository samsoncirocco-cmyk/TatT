import { describe, expect, it } from "vitest";
import {
  KNOWN_NON_ARTIST_NAMES,
  LOOKS_BOOKABLE_CLAUSE,
  NOT_KNOWN_NON_ARTIST_CLAUSE,
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

  it("suppresses only the evidence-backed non-artists while the data audit catches up", () => {
    expect(KNOWN_NON_ARTIST_NAMES).toEqual([
      "orangetheory",
      "panerabread",
      "thedrybar",
      "visionworks eyewear",
      "keep up to date with the shop",
      "join the email list",
      "our address:",
      "apprentice",
      "ad tools",
      "htc studios tempe campus",
      "faq's",
      "shea blades and beauty is now",
    ]);
    expect(NOT_KNOWN_NON_ARTIST_CLAUSE).toContain(
      "NOT toLower(trim(coalesce(a.name, ''))) IN",
    );
    expect(PUBLIC_ARTIST_CLAUSE).toContain(NOT_KNOWN_NON_ARTIST_CLAUSE);
  });
});
