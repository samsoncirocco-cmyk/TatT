import { describe, it, expect } from "vitest";
import { deriveReasonChips, MAX_REASON_CHIPS } from "../matchReasonChips";

describe("deriveReasonChips — style", () => {
    it("credits the user's own pick when it overlaps the artist's styles", () => {
        const chips = deriveReasonChips(
            { styles: ["Blackwork", "Minimalist"] },
            { styles: ["Blackwork"] }
        );
        expect(chips).toEqual(["Blackwork — your pick"]);
    });

    it("matches graph spelling variants (Japanese vs Japanese (Irezumi))", () => {
        const chips = deriveReasonChips(
            { styles: ["Japanese (Irezumi)"] },
            { styles: ["Japanese"] }
        );
        expect(chips).toEqual(["Japanese — your pick"]);
    });

    it("falls back to the graph-declared specialty when the user picked nothing", () => {
        const chips = deriveReasonChips({ styles: ["Neo-Traditional"] }, {});
        expect(chips).toEqual(["Neo-Traditional specialist"]);
    });

    it("does not confuse Traditional with Neo-Traditional", () => {
        const chips = deriveReasonChips(
            { styles: ["Neo-Traditional"] },
            { styles: ["Traditional"] }
        );
        expect(chips).toEqual([]);
    });

    it("does not sell an unrelated specialty when the user's pick did not match", () => {
        const chips = deriveReasonChips(
            { styles: ["Blackwork"] },
            { styles: ["Fine Line"] }
        );
        expect(chips).toEqual([]);
    });
});

describe("deriveReasonChips — location", () => {
    it("adds a near-you chip only when the user gave a location that matches", () => {
        const chips = deriveReasonChips(
            { styles: ["Blackwork"], city: "Austin", location: "Austin, TX" },
            { styles: ["Blackwork"], location: "austin" }
        );
        expect(chips).toContain("Austin — near you");
    });

    it("never claims near-you without a user location signal", () => {
        const chips = deriveReasonChips(
            { styles: ["Blackwork"], city: "Austin", location: "Austin, TX" },
            { styles: ["Blackwork"] }
        );
        expect(chips.some((c) => c.includes("near you"))).toBe(false);
    });

    it("never claims near-you when the artist is somewhere else", () => {
        const chips = deriveReasonChips(
            { styles: ["Blackwork"], city: "Portland", location: "Portland, OR" },
            { styles: ["Blackwork"], location: "Austin" }
        );
        expect(chips.some((c) => c.includes("near you"))).toBe(false);
    });

    it("does not treat a short substring as a location match", () => {
        const chips = deriveReasonChips(
            { city: "Philadelphia", location: "Philadelphia, PA" },
            { location: "LA" }
        );
        expect(chips).toEqual([]);
    });

    it("matches a normalized full city and state", () => {
        const chips = deriveReasonChips(
            { city: "Austin", location: "Austin, TX" },
            { location: "Austin TX" }
        );
        expect(chips).toContain("Austin — near you");
    });
});

describe("deriveReasonChips — rating", () => {
    it("labels a strong rating and review count as shop-level", () => {
        const chips = deriveReasonChips({ rating: 4.8, reviewCount: 210 }, {});
        expect(chips).toEqual(["Shop 4.8★, 210 reviews"]);
    });

    it("drops the review count when it is too thin to mean anything", () => {
        const chips = deriveReasonChips({ rating: 4.9, reviewCount: 3 }, {});
        expect(chips).toEqual(["Shop rated 4.9★"]);
    });

    it("does not dress up a middling rating as a reason", () => {
        const chips = deriveReasonChips({ rating: 3.9, reviewCount: 500 }, {});
        expect(chips).toEqual([]);
    });
});

describe("deriveReasonChips — portfolio depth", () => {
    it("counts real portfolio URLs from the payload", () => {
        const portfolio = Array.from({ length: 37 }, (_, i) => `https://img/${i}.jpg`);
        expect(deriveReasonChips({ portfolio }, {})).toEqual(["37 pieces shown"]);
    });

    it("skips the chip below the depth threshold rather than inflating", () => {
        const portfolio = ["https://img/1.jpg", "https://img/2.jpg"];
        expect(deriveReasonChips({ portfolio }, {})).toEqual([]);
    });

    it("does not count non-URL placeholders as portfolio pieces", () => {
        const portfolio = Array.from({ length: 37 }, (_, i) => `piece-${i}`);
        expect(deriveReasonChips({ portfolio }, {})).toEqual([]);
    });
});

describe("deriveReasonChips — honesty guarantees", () => {
    it("fabricates nothing from an empty payload", () => {
        expect(deriveReasonChips({}, { styles: ["Blackwork"], location: "Austin" })).toEqual([]);
        expect(deriveReasonChips({}, {})).toEqual([]);
    });

    it("a style-only payload yields exactly one chip", () => {
        const chips = deriveReasonChips(
            { styles: ["Blackwork"] },
            { styles: ["Blackwork"], location: "Austin" }
        );
        expect(chips).toEqual(["Blackwork — your pick"]);
    });

    it("caps at three chips in priority order", () => {
        const chips = deriveReasonChips(
            {
                styles: ["Blackwork"],
                city: "Austin",
                location: "Austin, TX",
                rating: 4.8,
                reviewCount: 120,
                portfolio: Array.from({ length: 40 }, (_, i) => `https://img/${i}.jpg`),
            },
            { styles: ["Blackwork"], location: "Austin" }
        );
        expect(chips).toHaveLength(MAX_REASON_CHIPS);
        expect(chips).toEqual([
            "Blackwork — your pick",
            "Austin — near you",
            "Shop 4.8★, 120 reviews",
        ]);
    });

    it("every chip stays at four words or fewer", () => {
        const chips = deriveReasonChips(
            {
                styles: ["Neo-Traditional"],
                city: "San Francisco",
                location: "San Francisco, CA",
                rating: 4.9,
                reviewCount: 87,
                portfolio: Array.from({ length: 12 }, (_, i) => `https://img/${i}.jpg`),
            },
            { styles: ["Neo-Traditional"], location: "San Francisco" }
        );
        expect(chips.length).toBeGreaterThan(0);
        for (const chip of chips) {
            // The em dash is a separator, not a word.
            const words = chip.split(/\s+/).filter((w) => w !== "—").length;
            expect(words).toBeLessThanOrEqual(4);
        }
    });
});
