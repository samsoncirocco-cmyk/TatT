import BookClient, { type BookArtist, type BookOffer } from "./BookClient";
import { getRosterArtistById } from "@/lib/artists-graph";
import { getArtistAvailability } from "@/lib/availability";
import { availabilityLabel } from "@/lib/booking";
import { getBookingOffer } from "@/lib/booking-offer";
// Server component — safe to read the platform take rate from the shared
// Stripe config (never imported into client components). The money sentence
// on the review step renders from this so the copy can't drift from the rate.
import { PLATFORM_FEE_BPS } from "@/lib/stripe";

// The artist comes from the live graph and availability from Firestore
// on every request — never statically rendered.
export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const artistId = typeof sp.artistId === "string" ? sp.artistId : "";
  // Design-session id threaded from /design → /smart-match → /swipe → here;
  // travels on the booking POST so the artist Brief rides with the record.
  const designSessionId = typeof sp.ds === "string" ? sp.ds : "";

  let artist: BookArtist | null = null;
  let artistLoadFailed = false;

  /**
   * The honest default, and what every artist gets unless a live calendar read
   * says otherwise. If anything below throws we ship this — a booking page that
   * over-promises is worse than one that under-promises (ADR 0027).
   */
  let offer: BookOffer = {
    mode: "request",
    label: "Availability on request",
    detail:
      "Pick the dates that suit you — the artist confirms a time after your request lands.",
    slots: [],
  };

  if (artistId) {
    try {
      const found = await getRosterArtistById(artistId);
      if (found) {
        const availability = await getArtistAvailability(found.id);
        artist = {
          id: found.id,
          slug: found.slug,
          name: found.name,
          location: found.location,
          shopName: found.shopName,
          styles: found.styles,
          availabilityStatus: availability.status,
          availabilityLabel: availabilityLabel(availability.status),
          availabilityNote: availability.note ?? null,
          claimed: found.claimed,
        };

        // Reservation or request, decided per artist from live signals. The
        // server guarantees `slots` is empty unless the mode is "reservation",
        // so the client cannot render a time we are unable to hold.
        const resolved = await getBookingOffer({ artistId: found.id });
        offer = {
          mode: resolved.decision.mode,
          label: resolved.decision.label,
          detail: resolved.decision.detail,
          slots: resolved.slots.map((s) => ({
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
          ...(resolved.timezone ? { timezone: resolved.timezone } : {}),
        };
      }
    } catch {
      // Graph unreachable — be honest about it instead of faking an artist.
      artistLoadFailed = true;
    }
  }

  return (
    <BookClient
      artist={artist}
      requestedArtistId={artistId}
      artistLoadFailed={artistLoadFailed}
      designSessionId={designSessionId}
      offer={offer}
      feePercent={PLATFORM_FEE_BPS / 100}
    />
  );
}
