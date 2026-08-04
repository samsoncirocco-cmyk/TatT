import { describe, expect, it } from "vitest";
import {
  BOOKABLE_TIER_CLAUSE,
  HAS_REACHABLE_CONTACT_CLAUSE,
  HAS_TATTOO_EVIDENCE_CLAUSE,
  bookingTier,
  hasReachableContact,
  hasTattooEvidence,
  isBookable,
} from "@/lib/artist-bookability";

describe("hasTattooEvidence", () => {
  it("accepts hosted portfolio images", () => {
    expect(hasTattooEvidence({ portfolioImages: ["https://x/1.jpg"] })).toBe(true);
  });

  it("accepts Instagram post permalinks", () => {
    expect(
      hasTattooEvidence({ portfolioPermalinks: ["https://instagram.com/p/abc"] }),
    ).toBe(true);
  });

  it("rejects empty arrays and missing fields", () => {
    expect(hasTattooEvidence({})).toBe(false);
    expect(hasTattooEvidence({ portfolioImages: [], portfolioPermalinks: [] })).toBe(
      false,
    );
  });

  it("rejects non-array junk rather than trusting truthiness", () => {
    // A scraped row can carry a string or a stray count here; `if (images)`
    // would call both of those evidence.
    expect(hasTattooEvidence({ portfolioImages: "3" })).toBe(false);
    expect(hasTattooEvidence({ portfolioImages: 3 })).toBe(false);
  });
});

describe("hasReachableContact", () => {
  it("requires a shop website that answered its last probe", () => {
    expect(hasReachableContact({ shopWebsiteLive: true })).toBe(true);
  });

  // The whole point of the gate: unknown is not reachable. If this ever flips
  // to a coalesce-to-true, every unprobed artist starts taking deposits.
  it("treats never-probed as unreachable, not as reachable", () => {
    expect(hasReachableContact({})).toBe(false);
    expect(hasReachableContact({ shopWebsiteLive: undefined })).toBe(false);
    expect(hasReachableContact({ shopWebsiteLive: null })).toBe(false);
  });

  it("treats a failed probe as unreachable", () => {
    expect(hasReachableContact({ shopWebsiteLive: false })).toBe(false);
  });

  it("does not accept a truthy non-boolean", () => {
    expect(hasReachableContact({ shopWebsiteLive: "true" })).toBe(false);
    expect(hasReachableContact({ shopWebsiteLive: 1 })).toBe(false);
  });
});

describe("bookingTier", () => {
  it("is bookable only with both halves", () => {
    expect(
      bookingTier({ portfolioImages: ["https://x/1.jpg"], shopWebsiteLive: true }),
    ).toBe("bookable");
  });

  it("is browse-only with evidence but no reachable contact", () => {
    expect(bookingTier({ portfolioImages: ["https://x/1.jpg"] })).toBe("browse-only");
  });

  it("is browse-only with a reachable contact but no evidence", () => {
    expect(bookingTier({ shopWebsiteLive: true })).toBe("browse-only");
  });

  it("is browse-only with neither", () => {
    expect(bookingTier({})).toBe("browse-only");
  });

  it("isBookable agrees with bookingTier", () => {
    const subject = { portfolioPermalinks: ["p"], shopWebsiteLive: true };
    expect(isBookable(subject)).toBe(bookingTier(subject) === "bookable");
    expect(isBookable({})).toBe(false);
  });
});

describe("Cypher clauses", () => {
  it("composes the tier from both halves", () => {
    expect(BOOKABLE_TIER_CLAUSE).toContain(HAS_TATTOO_EVIDENCE_CLAUSE);
    expect(BOOKABLE_TIER_CLAUSE).toContain(HAS_REACHABLE_CONTACT_CLAUSE);
  });

  // Mirrors the pure predicate above. A `coalesce(sh.websiteLive, true)` here
  // would make every unprobed shop bookable in Cypher while the TypeScript
  // said otherwise — the two halves of the gate disagreeing is worse than
  // either being wrong. `coalesce` on `sh.website` is fine (and required):
  // import can clear the URL while leaving a stale websiteLive=true.
  it("requires websiteLive to be explicitly true and a non-empty website", () => {
    expect(HAS_REACHABLE_CONTACT_CLAUSE).toContain("sh.websiteLive = true");
    expect(HAS_REACHABLE_CONTACT_CLAUSE).toContain(
      "trim(coalesce(sh.website,'')) <> ''",
    );
    expect(HAS_REACHABLE_CONTACT_CLAUSE).not.toContain("coalesce(sh.websiteLive");
  });

  it("does not count a bio as evidence", () => {
    expect(HAS_TATTOO_EVIDENCE_CLAUSE).not.toContain("bio");
  });
});
