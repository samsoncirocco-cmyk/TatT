import { describe, expect, it } from "vitest";
import type { TattDesign } from "@/lib/tattStorage";
import { getDesignJourney } from "./designJourney";

const baseDesign: TattDesign = {
  id: "cut-1",
  prompt: "fine line moth",
  createdAt: 1,
  color: "bg-pink",
};

describe("getDesignJourney", () => {
  it("resumes unfinished ideas with the original prompt", () => {
    const journey = getDesignJourney(baseDesign);

    expect(journey.status).toBe("Idea saved");
    expect(journey.nextHref).toBe("/design?prompt=fine%20line%20moth");
    expect(journey.steps.map((step) => step.state)).toEqual([
      "recommended",
      "later",
      "later",
      "later",
    ]);
  });

  it("sends finished cuts to placement with session context intact", () => {
    const journey = getDesignJourney({
      ...baseDesign,
      image: "https://cdn.example.com/cut.png",
      sessionId: "session/7",
    });

    expect(journey.status).toBe("Ready for placement");
    expect(journey.nextHref).toBe("/visualize?design=cut-1&ds=session%2F7");
    expect(journey.steps[0].state).toBe("available");
    expect(journey.steps[1].state).toBe("recommended");
  });

  it("recognizes a booking only when it references this design", () => {
    const journey = getDesignJourney(
      { ...baseDesign, image: "https://cdn.example.com/cut.png" },
      [
        {
          id: "booking-1",
          designId: "cut-1",
          date: "2026-08-01",
          createdAt: 2,
        },
      ],
    );

    expect(journey.status).toBe("Booking started");
    expect(journey.nextHref).toBe("/bookings");
    expect(journey.steps[1].state).toBe("available");
    expect(journey.steps.at(-1)?.state).toBe("recommended");
  });
});
