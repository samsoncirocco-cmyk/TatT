import type { TattBooking, TattDesign } from "@/lib/tattStorage";

export type DesignJourneyStep = {
  label: string;
  state: "available" | "recommended" | "later";
};

export type DesignJourney = {
  status: string;
  note: string;
  nextLabel: string;
  nextHref: string;
  steps: DesignJourneyStep[];
};

function placementHref(design: TattDesign): string {
  return `/visualize?${new URLSearchParams({
    design: design.id,
    ...(design.sessionId ? { ds: design.sessionId } : {}),
  }).toString()}`;
}

/**
 * A deliberately non-progressive recommendation model. Placement and matching
 * do not persist milestones yet, so this describes useful doors—not a fake
 * completion tracker. Only the saved cut and booking connection affect which
 * door is recommended next.
 */
export function getDesignJourney(
  design: TattDesign,
  bookings: TattBooking[] = [],
): DesignJourney {
  const booking = bookings.find((candidate) => candidate.designId === design.id);

  if (booking) {
    return {
      status: "Booking started",
      note: "This design is connected to a booking request. Check its status before making plans.",
      nextLabel: "Check booking status",
      nextHref: "/bookings",
      steps: [
        { label: "Design", state: "available" },
        { label: "Placement", state: "available" },
        {
          label: "Artist",
          state: booking.artistSlug || booking.artistName ? "available" : "later",
        },
        { label: "Booking", state: "recommended" },
      ],
    };
  }

  if (design.image) {
    return {
      status: "Ready for placement",
      note: "The cut is saved. See how it sits before choosing an artist.",
      nextLabel: "See it on your skin",
      nextHref: placementHref(design),
      steps: [
        { label: "Design", state: "available" },
        { label: "Placement", state: "recommended" },
        { label: "Artist", state: "later" },
        { label: "Booking", state: "later" },
      ],
    };
  }

  return {
    status: "Idea saved",
    note: "Pick up the idea and turn it into a finished cut.",
    nextLabel: "Continue refining",
    nextHref: `/design?prompt=${encodeURIComponent(design.prompt)}`,
    steps: [
      { label: "Design", state: "recommended" },
      { label: "Placement", state: "later" },
      { label: "Artist", state: "later" },
      { label: "Booking", state: "later" },
    ],
  };
}

export function deriveDesignTitle(design: TattDesign): string {
  if (design.title) return design.title;
  const words = design.prompt.split(/[\s,]+/).filter(Boolean).slice(0, 3);
  return words.length ? words.join(" ") : "Untitled cut";
}
